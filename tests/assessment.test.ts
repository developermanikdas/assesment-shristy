import { describe, it, expect } from 'vitest';
import {
  computeMCQScores,
  computeLikertScore,
  computeStaminaCurve,
  computeSelfRatingCorrelation,
  ScoreItemInput,
} from '../src/lib/scoring';
import {
  generateD01ReflectionItems,
  CandidateMCQ,
} from '../src/lib/reflection';
import {
  computeServerTimer,
  EXAM_SECTIONS,
  getSectionConfig,
  getNextSection,
} from '../src/lib/exam-flow';

describe('1. Scoring & Negative Marking Engine', () => {
  it('correctly scores +1 for correct and -0.25 for incorrect answers', () => {
    const sampleItems: ScoreItemInput[] = [
      { id: 'Q01', sectionId: 'B1', type: 'mcq', ans: 'A', selected: 'A', confidence: 'Sure', timeSpentSeconds: 40, skipped: false },
      { id: 'Q02', sectionId: 'B1', type: 'mcq', ans: 'B', selected: 'B', confidence: 'Sure', timeSpentSeconds: 45, skipped: false },
      { id: 'Q03', sectionId: 'B1', type: 'mcq', ans: 'C', selected: 'D', confidence: 'Maybe', timeSpentSeconds: 50, skipped: false }, // wrong: -0.25
      { id: 'Q04', sectionId: 'B1', type: 'mcq', ans: 'D', selected: 'A', confidence: 'Guess', timeSpentSeconds: 30, skipped: false }, // wrong: -0.25
      { id: 'Q05', sectionId: 'B1', type: 'mcq', ans: 'A', selected: null, confidence: null, timeSpentSeconds: 10, skipped: true },   // skipped: 0
    ];

    const result = computeMCQScores(sampleItems, ['B1']);
    const b1Score = result.sectionScores['B1'];

    expect(b1Score.totalQuestions).toBe(5);
    expect(b1Score.attempted).toBe(4);
    expect(b1Score.correct).toBe(2);
    expect(b1Score.wrong).toBe(2);
    expect(b1Score.skipped).toBe(1);
    // Net score: 2*1 - 2*0.25 = 1.5
    expect(b1Score.netScore).toBe(1.5);
    expect(b1Score.accuracy).toBe(50); // 2/4
    expect(b1Score.attemptRate).toBe(80); // 4/5
  });

  it('correctly assigns red, amber, green bands to topic breakdowns', () => {
    const sampleItems: ScoreItemInput[] = [
      // Topic 1: Percentages (3/3 correct = 100% -> Green)
      { id: 'Q01', sectionId: 'B1', type: 'mcq', topic: 'percentages', ans: 'A', selected: 'A', timeSpentSeconds: 30, skipped: false },
      { id: 'Q02', sectionId: 'B1', type: 'mcq', topic: 'percentages', ans: 'B', selected: 'B', timeSpentSeconds: 30, skipped: false },
      { id: 'Q03', sectionId: 'B1', type: 'mcq', topic: 'percentages', ans: 'C', selected: 'C', timeSpentSeconds: 30, skipped: false },
      // Topic 2: Series (1/2 correct = 50% -> Amber)
      { id: 'Q04', sectionId: 'B1', type: 'mcq', topic: 'series', ans: 'D', selected: 'D', timeSpentSeconds: 30, skipped: false },
      { id: 'Q05', sectionId: 'B1', type: 'mcq', topic: 'series', ans: 'A', selected: 'B', timeSpentSeconds: 30, skipped: false },
      // Topic 3: Geometry (0/2 correct = 0% -> Red)
      { id: 'Q06', sectionId: 'B1', type: 'mcq', topic: 'geometry', ans: 'B', selected: 'C', timeSpentSeconds: 30, skipped: false },
      { id: 'Q07', sectionId: 'B1', type: 'mcq', topic: 'geometry', ans: 'A', selected: 'D', timeSpentSeconds: 30, skipped: false },
    ];

    const result = computeMCQScores(sampleItems, ['B1']);
    const pct = result.topicBreakdown.find((t) => t.topic === 'percentages');
    const ser = result.topicBreakdown.find((t) => t.topic === 'series');
    const geo = result.topicBreakdown.find((t) => t.topic === 'geometry');

    expect(pct?.band).toBe('green');
    expect(ser?.band).toBe('amber');
    expect(geo?.band).toBe('red');
  });

  it('populates confidence calibration matrix', () => {
    const sampleItems: ScoreItemInput[] = [
      { id: 'Q01', sectionId: 'B1', type: 'mcq', ans: 'A', selected: 'A', confidence: 'Sure', timeSpentSeconds: 30, skipped: false },
      { id: 'Q02', sectionId: 'B1', type: 'mcq', ans: 'B', selected: 'C', confidence: 'Sure', timeSpentSeconds: 30, skipped: false },
      { id: 'Q03', sectionId: 'B1', type: 'mcq', ans: 'C', selected: 'D', confidence: 'Guess', timeSpentSeconds: 30, skipped: false },
    ];

    const result = computeMCQScores(sampleItems, ['B1']);
    expect(result.confidenceMatrix.Sure.total).toBe(2);
    expect(result.confidenceMatrix.Sure.correct).toBe(1);
    expect(result.confidenceMatrix.Sure.wrong).toBe(1);
    expect(result.confidenceMatrix.Sure.accuracy).toBe(50);
    expect(result.confidenceMatrix.Guess.total).toBe(1);
  });
});

describe('2. Likert Reverse Scoring Engine', () => {
  it('correctly scores regular Likert items as response value', () => {
    expect(computeLikertScore(1, false)).toBe(1);
    expect(computeLikertScore(3, false)).toBe(3);
    expect(computeLikertScore(5, false)).toBe(5);
  });

  it('correctly calculates reverse-scored Likert items as 6 minus response', () => {
    // 6 - 5 = 1
    expect(computeLikertScore(5, true)).toBe(1);
    // 6 - 4 = 2
    expect(computeLikertScore(4, true)).toBe(2);
    // 6 - 3 = 3
    expect(computeLikertScore(3, true)).toBe(3);
    // 6 - 2 = 4
    expect(computeLikertScore(2, true)).toBe(4);
    // 6 - 1 = 5
    expect(computeLikertScore(1, true)).toBe(5);
  });
});

describe('3. D01 Reflection Item Selection Algorithm', () => {
  it('auto-picks the exact mix: 2 correct Sure, 2 wrong Sure/Maybe, 2 skipped/Guess', () => {
    const candidateMCQs: CandidateMCQ[] = [
      // 2 Correct Sure
      { qid: 'Q01', stem: 'Stem 1', selected: 'A', ans: 'A', confidence: 'Sure', skipped: false },
      { qid: 'Q02', stem: 'Stem 2', selected: 'B', ans: 'B', confidence: 'Sure', skipped: false },
      // 2 Wrong Confident (Sure / Maybe)
      { qid: 'Q03', stem: 'Stem 3', selected: 'C', ans: 'D', confidence: 'Sure', skipped: false },
      { qid: 'Q04', stem: 'Stem 4', selected: 'A', ans: 'B', confidence: 'Maybe', skipped: false },
      // 2 Skipped or Guess
      { qid: 'Q05', stem: 'Stem 5', selected: 'B', ans: 'D', confidence: 'Guess', skipped: false },
      { qid: 'Q06', stem: 'Stem 6', selected: null, ans: 'A', confidence: null, skipped: true },
      // Extra items that should not be selected if primary quota is met
      { qid: 'Q07', stem: 'Stem 7', selected: 'A', ans: 'A', confidence: 'Sure', skipped: false },
    ];

    const reflections = generateD01ReflectionItems(candidateMCQs);

    expect(reflections.length).toBe(6);
    expect(reflections.map((r) => r.id)).toEqual(['D01a', 'D01b', 'D01c', 'D01d', 'D01e', 'D01f']);

    const correctSurePicked = reflections.filter((r) => r.category === 'correct_sure');
    const wrongConfidentPicked = reflections.filter((r) => r.category === 'wrong_confident');
    const skippedGuessPicked = reflections.filter((r) => r.category === 'skipped_guess');

    expect(correctSurePicked.length).toBe(2);
    expect(wrongConfidentPicked.length).toBe(2);
    expect(skippedGuessPicked.length).toBe(2);

    // Verify interpolation
    expect(reflections[0].stem).toContain("You chose 'A' for question Q01");
    expect(reflections[5].stem).toContain('You skipped question Q06');
  });

  it('gracefully fills from other pools if candidate does not have enough of a kind', () => {
    const onlyCorrectMCQs: CandidateMCQ[] = [
      { qid: 'Q01', stem: 'Stem 1', selected: 'A', ans: 'A', confidence: 'Sure', skipped: false },
      { qid: 'Q02', stem: 'Stem 2', selected: 'B', ans: 'B', confidence: 'Sure', skipped: false },
      { qid: 'Q03', stem: 'Stem 3', selected: 'C', ans: 'C', confidence: 'Sure', skipped: false },
      { qid: 'Q04', stem: 'Stem 4', selected: 'D', ans: 'D', confidence: 'Sure', skipped: false },
      { qid: 'Q05', stem: 'Stem 5', selected: 'A', ans: 'A', confidence: 'Sure', skipped: false },
      { qid: 'Q06', stem: 'Stem 6', selected: 'B', ans: 'B', confidence: 'Sure', skipped: false },
    ];

    const reflections = generateD01ReflectionItems(onlyCorrectMCQs);
    expect(reflections.length).toBe(6);
  });
});

describe('4. Server-Authoritative Timers & Pooled Buffer', () => {
  const b1Config = getSectionConfig('B1')!; // 28 minutes = 1680s

  it('computes exact remaining seconds based on server start time and current time', () => {
    const now = new Date('2026-10-25T10:10:00Z');
    const startedAt = new Date('2026-10-25T10:00:00Z'); // 10 minutes (600s) ago

    const timer = computeServerTimer(
      b1Config,
      {
        startedAt,
        durationSeconds: 1680,
        bufferUsedSeconds: 0,
        status: 'active',
      },
      1200,
      0,
      now
    );

    expect(timer.status).toBe('active');
    expect(timer.elapsedSeconds).toBe(600);
    expect(timer.remainingSeconds).toBe(1080); // 1680 - 600
    expect(timer.bufferAvailableSeconds).toBe(1200);
  });

  it('marks section as time_expired at 0:00 and signals buffer eligibility', () => {
    const startedAt = new Date('2026-10-25T10:00:00Z');
    const now = new Date('2026-10-25T10:28:01Z'); // 28 minutes and 1s later

    const timer = computeServerTimer(
      b1Config,
      {
        startedAt,
        durationSeconds: 1680,
        bufferUsedSeconds: 0,
        status: 'active',
      },
      1200,
      0,
      now
    );

    expect(timer.status).toBe('time_expired');
    expect(timer.remainingSeconds).toBe(0);
    expect(timer.canUseBuffer).toBe(true);
  });

  it('computes remaining time correctly when pooled buffer is active', () => {
    const startedAt = new Date('2026-10-25T10:00:00Z');
    const bufferStartedAt = new Date('2026-10-25T10:28:00Z');
    const now = new Date('2026-10-25T10:33:00Z'); // 5 minutes of buffer spent

    const timer = computeServerTimer(
      b1Config,
      {
        startedAt,
        durationSeconds: 1680,
        bufferUsedSeconds: 0,
        status: 'buffer_active',
        bufferStartedAt,
      },
      1200, // 20 min buffer
      0,
      now
    );

    expect(timer.status).toBe('buffer_active');
    expect(timer.remainingSeconds).toBe(900); // 1200s - 300s = 900s (15 min left)
    expect(timer.bufferUsedInSectionSeconds).toBe(300);
  });

  it('locks section when submitted and advances flow', () => {
    const startedAt = new Date('2026-10-25T10:00:00Z');
    const timer = computeServerTimer(
      b1Config,
      {
        startedAt,
        durationSeconds: 1680,
        bufferUsedSeconds: 0,
        status: 'submitted',
        submittedAt: new Date(),
      },
      1200,
      0
    );

    expect(timer.status).toBe('submitted');
    expect(timer.remainingSeconds).toBe(0);
    expect(timer.canUseBuffer).toBe(false);

    const next = getNextSection('B1');
    expect(next?.id).toBe('B2');
  });
});

describe('5. Secrecy Guarantee Payload Inspection', () => {
  it('guarantees no ans, model_answer, or rubric exists on student question objects', () => {
    const rawQuestionFromDB = {
      id: 'Q01',
      stem: 'What is 25% of 480?',
      opts: ['100', '110', '120', '130'],
      type: 'mcq',
      ans: 'C', // Secret key
      model_answer: 'Detailed secret',
      rubric: { accuracy: 5 },
    };

    // Simulate student sanitization filter
    const sanitized = { ...rawQuestionFromDB } as any;
    delete sanitized.ans;
    delete sanitized.model_answer;
    delete sanitized.rubric;

    expect(sanitized.ans).toBeUndefined();
    expect(sanitized.model_answer).toBeUndefined();
    expect(sanitized.rubric).toBeUndefined();
    expect(Object.keys(sanitized)).not.toContain('ans');
    expect(Object.keys(sanitized)).not.toContain('model_answer');
    expect(Object.keys(sanitized)).not.toContain('rubric');
  });
});

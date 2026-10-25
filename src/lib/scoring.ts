import {
  SectionScoreSummary,
  TopicBreakdown,
  DifficultyBreakdown,
  ConfidenceMatrix,
  StaminaWindow,
  SelfRatingCorrelation,
} from '@/types';

export interface ScoreItemInput {
  id: string;
  sectionId: string;
  topic?: string;
  diff?: 'F' | 'S' | 'H';
  type: string;
  marks?: number;
  neg?: number;
  ans?: string;
  selected?: any;
  confidence?: 'Sure' | 'Maybe' | 'Guess' | null;
  timeSpentSeconds: number;
  firstAnswerTs?: Date | string;
  skipped: boolean;
}

export function computeMCQScores(
  items: ScoreItemInput[],
  sectionIds: string[] = ['B1', 'B2', 'B3', 'B4', 'C1', 'C3']
): {
  sectionScores: Record<string, SectionScoreSummary>;
  overallMCQ: SectionScoreSummary;
  topicBreakdown: TopicBreakdown[];
  difficultyBreakdown: DifficultyBreakdown[];
  confidenceMatrix: ConfidenceMatrix;
} {
  const sectionScores: Record<string, SectionScoreSummary> = {};
  const topicMap: Record<string, { attempted: number; correct: number; wrong: number; total: number }> = {};
  const diffMap: Record<string, { attempted: number; correct: number; wrong: number; total: number }> = {
    F: { attempted: 0, correct: 0, wrong: 0, total: 0 },
    S: { attempted: 0, correct: 0, wrong: 0, total: 0 },
    H: { attempted: 0, correct: 0, wrong: 0, total: 0 },
  };

  const confidenceMatrix: ConfidenceMatrix = {
    Sure: { correct: 0, wrong: 0, total: 0, accuracy: 0 },
    Maybe: { correct: 0, wrong: 0, total: 0, accuracy: 0 },
    Guess: { correct: 0, wrong: 0, total: 0, accuracy: 0 },
    Untagged: { correct: 0, wrong: 0, total: 0, accuracy: 0 },
  };

  // Filter only MCQ items in targeted sections
  const mcqItems = items.filter(
    (item) => sectionIds.includes(item.sectionId) && item.type === 'mcq'
  );

  // Group by section
  for (const sId of sectionIds) {
    const sItems = mcqItems.filter((i) => i.sectionId === sId);
    let attempted = 0;
    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    let totalTime = 0;
    let totalTimeCorrect = 0;
    let totalTimeWrong = 0;

    for (const item of sItems) {
      totalTime += item.timeSpentSeconds || 0;
      const isAttempted =
        !item.skipped &&
        item.selected !== undefined &&
        item.selected !== null &&
        item.selected !== '';

      if (isAttempted) {
        attempted++;
        const isCorrect = String(item.selected).toUpperCase().trim() === String(item.ans).toUpperCase().trim();
        if (isCorrect) {
          correct++;
          totalTimeCorrect += item.timeSpentSeconds || 0;
        } else {
          wrong++;
          totalTimeWrong += item.timeSpentSeconds || 0;
        }
      } else {
        skipped++;
      }
    }

    const netScore = correct * 1 - wrong * 0.25;
    const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;
    const attemptRate = sItems.length > 0 ? (attempted / sItems.length) * 100 : 0;
    const avgTimePerQuestionSeconds = sItems.length > 0 ? Math.round(totalTime / sItems.length) : 0;
    const avgTimeCorrectSeconds = correct > 0 ? Math.round(totalTimeCorrect / correct) : 0;
    const avgTimeWrongSeconds = wrong > 0 ? Math.round(totalTimeWrong / wrong) : 0;

    sectionScores[sId] = {
      sectionId: sId,
      title: getSectionTitle(sId),
      totalQuestions: sItems.length,
      attempted,
      correct,
      wrong,
      skipped,
      netScore: Math.round(netScore * 100) / 100,
      maxScore: sItems.length * 1,
      accuracy: Math.round(accuracy * 10) / 10,
      attemptRate: Math.round(attemptRate * 10) / 10,
      avgTimePerQuestionSeconds,
      avgTimeCorrectSeconds,
      avgTimeWrongSeconds,
    };
  }

  // Aggregate stats across all MCQs
  let totalAttempted = 0;
  let totalCorrect = 0;
  let totalWrong = 0;
  let totalSkipped = 0;
  let totalAllTime = 0;
  let totalAllTimeCorrect = 0;
  let totalAllTimeWrong = 0;

  for (const item of mcqItems) {
    const isAttempted =
      !item.skipped &&
      item.selected !== undefined &&
      item.selected !== null &&
      item.selected !== '';

    const isCorrect = isAttempted && String(item.selected).toUpperCase().trim() === String(item.ans).toUpperCase().trim();
    const isWrong = isAttempted && !isCorrect;

    totalAllTime += item.timeSpentSeconds || 0;
    if (isAttempted) {
      totalAttempted++;
      if (isCorrect) {
        totalCorrect++;
        totalAllTimeCorrect += item.timeSpentSeconds || 0;
      } else {
        totalWrong++;
        totalAllTimeWrong += item.timeSpentSeconds || 0;
      }
    } else {
      totalSkipped++;
    }

    // Topic map
    const topic = item.topic || 'general';
    if (!topicMap[topic]) {
      topicMap[topic] = { attempted: 0, correct: 0, wrong: 0, total: 0 };
    }
    topicMap[topic].total++;
    if (isAttempted) {
      topicMap[topic].attempted++;
      if (isCorrect) topicMap[topic].correct++;
      else topicMap[topic].wrong++;
    }

    // Difficulty map
    const diff = item.diff || 'S';
    if (diffMap[diff]) {
      diffMap[diff].total++;
      if (isAttempted) {
        diffMap[diff].attempted++;
        if (isCorrect) diffMap[diff].correct++;
        else diffMap[diff].wrong++;
      }
    }

    // Confidence Matrix
    if (isAttempted) {
      const tag = item.confidence || 'Untagged';
      if (confidenceMatrix[tag]) {
        confidenceMatrix[tag].total++;
        if (isCorrect) confidenceMatrix[tag].correct++;
        else confidenceMatrix[tag].wrong++;
      }
    }
  }

  // Calculate accuracies for confidence matrix
  for (const key of Object.keys(confidenceMatrix) as Array<keyof ConfidenceMatrix>) {
    const cell = confidenceMatrix[key];
    cell.accuracy = cell.total > 0 ? Math.round((cell.correct / cell.total) * 1000) / 10 : 0;
  }

  // Topic breakdown
  const topicBreakdown: TopicBreakdown[] = Object.entries(topicMap).map(([topic, stats]) => {
    const acc = stats.attempted > 0 ? (stats.correct / stats.attempted) * 100 : 0;
    let band: 'green' | 'amber' | 'red' = 'red';
    if (acc >= 70) band = 'green';
    else if (acc >= 45) band = 'amber';

    return {
      topic,
      attempted: stats.attempted,
      correct: stats.correct,
      wrong: stats.wrong,
      total: stats.total,
      accuracy: Math.round(acc * 10) / 10,
      band,
    };
  });

  // Difficulty breakdown
  const diffLabels: Record<string, string> = {
    F: 'Foundation',
    S: 'Standard',
    H: 'RBI-Level',
  };

  const difficultyBreakdown: DifficultyBreakdown[] = (['F', 'S', 'H'] as const).map((diff) => {
    const stats = diffMap[diff];
    const acc = stats.attempted > 0 ? (stats.correct / stats.attempted) * 100 : 0;
    let band: 'green' | 'amber' | 'red' = 'red';
    if (acc >= 70) band = 'green';
    else if (acc >= 45) band = 'amber';

    return {
      diff,
      diffLabel: diffLabels[diff] || diff,
      attempted: stats.attempted,
      correct: stats.correct,
      wrong: stats.wrong,
      total: stats.total,
      accuracy: Math.round(acc * 10) / 10,
      band,
    };
  });

  const overallNetScore = totalCorrect * 1 - totalWrong * 0.25;
  const overallMCQ: SectionScoreSummary = {
    sectionId: 'OVERALL',
    title: 'All Phase 1 & 2 MCQs',
    totalQuestions: mcqItems.length,
    attempted: totalAttempted,
    correct: totalCorrect,
    wrong: totalWrong,
    skipped: totalSkipped,
    netScore: Math.round(overallNetScore * 100) / 100,
    maxScore: mcqItems.length,
    accuracy: totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 1000) / 10 : 0,
    attemptRate: mcqItems.length > 0 ? Math.round((totalAttempted / mcqItems.length) * 1000) / 10 : 0,
    avgTimePerQuestionSeconds: mcqItems.length > 0 ? Math.round(totalAllTime / mcqItems.length) : 0,
    avgTimeCorrectSeconds: totalCorrect > 0 ? Math.round(totalAllTimeCorrect / totalCorrect) : 0,
    avgTimeWrongSeconds: totalWrong > 0 ? Math.round(totalAllTimeWrong / totalWrong) : 0,
  };

  return {
    sectionScores,
    overallMCQ,
    topicBreakdown,
    difficultyBreakdown,
    confidenceMatrix,
  };
}

export function computeStaminaCurve(
  examStartTime: Date | string,
  items: ScoreItemInput[]
): StaminaWindow[] {
  const startMs = new Date(examStartTime).getTime();
  const windowMs = 30 * 60 * 1000; // 30 minutes
  const windows: Record<number, { count: number; correct: number; totalSeconds: number }> = {};

  for (const item of items) {
    if (!item.firstAnswerTs || item.skipped || item.selected === undefined || item.selected === null) {
      continue;
    }
    const ansMs = new Date(item.firstAnswerTs).getTime();
    const elapsedMs = Math.max(0, ansMs - startMs);
    const winIdx = Math.floor(elapsedMs / windowMs);

    if (!windows[winIdx]) {
      windows[winIdx] = { count: 0, correct: 0, totalSeconds: 0 };
    }
    windows[winIdx].count++;
    windows[winIdx].totalSeconds += item.timeSpentSeconds || 0;
    if (String(item.selected).toUpperCase().trim() === String(item.ans).toUpperCase().trim()) {
      windows[winIdx].correct++;
    }
  }

  const result: StaminaWindow[] = [];
  const maxWin = Math.max(...Object.keys(windows).map(Number), 0);
  for (let i = 0; i <= maxWin; i++) {
    const w = windows[i] || { count: 0, correct: 0, totalSeconds: 0 };
    result.push({
      windowIndex: i,
      label: `${i * 30}–${(i + 1) * 30} min`,
      questionsAnswered: w.count,
      correct: w.correct,
      accuracy: w.count > 0 ? Math.round((w.correct / w.count) * 1000) / 10 : 0,
      avgSecondsPerQuestion: w.count > 0 ? Math.round(w.totalSeconds / w.count) : 0,
    });
  }

  return result;
}

export function computeLikertScore(responseValue: number | string, reverseScored: boolean = false): number {
  const num = typeof responseValue === 'number' ? responseValue : parseInt(String(responseValue), 10);
  if (isNaN(num) || num < 1 || num > 5) return 0;
  return reverseScored ? 6 - num : num;
}

export function computeSelfRatingCorrelation(
  selfRatings: Record<string, number>, // A07 to A13
  sectionScores: Record<string, SectionScoreSummary>
): SelfRatingCorrelation[] {
  // Mapping A07-A13 to subject accuracy
  const mapping: Array<{ itemId: string; subject: string; sectionId: string }> = [
    { itemId: 'A07', subject: 'Quantitative Aptitude', sectionId: 'B1' },
    { itemId: 'A08', subject: 'Reasoning Ability', sectionId: 'B2' },
    { itemId: 'A09', subject: 'English Language', sectionId: 'B3' },
    { itemId: 'A10', subject: 'General Awareness', sectionId: 'B4' },
    { itemId: 'A11', subject: 'Economics (ESI)', sectionId: 'C1' },
    { itemId: 'A12', subject: 'Finance & Management', sectionId: 'C3' },
  ];

  return mapping.map(({ itemId, subject, sectionId }) => {
    const rating = selfRatings[itemId] || 3;
    const actualAcc = sectionScores[sectionId]?.accuracy || 0;
    // Expected accuracy range for a 1-5 scale: 1 -> <30%, 2 -> 30-50%, 3 -> 50-70%, 4 -> 70-85%, 5 -> >85%
    const expectedAcc = rating * 20; // 1->20%, 3->60%, 5->100%
    const diff = expectedAcc - actualAcc;

    let calibration: 'well-calibrated' | 'overconfident' | 'underconfident' = 'well-calibrated';
    if (diff > 25) {
      calibration = 'overconfident';
    } else if (diff < -25) {
      calibration = 'underconfident';
    }

    return {
      itemId,
      subject,
      selfRating: rating,
      actualAccuracy: actualAcc,
      calibration,
    };
  });
}

function getSectionTitle(sId: string): string {
  switch (sId) {
    case 'B1':
      return 'Quantitative Aptitude';
    case 'B2':
      return 'Reasoning Ability';
    case 'B3':
      return 'English Language';
    case 'B4':
      return 'General Awareness';
    case 'C1':
      return 'ESI Objective';
    case 'C2':
      return 'ESI Descriptive';
    case 'C3':
      return 'Finance & Management';
    case 'C4':
      return 'English Writing';
    default:
      return sId;
  }
}

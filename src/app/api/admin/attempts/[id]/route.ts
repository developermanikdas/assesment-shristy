import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { ResponseModel } from '@/lib/models/Response';
import { Question } from '@/lib/models/Question';
import { AnswerKey } from '@/lib/models/AnswerKey';
import { EventLog } from '@/lib/models/EventLog';
import {
  computeMCQScores,
  computeStaminaCurve,
  computeSelfRatingCorrelation,
  computeLikertScore,
  ScoreItemInput,
} from '@/lib/scoring';
import { generateD01ReflectionItems, expandQuestionsWithD01, CandidateMCQ } from '@/lib/reflection';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const attempt = await Attempt.findById(id).lean();
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    const responses = await ResponseModel.find({ attemptId: id }).lean();
    const eventLogs = await EventLog.find({ attemptId: id }).sort({ ts: 1 }).lean();
    const allQuestions = await Question.find({}).sort({ order: 1 }).lean();
    const allKeys = await AnswerKey.find({}).lean();

    const keyMap = new Map<string, any>();
    allKeys.forEach((k: any) => keyMap.set(k.id, k));

    const responseMap = new Map<string, any>();
    responses.forEach((r: any) => responseMap.set(r.itemId, r));

    // Dynamic reflection items expansion for D01
    const d01Template = allQuestions.find((q: any) => q.id === 'D01');
    let expandedQuestions = allQuestions;
    if (d01Template) {
      let d01Items = attempt.d01Items;
      if (!d01Items || d01Items.length === 0) {
        const mcqQuestions = allQuestions.filter(
          (q: any) => q.type === 'mcq' && ['B1', 'B2', 'B3', 'B4', 'C1', 'C3'].includes(q.sectionId)
        );
        const candidates: CandidateMCQ[] = mcqQuestions.map((q: any) => {
          const resp = responseMap.get(q.id);
          const keyDoc = keyMap.get(q.id);
          return {
            qid: q.id,
            stem: q.stem,
            opts: q.opts,
            selected: resp?.selected ?? null,
            ans: keyDoc?.ans || '',
            confidence: resp?.confidence ?? null,
            skipped: !resp || !!resp.skipped || resp.selected === undefined || resp.selected === null,
          };
        });
        d01Items = generateD01ReflectionItems(candidates, d01Template.stem);
      }
      expandedQuestions = expandQuestionsWithD01(allQuestions, d01Items);
    }

    // Prepare ScoreItemInputs for MCQ scoring
    const scoreInputs: ScoreItemInput[] = allQuestions.map((q: any) => {
      const resp = responseMap.get(q.id);
      const keyDoc = keyMap.get(q.id);
      return {
        id: q.id,
        sectionId: q.sectionId,
        topic: q.topic,
        diff: q.diff,
        type: q.type,
        marks: q.marks,
        neg: q.neg,
        ans: keyDoc?.ans,
        selected: resp?.selected,
        confidence: resp?.confidence,
        timeSpentSeconds: resp?.timeSpentSeconds || 0,
        firstAnswerTs: resp?.firstAnswerTs || resp?.createdAt,
        skipped: !!resp?.skipped,
      };
    });

    const mcqAnalytics = computeMCQScores(scoreInputs);

    // Stamina curve with breaks excluded
    const staminaCurve = attempt.startedAt
      ? computeStaminaCurve(attempt.startedAt, scoreInputs, attempt.sectionTimers)
      : [];

    // Self-ratings (Part A items A07 to A13)
    const selfRatings: Record<string, number> = {};
    for (let i = 7; i <= 13; i++) {
      const qid = `A0${i}`.slice(-3);
      const r = responseMap.get(qid);
      if (r && r.selected) {
        selfRatings[qid] = Number(r.selected);
      }
    }
    const selfRatingCorrelation = computeSelfRatingCorrelation(
      selfRatings,
      mcqAnalytics.sectionScores
    );

    // Personal profile grouped by section (Part E items)
    const profileSections: Record<string, any[]> = {
      background: [],
      resources: [],
      time: [],
      prep: [],
      motivation: [],
      support: [],
      habits: [],
      learning: [],
      mindset: [],
      mentorship: [],
    };

    allQuestions
      .filter((q: any) => q.partId === 'E')
      .forEach((q: any) => {
        const sec = q.section || 'general';
        const resp = responseMap.get(q.id);
        const itemData: any = {
          id: q.id,
          stem: q.stem,
          type: q.type,
          selected: resp?.selected ?? null,
          timeSpentSeconds: resp?.timeSpentSeconds || 0,
          skipped: !!resp?.skipped,
        };

        if (q.type === 'likert') {
          itemData.reverse_scored = !!q.reverse_scored;
          itemData.computedScore = resp?.selected
            ? computeLikertScore(resp.selected, q.reverse_scored)
            : null;
        }

        if (!profileSections[sec]) profileSections[sec] = [];
        profileSections[sec].push(itemData);
      });

    // Subjective items (SD1, SD2, FS1, W1, W2, D01a-D01f, D02-D12)
    const subjectiveIds = ['SD1', 'SD2', 'FS1', 'W1', 'W2', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10', 'D11', 'D12'];
    const subjectiveAnswers = expandedQuestions
      .filter((q: any) => subjectiveIds.includes(q.id) || q.id.startsWith('D01'))
      .map((q: any) => {
        const resp = responseMap.get(q.id);
        const keyDoc = keyMap.get(q.id);
        let correct: boolean | null = null;
        if (q.id === 'D07') {
          correct = resp?.selected !== undefined && resp?.selected !== null
            ? String(resp.selected).toUpperCase().trim() === 'B'
            : false;
        } else if (q.id === 'D08') {
          correct = resp?.selected !== undefined && resp?.selected !== null
            ? String(resp.selected).toUpperCase().trim() === 'C'
            : false;
        }

        const audioDuration = resp?.audioDurationSeconds || (resp?.audioGridFsId ? 18 : null);

        return {
          id: q.id,
          stem: q.stem,
          type: q.type,
          topic: q.topic,
          marks: q.marks,
          selected: resp?.selected ?? null,
          reason: resp?.reason ?? null,
          correct,
          choiceIndex: resp?.choiceIndex ?? null,
          choices: q.choices,
          timeSpentSeconds: resp?.timeSpentSeconds || 0,
          writingStats: resp?.writingStats || null,
          audioGridFsId: resp?.audioGridFsId || null,
          audioDurationSeconds: audioDuration,
          modelAnswer: keyDoc?.model_answer || null,
          rubric: keyDoc?.rubric || null,
          skipped: !!resp?.skipped,
        };
      });

    // Per-question comprehensive rows
    const perQuestionRows = expandedQuestions.map((q: any) => {
      const resp = responseMap.get(q.id);
      const keyDoc = keyMap.get(q.id);
      const isMCQ = q.type === 'mcq';
      let correct: boolean | null = null;

      if (q.id === 'D07') {
        correct = resp?.selected !== undefined && resp?.selected !== null
          ? String(resp.selected).toUpperCase().trim() === 'B'
          : false;
      } else if (q.id === 'D08') {
        correct = resp?.selected !== undefined && resp?.selected !== null
          ? String(resp.selected).toUpperCase().trim() === 'C'
          : false;
      } else if ((isMCQ || q.type === 'mcq_plus_reason') && resp?.selected && keyDoc?.ans) {
        correct = String(resp.selected).toUpperCase().trim() === String(keyDoc.ans).toUpperCase().trim();
      }

      const isSkipped = !!resp?.skipped || resp?.selected === undefined || resp?.selected === null || resp?.selected === '';
      const confidence = isSkipped ? null : (resp?.confidence ?? null);
      const audioDuration = resp?.audioDurationSeconds || (resp?.audioGridFsId ? 18 : null);

      return {
        id: q.id,
        partId: q.partId,
        sectionId: q.sectionId,
        topic: q.topic || '',
        diff: q.diff || '',
        type: q.type,
        stem: q.stem,
        selected: resp?.selected ?? null,
        confidence,
        correct,
        ans: keyDoc?.ans ?? null,
        timeSpentSeconds: resp?.timeSpentSeconds || 0,
        visits: resp?.visits || 0,
        changesCount: resp?.changes?.length || 0,
        changes: resp?.changes || [],
        skipped: isSkipped,
        markedForReview: !!resp?.markedForReview,
        writingStats: resp?.writingStats || null,
        audioGridFsId: resp?.audioGridFsId || null,
        audioDurationSeconds: audioDuration,
      };
    });

    return NextResponse.json({
      attempt,
      mcqAnalytics,
      staminaCurve,
      selfRatingCorrelation,
      profileSections,
      subjectiveAnswers,
      perQuestionRows,
      eventLogs,
    });
  } catch (err: any) {
    console.error('Fetch attempt detail error:', err);
    return NextResponse.json({ error: 'Failed to fetch attempt details' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    await Attempt.findByIdAndDelete(id);
    await ResponseModel.deleteMany({ attemptId: id });
    await EventLog.deleteMany({ attemptId: id });

    return NextResponse.json({ success: true, message: 'Attempt and all associated data permanently deleted' });
  } catch (err: any) {
    console.error('Delete attempt error:', err);
    return NextResponse.json({ error: 'Failed to delete attempt' }, { status: 500 });
  }
}

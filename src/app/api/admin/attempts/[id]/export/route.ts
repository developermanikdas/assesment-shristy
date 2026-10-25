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
    const url = new URL(req.url);
    const format = url.searchParams.get('format') || 'json';

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

    // Per-question rows
    const perQuestionRows = allQuestions.map((q: any) => {
      const resp = responseMap.get(q.id);
      const keyDoc = keyMap.get(q.id);
      const isMCQ = q.type === 'mcq';
      let correct: boolean | null = null;
      if (isMCQ && resp?.selected && keyDoc?.ans) {
        correct = String(resp.selected).toUpperCase().trim() === String(keyDoc.ans).toUpperCase().trim();
      }

      return {
        id: q.id,
        section: q.sectionId,
        topic: q.topic || '',
        diff: q.diff || '',
        type: q.type,
        stem: q.stem,
        correct,
        selected: resp?.selected !== undefined ? resp.selected : null,
        reason: resp?.reason || null,
        confidence: resp?.confidence || '',
        time_seconds: resp?.timeSpentSeconds || 0,
        visits: resp?.visits || 0,
        changes: resp?.changes?.length || 0,
        skipped: !!resp?.skipped,
        markedForReview: !!resp?.markedForReview,
        writingStats: resp?.writingStats || null,
      };
    });

    const safeNickname = (attempt.nickname || 'student').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];

    // CSV format
    if (format === 'csv') {
      const csvHeaders = 'id,section,topic,diff,correct,selected,confidence,time_seconds,visits,changes\n';
      const csvRows = perQuestionRows
        .map((r) => {
          const sel = String(r.selected ?? '').replace(/"/g, '""');
          const correctStr = r.correct === null ? '' : r.correct ? 'true' : 'false';
          return `"${r.id}","${r.section}","${r.topic}","${r.diff}","${correctStr}","${sel}","${r.confidence}",${r.time_seconds},${r.visits},${r.changes}`;
        })
        .join('\n');

      return new Response(csvHeaders + csvRows, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="attempt-${safeNickname}-${dateStr}.csv"`,
        },
      });
    }

    // JSON format
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
    const staminaCurve = attempt.startedAt
      ? computeStaminaCurve(attempt.startedAt, scoreInputs)
      : [];

    const selfRatings: Record<string, number> = {};
    for (let i = 7; i <= 13; i++) {
      const qid = `A0${i}`.slice(-3);
      const r = responseMap.get(qid);
      if (r && r.selected) selfRatings[qid] = Number(r.selected);
    }
    const selfRatingCorrelation = computeSelfRatingCorrelation(
      selfRatings,
      mcqAnalytics.sectionScores
    );

    // Subjective answers verbatim
    const subjectiveIds = ['SD1', 'SD2', 'FS1', 'W1', 'W2', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10', 'D11', 'D12'];
    const subjectiveAnswers = allQuestions
      .filter((q: any) => subjectiveIds.includes(q.id) || q.id.startsWith('D01'))
      .map((q: any) => {
        const resp = responseMap.get(q.id);
        const keyDoc = keyMap.get(q.id);
        return {
          id: q.id,
          stem: q.stem,
          type: q.type,
          selectedAnswer: resp?.selected ?? null,
          reason: resp?.reason ?? null,
          wordCount: resp?.writingStats?.wordCount ?? 0,
          pasteCount: resp?.writingStats?.pasteCount ?? 0,
          editTimeline: resp?.writingStats?.editTimeline ?? [],
          timeSpentSeconds: resp?.timeSpentSeconds || 0,
          modelAnswer: keyDoc?.model_answer || null,
          rubric: keyDoc?.rubric || null,
        };
      });

    // Personal profile answers
    const personalProfileAnswers = allQuestions
      .filter((q: any) => q.partId === 'E')
      .map((q: any) => {
        const resp = responseMap.get(q.id);
        return {
          id: q.id,
          section: q.section,
          type: q.type,
          stem: q.stem,
          response: resp?.selected ?? null,
          computedLikertScore:
            q.type === 'likert' && resp?.selected
              ? computeLikertScore(resp.selected, q.reverse_scored)
              : null,
          reverseScored: !!q.reverse_scored,
          timeSpentSeconds: resp?.timeSpentSeconds || 0,
        };
      });

    const jsonBundle = {
      meta: {
        assessment: 'RBI Grade B Baseline Assessment',
        version: '1.0',
        studentNickname: attempt.nickname,
        attemptId: attempt._id.toString(),
        token: attempt.token,
        status: attempt.status,
        exportedAt: new Date().toISOString(),
      },
      timing: {
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        totalBufferAvailableMinutes: (attempt.pooledBufferTotalSeconds || 1200) / 60,
        bufferUsedMinutes: Math.round(((attempt.pooledBufferUsedSeconds || 0) / 60) * 10) / 10,
        sectionTimers: attempt.sectionTimers,
      },
      sectionStats: mcqAnalytics,
      staminaCurve,
      selfRatingCorrelation,
      perQuestionRows,
      subjectiveAnswersVerbatim: subjectiveAnswers,
      personalProfileAnswers,
      integritySummary: {
        ...attempt.integritySummary,
        eventLogs,
      },
    };

    return new Response(JSON.stringify(jsonBundle, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="attempt-${safeNickname}-${dateStr}.json"`,
      },
    });
  } catch (err: any) {
    console.error('Export error:', err);
    return NextResponse.json({ error: 'Failed to export attempt' }, { status: 500 });
  }
}

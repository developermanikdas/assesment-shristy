import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { Question } from '@/lib/models/Question';
import { SetModel } from '@/lib/models/Set';
import { ResponseModel } from '@/lib/models/Response';
import { AnswerKey } from '@/lib/models/AnswerKey';
import {
  EXAM_SECTIONS,
  getSectionConfig,
  computeServerTimer,
} from '@/lib/exam-flow';
import { generateD01ReflectionItems, expandQuestionsWithD01, CandidateMCQ } from '@/lib/reflection';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    await connectDB();

    const attempt = await Attempt.findOne({ token }).lean();
    if (!attempt) {
      return NextResponse.json({ error: 'Assessment attempt not found' }, { status: 404 });
    }

    // Auto-initialize startedAt for Part A if no PIN is configured and attempt is not started
    if (!attempt.pinHash && attempt.status === 'not_started') {
      const now = new Date();
      attempt.status = 'in_progress';
      attempt.startedAt = now;
      const timerA = attempt.sectionTimers?.find((s: any) => s.sectionId === 'A');
      if (timerA && !timerA.startedAt) {
        timerA.startedAt = now;
        timerA.status = 'active';
      }
      await Attempt.updateOne(
        { _id: attempt._id },
        { $set: { status: 'in_progress', startedAt: now, sectionTimers: attempt.sectionTimers } }
      );
    }

    const currentSectionConfig = getSectionConfig(attempt.currentSectionId) || EXAM_SECTIONS[0];
    const sectionTimerData = attempt.sectionTimers?.find(
      (t) => t.sectionId === attempt.currentSectionId
    );

    // Compute server-authoritative timer
    const timerResult = computeServerTimer(
      currentSectionConfig,
      sectionTimerData as any,
      attempt.pooledBufferTotalSeconds || 1200,
      attempt.pooledBufferUsedSeconds || 0,
      new Date()
    );

    // Fetch all sets
    const sets = await SetModel.find({}).lean();
    const setMap: Record<string, any> = {};
    sets.forEach((s) => {
      setMap[s.id] = {
        id: s.id,
        title: s.title,
        text: s.text,
        table: s.table,
      };
    });

    // Fetch existing responses for this attempt
    const responses = await ResponseModel.find({ attemptId: attempt._id.toString() }).lean();
    const responseMap: Record<string, any> = {};
    responses.forEach((r) => {
      responseMap[r.itemId] = {
        itemId: r.itemId,
        selected: r.selected,
        reason: r.reason,
        choiceIndex: r.choiceIndex,
        confidence: r.confidence,
        timeSpentSeconds: r.timeSpentSeconds || 0,
        visits: r.visits || 0,
        skipped: !!r.skipped,
        markedForReview: !!r.markedForReview,
        writingStats: r.writingStats,
        hasAudio: !!r.audioGridFsId,
        lastSavedAt: r.lastSavedAt,
      };
    });

    // Fetch clean questions - EXCLUDING ANY SECRET FIELDS
    const rawQuestions = await Question.find({})
      .select('-__v -createdAt -updatedAt')
      .sort({ order: 1 })
      .lean();

    // Check if D01 needs dynamic reflection items expansion
    let finalQuestions: any[] = [];
    const d01Template = rawQuestions.find((q) => q.id === 'D01');

    if (d01Template) {
      let reflectionItems = attempt.d01Items;
      if (!reflectionItems || reflectionItems.length === 0) {
        // Find candidate earlier MCQs for D01
        const mcqQuestions = rawQuestions.filter(
          (q) => q.type === 'mcq' && ['B1', 'B2', 'B3', 'B4', 'C1', 'C3'].includes(q.sectionId)
        );

        // Server queries answer keys strictly internally for selection algorithm
        const mcqIds = mcqQuestions.map((q) => q.id);
        const answerKeys = await AnswerKey.find({ id: { $in: mcqIds } }).lean();
        const ansMap = new Map<string, string>();
        answerKeys.forEach((k) => ansMap.set(k.id, k.ans || ''));

        const candidates: CandidateMCQ[] = mcqQuestions.map((q) => {
          const studentResp = responseMap[q.id];
          return {
            qid: q.id,
            stem: q.stem,
            selected: studentResp?.selected ?? null,
            ans: ansMap.get(q.id) || '',
            confidence: studentResp?.confidence ?? null,
            skipped: !studentResp || !!studentResp.skipped || studentResp.selected === undefined || studentResp.selected === null,
          };
        });

        reflectionItems = generateD01ReflectionItems(candidates, d01Template.stem);

        // If candidate is in Part D or later, persist reflection items
        if (['D', 'E'].includes(attempt.currentPartId) || attempt.status === 'completed') {
          await Attempt.updateOne({ _id: attempt._id }, { $set: { d01Items: reflectionItems } });
        }
      }

      finalQuestions = expandQuestionsWithD01(rawQuestions, reflectionItems);
    } else {
      finalQuestions = rawQuestions;
    }

    // STRICT SANITIZATION: Delete any potential leaks
    const sanitizedQuestions = finalQuestions.map((q) => {
      const clean = { ...q };
      delete clean.ans;
      delete clean.model_answer;
      delete clean.rubric;
      return clean;
    });

    return NextResponse.json({
      attempt: {
        id: attempt._id.toString(),
        token: attempt.token,
        nickname: attempt.nickname,
        hasPin: !!attempt.pinHash,
        status: attempt.status,
        currentPartId: attempt.currentPartId,
        currentSectionId: attempt.currentSectionId,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        pooledBufferTotalSeconds: attempt.pooledBufferTotalSeconds || 1200,
        pooledBufferUsedSeconds: attempt.pooledBufferUsedSeconds || 0,
        notepad: attempt.notepad || '',
        language: attempt.language || 'en',
        timer: timerResult,
        sectionTimers: attempt.sectionTimers || [],
      },
      sections: EXAM_SECTIONS,
      questions: sanitizedQuestions,
      sets: setMap,
      responses: responseMap,
    });
  } catch (err: any) {
    console.error('Fetch student attempt error:', err);
    return NextResponse.json({ error: 'Failed to load assessment' }, { status: 500 });
  }
}

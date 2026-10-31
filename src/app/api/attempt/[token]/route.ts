import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { Exam } from '@/lib/models/Exam';
import { Question } from '@/lib/models/Question';
import { SetModel } from '@/lib/models/Set';
import { ResponseModel } from '@/lib/models/Response';
import { AnswerKey } from '@/lib/models/AnswerKey';
import {
  EXAM_SECTIONS,
  getSectionConfig,
  computeServerTimer,
  SectionConfig,
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

    const isCustomExam = attempt.examId && attempt.examId !== 'rbi_baseline';
    let examSections: SectionConfig[] = EXAM_SECTIONS;
    let sanitizedQuestions: any[] = [];
    let setMap: Record<string, any> = {};

    if (isCustomExam) {
      const customExam = await Exam.findOne({ examId: attempt.examId }).lean();
      if (customExam && customExam.sections && customExam.sections.length > 0) {
        examSections = customExam.sections.map((s: any) => ({
          id: s.id,
          partId: s.id,
          title: s.title,
          timeMin: s.timeMinutes || 15,
          isTimed: true,
          isBreak: false,
          isSoftTimer: false,
        }));

        let qOrder = 1;
        customExam.sections.forEach((sec: any) => {
          (sec.items || []).forEach((item: any) => {
            sanitizedQuestions.push({
              id: item.id,
              partId: sec.id,
              sectionId: sec.id,
              type: item.type,
              topic: item.topic || customExam.subject,
              stem: item.stem,
              stem_hi: item.stem_hi,
              opts: item.opts,
              opts_hi: item.opts_hi,
              marks: item.marks || 1,
              neg: item.neg || 0,
              t: item.expected_seconds,
              word_limit: item.word_limit,
              order: qOrder++,
              passage: item.passage,
              choices: item.choices,
            });
          });
        });
      }
    }

    // Auto-initialize startedAt for initial section if no PIN is configured and attempt is not started
    if (!attempt.pinHash && attempt.status === 'not_started') {
      const now = new Date();
      attempt.status = 'in_progress';
      attempt.startedAt = now;
      const initialSecId = attempt.currentSectionId || (examSections[0] ? examSections[0].id : 'A');
      const timerFirst = attempt.sectionTimers?.find((s: any) => s.sectionId === initialSecId);
      if (timerFirst && !timerFirst.startedAt) {
        timerFirst.startedAt = now;
        timerFirst.status = 'active';
      }
      await Attempt.updateOne(
        { _id: attempt._id },
        { $set: { status: 'in_progress', startedAt: now, sectionTimers: attempt.sectionTimers } }
      );
    }

    const currentSectionConfig =
      examSections.find((s) => s.id === attempt.currentSectionId) ||
      getSectionConfig(attempt.currentSectionId) ||
      examSections[0];

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

    // If default RBI baseline, fetch sets and DB questions
    if (!isCustomExam) {
      const sets = await SetModel.find({}).lean();
      sets.forEach((s) => {
        setMap[s.id] = {
          id: s.id,
          title: s.title,
          text: s.text,
          table: s.table,
        };
      });

      const rawQuestions = await Question.find({})
        .select('-__v -createdAt -updatedAt')
        .sort({ order: 1 })
        .lean();

      let finalQuestions: any[] = [];
      const d01Template = rawQuestions.find((q) => q.id === 'D01');

      if (d01Template) {
        let reflectionItems = attempt.d01Items;
        if (!reflectionItems || reflectionItems.length === 0) {
          const mcqQuestions = rawQuestions.filter(
            (q) => q.type === 'mcq' && ['B1', 'B2', 'B3', 'B4', 'C1', 'C3'].includes(q.sectionId)
          );

          const mcqIds = mcqQuestions.map((q) => q.id);
          const answerKeys = await AnswerKey.find({ id: { $in: mcqIds } }).lean();
          const ansMap = new Map<string, string>();
          answerKeys.forEach((k) => ansMap.set(k.id, k.ans || ''));

          const candidates: CandidateMCQ[] = mcqQuestions.map((q) => {
            const studentResp = responseMap[q.id];
            return {
              qid: q.id,
              stem: q.stem,
              opts: q.opts,
              selected: studentResp?.selected ?? null,
              ans: ansMap.get(q.id) || '',
              confidence: studentResp?.confidence ?? null,
              skipped: !studentResp || !!studentResp.skipped || studentResp.selected === undefined || studentResp.selected === null,
            };
          });

          reflectionItems = generateD01ReflectionItems(candidates, d01Template.stem);

          if (['D', 'E'].includes(attempt.currentPartId) || attempt.status === 'completed') {
            await Attempt.updateOne({ _id: attempt._id }, { $set: { d01Items: reflectionItems } });
          }
        }

        finalQuestions = expandQuestionsWithD01(rawQuestions, reflectionItems);
      } else {
        finalQuestions = rawQuestions;
      }

      sanitizedQuestions = finalQuestions.map((q) => {
        const clean = { ...q };
        delete clean.ans;
        delete clean.model_answer;
        delete clean.rubric;
        return clean;
      });
    }

    return NextResponse.json({
      attempt: {
        id: attempt._id.toString(),
        token: attempt.token,
        nickname: attempt.nickname,
        examId: attempt.examId || 'rbi_baseline',
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
      sections: examSections,
      questions: sanitizedQuestions,
      sets: setMap,
      responses: responseMap,
    });
  } catch (err: any) {
    console.error('Fetch student attempt error:', err);
    return NextResponse.json({ error: 'Failed to load assessment' }, { status: 500 });
  }
}

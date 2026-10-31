import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { Exam } from '@/lib/models/Exam';
import { Question } from '@/lib/models/Question';
import { AnswerKey } from '@/lib/models/AnswerKey';
import { ResponseModel } from '@/lib/models/Response';
import { SectionTimerActionSchema } from '@/lib/validations';
import {
  EXAM_SECTIONS,
  getSectionConfig,
  computeServerTimer,
  SectionConfig,
} from '@/lib/exam-flow';
import { generateD01ReflectionItems, CandidateMCQ } from '@/lib/reflection';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();

    const parsed = SectionTimerActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { sectionId, action } = parsed.data;
    await connectDB();

    const attempt = await Attempt.findOne({ token });
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    const isCustomExam = attempt.examId && attempt.examId !== 'rbi_baseline';
    let examSections: SectionConfig[] = EXAM_SECTIONS;

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
      }
    }

    const secConfig =
      examSections.find((s) => s.id === sectionId) || getSectionConfig(sectionId);
    if (!secConfig) {
      return NextResponse.json({ error: 'Unknown section' }, { status: 400 });
    }

    const secIndex = examSections.findIndex((s) => s.id === sectionId);
    if (secIndex === -1) {
      return NextResponse.json({ error: 'Unknown section' }, { status: 400 });
    }

    let timer = attempt.sectionTimers.find((t) => t.sectionId === sectionId);
    if (!timer) {
      timer = {
        sectionId,
        durationSeconds: secConfig.timeMin * 60,
        bufferUsedSeconds: 0,
        status: 'not_started',
      };
      attempt.sectionTimers.push(timer);
    }

    const now = new Date();

    // 1. ACTION: START
    if (action === 'start') {
      // NEVER start a section before previous one is submitted
      if (secIndex > 0) {
        const prevSec = examSections[secIndex - 1];
        const prevTimer = attempt.sectionTimers.find((t) => t.sectionId === prevSec.id);
        if (!prevTimer || prevTimer.status !== 'submitted') {
          return NextResponse.json(
            { error: `Cannot start section ${sectionId} before previous section ${prevSec.id} is submitted` },
            { status: 400 }
          );
        }
      }

      if (!timer.startedAt) {
        timer.startedAt = now;
      }
      if (timer.status === 'not_started') {
        timer.status = 'active';
      }
      attempt.currentSectionId = sectionId;
      attempt.currentPartId = secConfig.partId;
      if (attempt.status === 'not_started') {
        attempt.status = 'in_progress';
        attempt.startedAt = now;
      }
    }

    // 2. ACTION: USE_BUFFER
    else if (action === 'use_buffer') {
      if (timer.status === 'submitted' || timer.status === 'locked') {
        return NextResponse.json({ error: 'Section already submitted or locked' }, { status: 400 });
      }

      const totalPooledRemaining = Math.max(
        0,
        (attempt.pooledBufferTotalSeconds || 1200) - (attempt.pooledBufferUsedSeconds || 0)
      );

      if (totalPooledRemaining <= 0) {
        return NextResponse.json({ error: 'No pooled buffer remaining' }, { status: 400 });
      }

      timer.status = 'buffer_active';
      timer.bufferStartedAt = now;
    }

    // 3. ACTION: STOP_BUFFER
    else if (action === 'stop_buffer') {
      if (timer.status === 'buffer_active' && timer.bufferStartedAt) {
        const bufferElapsed = Math.floor((now.getTime() - new Date(timer.bufferStartedAt).getTime()) / 1000);
        timer.bufferUsedSeconds = (timer.bufferUsedSeconds || 0) + bufferElapsed;
        attempt.pooledBufferUsedSeconds = (attempt.pooledBufferUsedSeconds || 0) + bufferElapsed;
        timer.bufferStartedAt = undefined;
        timer.status = 'active';
      }
    }

    // 4. ACTION: SUBMIT
    else if (action === 'submit') {
      // Finalize any running buffer time
      if (timer.status === 'buffer_active' && timer.bufferStartedAt) {
        const bufferElapsed = Math.floor((now.getTime() - new Date(timer.bufferStartedAt).getTime()) / 1000);
        timer.bufferUsedSeconds = (timer.bufferUsedSeconds || 0) + bufferElapsed;
        attempt.pooledBufferUsedSeconds = (attempt.pooledBufferUsedSeconds || 0) + bufferElapsed;
        timer.bufferStartedAt = undefined;
      }

      timer.status = 'submitted';
      timer.submittedAt = now;

      // Advance to next section
      const nextIndex = secIndex + 1;
      const nextSec = nextIndex < examSections.length ? examSections[nextIndex] : null;

      if (nextSec) {
        attempt.currentSectionId = nextSec.id;
        attempt.currentPartId = nextSec.partId;

        // Auto-start next section timer if break or transitioning
        let nextTimer = attempt.sectionTimers.find((t) => t.sectionId === nextSec.id);
        if (!nextTimer) {
          nextTimer = {
            sectionId: nextSec.id,
            durationSeconds: nextSec.timeMin * 60,
            bufferUsedSeconds: 0,
            status: 'active',
            startedAt: now,
          };
          attempt.sectionTimers.push(nextTimer);
        } else {
          nextTimer.startedAt = now;
          nextTimer.status = 'active';
        }

        // If advancing to Part D on RBI baseline, generate D01 reflection items
        if (nextSec.id === 'D' && !isCustomExam && (!attempt.d01Items || attempt.d01Items.length === 0)) {
          const rawQuestions = await Question.find({}).lean();
          const d01Template = rawQuestions.find((q) => q.id === 'D01');
          if (d01Template) {
            const mcqQuestions = rawQuestions.filter(
              (q) => q.type === 'mcq' && ['B1', 'B2', 'B3', 'B4', 'C1', 'C3'].includes(q.sectionId)
            );
            const mcqIds = mcqQuestions.map((q) => q.id);
            const answerKeys = await AnswerKey.find({ id: { $in: mcqIds } }).lean();
            const ansMap = new Map<string, string>();
            answerKeys.forEach((k) => ansMap.set(k.id, k.ans || ''));

            const responses = await ResponseModel.find({ attemptId: attempt._id.toString() }).lean();
            const responseMap = new Map<string, any>();
            responses.forEach((r) => responseMap.set(r.itemId, r));

            const candidates: CandidateMCQ[] = mcqQuestions.map((q) => {
              const studentResp = responseMap.get(q.id);
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

            attempt.d01Items = generateD01ReflectionItems(candidates, d01Template.stem);
          }
        }
      } else {
        // Exam finished
        attempt.status = 'completed';
        attempt.completedAt = now;
      }
    }

    await attempt.save();

    // Recompute current server timer
    const updatedSecConfig =
      examSections.find((s) => s.id === attempt.currentSectionId) || secConfig;

    const updatedTimerData = attempt.sectionTimers.find(
      (t) => t.sectionId === attempt.currentSectionId
    );

    const timerResult = computeServerTimer(
      updatedSecConfig,
      updatedTimerData as any,
      attempt.pooledBufferTotalSeconds || 1200,
      attempt.pooledBufferUsedSeconds || 0,
      now
    );

    return NextResponse.json({
      success: true,
      currentSectionId: attempt.currentSectionId,
      currentPartId: attempt.currentPartId,
      attemptStatus: attempt.status,
      timer: timerResult,
    });
  } catch (err: any) {
    console.error('Section timer action error:', err);
    return NextResponse.json({ error: 'Failed to process timer action' }, { status: 500 });
  }
}

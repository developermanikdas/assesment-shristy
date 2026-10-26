import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { Question } from '@/lib/models/Question';
import { AnswerKey } from '@/lib/models/AnswerKey';
import { ResponseModel } from '@/lib/models/Response';
import { ReopenSectionSchema } from '@/lib/validations';
import { getSectionConfig } from '@/lib/exam-flow';
import { generateD01ReflectionItems, CandidateMCQ } from '@/lib/reflection';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = ReopenSectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { sectionId, additionalMinutes, clearResponses } = parsed.data;
    await connectDB();

    const attempt = await Attempt.findById(id);
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    const secConfig = getSectionConfig(sectionId);
    if (!secConfig) {
      return NextResponse.json({ error: `Invalid section ID: ${sectionId}` }, { status: 400 });
    }

    const now = new Date();
    const durationMinutes =
      additionalMinutes && additionalMinutes > 0 ? additionalMinutes : secConfig.timeMin || 20;
    const durationSeconds = durationMinutes * 60;

    let timer = attempt.sectionTimers?.find((t) => t.sectionId === sectionId);
    if (!timer) {
      timer = {
        sectionId,
        durationSeconds,
        bufferUsedSeconds: 0,
        status: 'active',
        startedAt: now,
      };
      if (!attempt.sectionTimers) attempt.sectionTimers = [];
      attempt.sectionTimers.push(timer);
    } else {
      timer.status = 'active';
      timer.startedAt = now; // Crucial: sets starting time to NOW so candidate gets the full allocated duration
      timer.durationSeconds = durationSeconds;
      timer.submittedAt = undefined;
      timer.bufferUsedSeconds = 0;
      timer.bufferStartedAt = undefined;
    }

    attempt.status = 'in_progress';
    attempt.completedAt = undefined;
    attempt.currentSectionId = sectionId;
    attempt.currentPartId = secConfig.partId;

    // If reopening Section D, ensure reflection items (d01Items) are generated
    if (sectionId === 'D' && (!attempt.d01Items || attempt.d01Items.length === 0)) {
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
            skipped:
              !studentResp ||
              !!studentResp.skipped ||
              studentResp.selected === undefined ||
              studentResp.selected === null,
          };
        });

        attempt.d01Items = generateD01ReflectionItems(candidates, d01Template.stem);
      }
    }

    // If clearResponses requested for this section
    if (clearResponses) {
      await ResponseModel.deleteMany({
        attemptId: attempt._id.toString(),
        sectionId,
      });
    }

    attempt.markModified('sectionTimers');
    attempt.markModified('d01Items');
    await attempt.save();

    return NextResponse.json({
      success: true,
      message: `Reopened section ${sectionId} (${secConfig.title}) with ${durationMinutes} minutes. Assessment is in progress.`,
      timer,
      attempt,
    });
  } catch (err: any) {
    console.error('Reopen section error:', err);
    return NextResponse.json({ error: err.message || 'Failed to reopen section' }, { status: 500 });
  }
}

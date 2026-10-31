import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { Exam } from '@/lib/models/Exam';
import { EXAM_SECTIONS } from '@/lib/exam-flow';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    await connectDB();

    const attempt = await Attempt.findOne({ token });
    if (!attempt) {
      return NextResponse.json({ error: 'Assessment attempt not found' }, { status: 404 });
    }

    // Only start if not already started
    if (attempt.status === 'not_started') {
      const now = new Date();
      attempt.status = 'in_progress';
      attempt.startedAt = now;

      // Find first section
      const isCustomExam = attempt.examId && attempt.examId !== 'rbi_baseline';
      let initialSecId = attempt.currentSectionId;

      if (!initialSecId) {
        if (isCustomExam) {
          const customExam = await Exam.findOne({ examId: attempt.examId }).lean();
          initialSecId = customExam?.sections?.[0]?.id || 'SEC_A';
        } else {
          initialSecId = EXAM_SECTIONS[0].id;
        }
        attempt.currentSectionId = initialSecId;
        attempt.currentPartId = initialSecId;
      }

      // Activate timer for initial section
      const timerFirst = attempt.sectionTimers?.find((s: any) => s.sectionId === initialSecId);
      if (timerFirst) {
        timerFirst.startedAt = now;
        timerFirst.status = 'active';
      }

      await attempt.save();
    }

    return NextResponse.json({
      success: true,
      status: attempt.status,
      startedAt: attempt.startedAt,
    });
  } catch (err: any) {
    console.error('Start exam error:', err);
    return NextResponse.json({ error: 'Failed to start exam' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { ResponseModel } from '@/lib/models/Response';
import { EventLog } from '@/lib/models/EventLog';
import { EXAM_SECTIONS } from '@/lib/exam-flow';

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
    await connectDB();

    const attempt = await Attempt.findById(id);
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    // Reset section timers
    attempt.sectionTimers = EXAM_SECTIONS.map((sec) => ({
      sectionId: sec.id,
      durationSeconds: sec.timeMin * 60,
      bufferUsedSeconds: 0,
      status: 'not_started' as const,
    }));

    attempt.status = 'not_started';
    attempt.currentPartId = 'A';
    attempt.currentSectionId = 'A';
    attempt.startedAt = undefined;
    attempt.completedAt = undefined;
    attempt.pooledBufferUsedSeconds = 0;
    attempt.notepad = '';
    attempt.integritySummary = {
      tabBlurCount: 0,
      fullscreenExitCount: 0,
      totalTimeUnfocusedSeconds: 0,
    };

    await attempt.save();

    // Clear responses and events
    await ResponseModel.deleteMany({ attemptId: id });
    await EventLog.deleteMany({ attemptId: id });

    return NextResponse.json({ success: true, message: 'Attempt reset successfully' });
  } catch (err: any) {
    console.error('Reset attempt error:', err);
    return NextResponse.json({ error: 'Failed to reset attempt' }, { status: 500 });
  }
}

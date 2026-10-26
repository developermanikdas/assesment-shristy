import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { ExtendTimeSchema } from '@/lib/validations';
import { getSectionConfig } from '@/lib/exam-flow';

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
    const parsed = ExtendTimeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { sectionId, additionalMinutes } = parsed.data;
    await connectDB();

    const attempt = await Attempt.findById(id);
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    const now = new Date();
    const additionalSeconds = additionalMinutes * 60;

    // Handle extending the pooled buffer bank directly
    if (sectionId === 'BUFFER') {
      attempt.pooledBufferTotalSeconds = (attempt.pooledBufferTotalSeconds || 1200) + additionalSeconds;
      await attempt.save();
      return NextResponse.json({
        success: true,
        pooledBufferTotalSeconds: attempt.pooledBufferTotalSeconds,
        pooledBufferRemainingSeconds: Math.max(
          0,
          attempt.pooledBufferTotalSeconds - (attempt.pooledBufferUsedSeconds || 0)
        ),
      });
    }

    let timer = attempt.sectionTimers?.find((t) => t.sectionId === sectionId);
    if (!timer) {
      const secConfig = getSectionConfig(sectionId);
      timer = {
        sectionId,
        durationSeconds: (secConfig?.timeMin || 20) * 60 + additionalSeconds,
        bufferUsedSeconds: 0,
        status: 'active',
        startedAt: now,
      };
      if (!attempt.sectionTimers) attempt.sectionTimers = [];
      attempt.sectionTimers.push(timer);
    }

    // 1. If buffer was active on this section, finalize buffer usage and return to active regular time
    if (timer.status === 'buffer_active') {
      if (timer.bufferStartedAt) {
        const bufStartMs = new Date(timer.bufferStartedAt).getTime();
        const bufSeconds = Math.max(0, Math.floor((now.getTime() - bufStartMs) / 1000));
        timer.bufferUsedSeconds = (timer.bufferUsedSeconds || 0) + bufSeconds;
        attempt.pooledBufferUsedSeconds = (attempt.pooledBufferUsedSeconds || 0) + bufSeconds;
        timer.bufferStartedAt = undefined;
      }
      timer.status = 'active';
    }

    // 2. Ensure student actually gets additionalMinutes from right now
    const startedMs = timer.startedAt ? new Date(timer.startedAt).getTime() : now.getTime();
    const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - startedMs) / 1000));

    if (elapsedSeconds >= timer.durationSeconds) {
      // The section had already run out of time (elapsed exceeded duration).
      // Setting durationSeconds to elapsedSeconds + additionalSeconds guarantees
      // remaining time is exactly additionalMinutes from now!
      timer.durationSeconds = elapsedSeconds + additionalSeconds;
    } else {
      // Still had some time left; add to existing duration
      timer.durationSeconds += additionalSeconds;
    }

    if (timer.status === 'locked' || timer.status === 'submitted') {
      timer.status = 'active';
      timer.submittedAt = undefined;
    }

    await attempt.save();
    return NextResponse.json({ success: true, timer });
  } catch (err: any) {
    console.error('Extend time error:', err);
    return NextResponse.json({ error: 'Failed to extend time' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { SectionTimerActionSchema } from '@/lib/validations';
import {
  getSectionConfig,
  getNextSection,
  computeServerTimer,
} from '@/lib/exam-flow';

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

    const secConfig = getSectionConfig(sectionId);
    if (!secConfig) {
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

    // 2. ACTION: USE BUFFER
    else if (action === 'use_buffer') {
      const remainingBuffer = Math.max(
        0,
        (attempt.pooledBufferTotalSeconds || 1200) - (attempt.pooledBufferUsedSeconds || 0)
      );

      if (remainingBuffer <= 0) {
        return NextResponse.json({ error: 'No pooled buffer time remaining' }, { status: 400 });
      }

      timer.status = 'buffer_active';
      (timer as any).bufferStartedAt = now;
    }

    // 3. ACTION: STOP BUFFER OR SUBMIT
    else if (action === 'stop_buffer' || action === 'submit') {
      // Calculate any active buffer usage
      if (timer.status === 'buffer_active' && (timer as any).bufferStartedAt) {
        const bufStartMs = new Date((timer as any).bufferStartedAt).getTime();
        const bufSeconds = Math.max(0, Math.floor((now.getTime() - bufStartMs) / 1000));
        timer.bufferUsedSeconds = (timer.bufferUsedSeconds || 0) + bufSeconds;
        attempt.pooledBufferUsedSeconds = (attempt.pooledBufferUsedSeconds || 0) + bufSeconds;
        (timer as any).bufferStartedAt = undefined;
      }

      timer.status = 'submitted';
      timer.submittedAt = now;

      // Advance to next section
      const nextSec = getNextSection(sectionId);
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
        } else if (!nextTimer.startedAt) {
          nextTimer.startedAt = now;
          nextTimer.status = 'active';
        }
      } else {
        // Exam finished
        attempt.status = 'completed';
        attempt.completedAt = now;
      }
    }

    await attempt.save();

    // Recompute current server timer
    const updatedSecConfig = getSectionConfig(attempt.currentSectionId) || secConfig;
    const currentTimerData = attempt.sectionTimers.find(
      (t) => t.sectionId === attempt.currentSectionId
    );

    const computed = computeServerTimer(
      updatedSecConfig,
      currentTimerData as any,
      attempt.pooledBufferTotalSeconds || 1200,
      attempt.pooledBufferUsedSeconds || 0,
      now
    );

    return NextResponse.json({
      success: true,
      currentSectionId: attempt.currentSectionId,
      currentPartId: attempt.currentPartId,
      status: attempt.status,
      timer: computed,
      pooledBufferUsedSeconds: attempt.pooledBufferUsedSeconds,
      pooledBufferTotalSeconds: attempt.pooledBufferTotalSeconds,
    });
  } catch (err: any) {
    console.error('Section timer error:', err);
    return NextResponse.json({ error: 'Failed to update section timer' }, { status: 500 });
  }
}

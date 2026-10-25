import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { EventLog } from '@/lib/models/EventLog';
import { LogEventSchema } from '@/lib/validations';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const parsed = LogEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { type, payload } = parsed.data;
    await connectDB();

    const attempt = await Attempt.findOne({ token });
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    const attemptId = attempt._id.toString();

    // Log the event
    await EventLog.create({
      attemptId,
      type,
      ts: new Date(),
      payload,
    });

    // Update integrity counters
    if (!attempt.integritySummary) {
      attempt.integritySummary = {
        tabBlurCount: 0,
        fullscreenExitCount: 0,
        totalTimeUnfocusedSeconds: 0,
      };
    }

    if (type === 'tab_blur') {
      attempt.integritySummary.tabBlurCount = (attempt.integritySummary.tabBlurCount || 0) + 1;
    } else if (type === 'fullscreen_exit') {
      attempt.integritySummary.fullscreenExitCount = (attempt.integritySummary.fullscreenExitCount || 0) + 1;
    } else if (type === 'tab_unfocused_duration') {
      const duration = Number(payload?.durationSeconds) || 0;
      attempt.integritySummary.totalTimeUnfocusedSeconds =
        (attempt.integritySummary.totalTimeUnfocusedSeconds || 0) + duration;
    } else if (type === 'device_info' && payload) {
      attempt.deviceInfo = payload;
    }

    await attempt.save();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Log event error:', err);
    return NextResponse.json({ error: 'Failed to log event' }, { status: 500 });
  }
}

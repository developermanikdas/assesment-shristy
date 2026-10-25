import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { EventLog } from '@/lib/models/EventLog';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    await connectDB();

    const attempt = await Attempt.findOne({ token });
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    await EventLog.create({
      attemptId: attempt._id.toString(),
      type: 'student_deletion_request',
      ts: new Date(),
      payload: { requestedAt: new Date().toISOString() },
    });

    return NextResponse.json({
      success: true,
      message: 'Your deletion request has been recorded for your mentor.',
    });
  } catch (err: any) {
    console.error('Delete request error:', err);
    return NextResponse.json({ error: 'Failed to log deletion request' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { ExtendTimeSchema } from '@/lib/validations';

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

    const timer = attempt.sectionTimers.find((t) => t.sectionId === sectionId);
    if (!timer) {
      return NextResponse.json({ error: 'Section timer not found' }, { status: 404 });
    }

    timer.durationSeconds += additionalMinutes * 60;
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

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { ReopenSectionSchema } from '@/lib/validations';
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
    const parsed = ReopenSectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { sectionId } = parsed.data;
    await connectDB();

    const attempt = await Attempt.findById(id);
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    const timer = attempt.sectionTimers.find((t) => t.sectionId === sectionId);
    if (!timer) {
      return NextResponse.json({ error: 'Section timer not found' }, { status: 404 });
    }

    const secConfig = getSectionConfig(sectionId);
    timer.status = 'active';
    timer.submittedAt = undefined;
    attempt.currentSectionId = sectionId;
    if (secConfig) {
      attempt.currentPartId = secConfig.partId;
    }
    if (attempt.status === 'completed') {
      attempt.status = 'in_progress';
      attempt.completedAt = undefined;
    }

    await attempt.save();
    return NextResponse.json({ success: true, timer, attempt });
  } catch (err: any) {
    console.error('Reopen section error:', err);
    return NextResponse.json({ error: 'Failed to reopen section' }, { status: 500 });
  }
}

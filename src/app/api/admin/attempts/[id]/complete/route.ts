import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';

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

    const now = new Date();
    attempt.status = 'completed';
    attempt.completedAt = now;

    // Finalize any active section timer
    if (attempt.sectionTimers) {
      const curTimer = attempt.sectionTimers.find(
        (t: any) => t.sectionId === attempt.currentSectionId
      );
      if (curTimer && (curTimer.status === 'active' || curTimer.status === 'buffer_active')) {
        curTimer.status = 'submitted';
        curTimer.submittedAt = now;
        attempt.markModified('sectionTimers');
      }
    }

    await attempt.save();
    return NextResponse.json({
      success: true,
      message: 'Assessment marked as completed successfully.',
      attempt,
    });
  } catch (err: any) {
    console.error('Complete attempt error:', err);
    return NextResponse.json({ error: err.message || 'Failed to complete attempt' }, { status: 500 });
  }
}

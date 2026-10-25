import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';

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

    attempt.status = 'completed';
    attempt.completedAt = new Date();
    await attempt.save();

    return NextResponse.json({ success: true, message: 'Assessment completed successfully' });
  } catch (err: any) {
    console.error('Finish assessment error:', err);
    return NextResponse.json({ error: 'Failed to complete assessment' }, { status: 500 });
  }
}

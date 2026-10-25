import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { SaveNotepadSchema } from '@/lib/validations';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const parsed = SaveNotepadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    await connectDB();
    const attempt = await Attempt.findOneAndUpdate(
      { token },
      { $set: { notepad: parsed.data.notepad, updatedAt: new Date() } },
      { new: true }
    );

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Save notepad error:', err);
    return NextResponse.json({ error: 'Failed to save notepad' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Question } from '@/lib/models/Question';
import { AnswerKey } from '@/lib/models/AnswerKey';
import { UpdateQuestionSchema } from '@/lib/validations';

export async function PUT(
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
    const parsed = UpdateQuestionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    await connectDB();

    const question = await Question.findOne({ id });
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const { stem, stem_hi, opts, opts_hi, ans } = parsed.data;

    if (stem !== undefined) question.stem = stem;
    if (stem_hi !== undefined) question.stem_hi = stem_hi;
    if (opts !== undefined) question.opts = opts;
    if (opts_hi !== undefined) question.opts_hi = opts_hi;
    await question.save();

    if (ans !== undefined) {
      await AnswerKey.updateOne(
        { id },
        { $set: { id, ans, updatedAt: new Date() } },
        { upsert: true }
      );
    }

    return NextResponse.json({ success: true, message: 'Question updated successfully' });
  } catch (err: any) {
    console.error('Update question error:', err);
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
  }
}

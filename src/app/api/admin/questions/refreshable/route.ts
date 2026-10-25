import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Question } from '@/lib/models/Question';
import { AnswerKey } from '@/lib/models/AnswerKey';

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const questions = await Question.find({ refresh: true }).sort({ order: 1 }).lean();
    const ids = questions.map((q) => q.id);
    const keys = await AnswerKey.find({ id: { $in: ids } }).lean();

    const keyMap = new Map<string, any>();
    keys.forEach((k: any) => keyMap.set(k.id, k));

    const enriched = questions.map((q: any) => ({
      id: q.id,
      partId: q.partId,
      sectionId: q.sectionId,
      type: q.type,
      topic: q.topic,
      diff: q.diff,
      stem: q.stem,
      stem_hi: q.stem_hi,
      opts: q.opts,
      opts_hi: q.opts_hi,
      ans: keyMap.get(q.id)?.ans || '',
      updatedAt: q.updatedAt,
    }));

    return NextResponse.json({ questions: enriched });
  } catch (err: any) {
    console.error('Fetch refreshable questions error:', err);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}

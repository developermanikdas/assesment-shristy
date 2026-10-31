import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { Exam } from '@/lib/models/Exam';
import { ResponseModel } from '@/lib/models/Response';
import { Question } from '@/lib/models/Question';
import { AnswerKey } from '@/lib/models/AnswerKey';

export async function GET(
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

    const attempt = await Attempt.findById(id).lean();
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    const responses = await ResponseModel.find({ attemptId: id }).lean();
    const responseMap = new Map<string, any>();
    responses.forEach((r: any) => responseMap.set(r.itemId, r));

    let examTitle = 'College Examination';
    let examSubject = 'General Assessment';
    let questionItems: any[] = [];

    const isCustomExam = attempt.examId && attempt.examId !== 'rbi_baseline';

    if (isCustomExam) {
      const customExam = await Exam.findOne({ examId: attempt.examId }).lean();
      if (customExam) {
        examTitle = customExam.title;
        examSubject = customExam.subject || 'General Assessment';

        let qIndex = 1;
        (customExam.sections || []).forEach((sec: any) => {
          (sec.items || []).forEach((it: any) => {
            const resp = responseMap.get(it.id);
            const isMCQ = it.type === 'mcq';
            const studentAnswer = resp?.selected ?? null;
            const correctAnswer = it.ans ?? null;

            let isCorrect: boolean | null = null;
            if (isMCQ && studentAnswer && correctAnswer) {
              isCorrect = String(studentAnswer).trim().toUpperCase() === String(correctAnswer).trim().toUpperCase();
            }

            let wordCount = 0;
            if (resp?.writingStats?.wordCount) {
              wordCount = resp.writingStats.wordCount;
            } else if (typeof studentAnswer === 'string') {
              wordCount = studentAnswer.trim().split(/\s+/).filter(Boolean).length;
            }

            questionItems.push({
              index: qIndex++,
              id: it.id,
              sectionId: sec.id,
              sectionTitle: sec.title,
              type: it.type,
              stem: it.stem,
              opts: it.opts || [],
              studentAnswer,
              correctAnswer,
              isCorrect,
              modelAnswer: it.model_answer || null,
              rubric: it.rubric || null,
              explanation: it.explanation || null,
              marks: it.marks || 1,
              timeSpentSeconds: resp?.timeSpentSeconds || 0,
              wordCount,
              pasteCount: resp?.writingStats?.pasteCount || 0,
              confidence: resp?.confidence || null,
              skipped: !resp || !!resp.skipped || studentAnswer === null || studentAnswer === undefined,
            });
          });
        });
      }
    }

    // Fallback for default RBI baseline attempts
    if (!isCustomExam || questionItems.length === 0) {
      examTitle = 'RBI Grade B Baseline Assessment';
      examSubject = 'RBI Grade B Diagnostic';

      const allQuestions = await Question.find({}).sort({ order: 1 }).lean();
      const allKeys = await AnswerKey.find({}).lean();
      const keyMap = new Map<string, any>();
      allKeys.forEach((k: any) => keyMap.set(k.id, k));

      let qIndex = 1;
      allQuestions.forEach((q: any) => {
        const resp = responseMap.get(q.id);
        const keyDoc = keyMap.get(q.id);
        const isMCQ = q.type === 'mcq';
        const studentAnswer = resp?.selected ?? null;
        const correctAnswer = keyDoc?.ans ?? null;

        let isCorrect: boolean | null = null;
        if (isMCQ && studentAnswer && correctAnswer) {
          isCorrect = String(studentAnswer).trim().toUpperCase() === String(correctAnswer).trim().toUpperCase();
        }

        let wordCount = 0;
        if (resp?.writingStats?.wordCount) {
          wordCount = resp.writingStats.wordCount;
        } else if (typeof studentAnswer === 'string') {
          wordCount = studentAnswer.trim().split(/\s+/).filter(Boolean).length;
        }

        questionItems.push({
          index: qIndex++,
          id: q.id,
          sectionId: q.sectionId,
          sectionTitle: `Section ${q.sectionId}`,
          type: q.type,
          stem: q.stem,
          opts: q.opts || [],
          studentAnswer,
          correctAnswer,
          isCorrect,
          modelAnswer: keyDoc?.model_answer || null,
          rubric: keyDoc?.rubric || null,
          explanation: null,
          marks: q.marks || 1,
          timeSpentSeconds: resp?.timeSpentSeconds || 0,
          wordCount,
          pasteCount: resp?.writingStats?.pasteCount || 0,
          confidence: resp?.confidence || null,
          skipped: !resp || !!resp.skipped || studentAnswer === null || studentAnswer === undefined,
        });
      });
    }

    // Compute simple summary stats
    const totalQuestions = questionItems.length;
    const answeredCount = questionItems.filter((q) => !q.skipped).length;
    const mcqs = questionItems.filter((q) => q.type === 'mcq');
    const mcqCorrectCount = mcqs.filter((q) => q.isCorrect === true).length;
    const shortAnswers = questionItems.filter((q) => q.type === 'short_answer' || q.type === 'short_text');
    const longAnswers = questionItems.filter((q) => q.type === 'long_answer' || q.type === 'long_text' || q.type === 'essay' || q.type === 'choose_one_long_text');
    const totalTimeSpentSeconds = questionItems.reduce((acc, q) => acc + (q.timeSpentSeconds || 0), 0);
    const totalWordsWritten = questionItems.reduce((acc, q) => acc + (q.wordCount || 0), 0);

    return NextResponse.json({
      attempt: {
        id: attempt._id.toString(),
        token: attempt.token,
        nickname: attempt.nickname,
        examId: attempt.examId || 'rbi_baseline',
        examTitle,
        examSubject,
        status: attempt.status,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        hasPin: !!attempt.pinHash,
      },
      summary: {
        totalQuestions,
        answeredCount,
        mcqCount: mcqs.length,
        mcqCorrectCount,
        shortAnswerCount: shortAnswers.length,
        shortAnswerAnsweredCount: shortAnswers.filter((q) => !q.skipped).length,
        longAnswerCount: longAnswers.length,
        longAnswerAnsweredCount: longAnswers.filter((q) => !q.skipped).length,
        totalTimeSpentSeconds,
        totalWordsWritten,
      },
      questions: questionItems,
    });
  } catch (err: any) {
    console.error('Fetch attempt details error:', err);
    return NextResponse.json({ error: 'Failed to load attempt details' }, { status: 500 });
  }
}

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
    const url = new URL(req.url);
    const format = url.searchParams.get('format') || 'md';

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
    let sectionsData: Array<{ title: string; items: any[] }> = [];

    const isCustomExam = attempt.examId && attempt.examId !== 'rbi_baseline';

    if (isCustomExam) {
      const customExam = await Exam.findOne({ examId: attempt.examId }).lean();
      if (customExam) {
        examTitle = customExam.title;
        examSubject = customExam.subject || 'General Assessment';

        let qIndex = 1;
        (customExam.sections || []).forEach((sec: any) => {
          const sectionItems: any[] = [];
          (sec.items || []).forEach((it: any) => {
            const resp = responseMap.get(it.id);
            const studentAnswer = resp?.selected ?? null;
            const correctAnswer = it.ans ?? null;

            let wordCount = 0;
            if (resp?.writingStats?.wordCount) {
              wordCount = resp.writingStats.wordCount;
            } else if (typeof studentAnswer === 'string') {
              wordCount = studentAnswer.trim().split(/\s+/).filter(Boolean).length;
            }

            sectionItems.push({
              index: qIndex++,
              id: it.id,
              type: it.type,
              stem: it.stem,
              opts: it.opts || [],
              studentAnswer,
              correctAnswer,
              modelAnswer: it.model_answer || null,
              marks: it.marks || 1,
              timeSpentSeconds: resp?.timeSpentSeconds || 0,
              wordCount,
              confidence: resp?.confidence || null,
              skipped: !resp || !!resp.skipped || studentAnswer === null || studentAnswer === undefined,
            });
          });
          sectionsData.push({ title: sec.title, items: sectionItems });
        });
      }
    }

    if (sectionsData.length === 0) {
      examTitle = 'Assessment Paper';
      const allQuestions = await Question.find({}).sort({ order: 1 }).lean();
      const allKeys = await AnswerKey.find({}).lean();
      const keyMap = new Map<string, any>();
      allKeys.forEach((k: any) => keyMap.set(k.id, k));

      const fallbackItems: any[] = [];
      let qIndex = 1;
      allQuestions.forEach((q: any) => {
        const resp = responseMap.get(q.id);
        const keyDoc = keyMap.get(q.id);
        const studentAnswer = resp?.selected ?? null;

        let wordCount = 0;
        if (resp?.writingStats?.wordCount) {
          wordCount = resp.writingStats.wordCount;
        } else if (typeof studentAnswer === 'string') {
          wordCount = studentAnswer.trim().split(/\s+/).filter(Boolean).length;
        }

        fallbackItems.push({
          index: qIndex++,
          id: q.id,
          type: q.type,
          stem: q.stem,
          opts: q.opts || [],
          studentAnswer,
          correctAnswer: keyDoc?.ans || null,
          modelAnswer: keyDoc?.model_answer || null,
          marks: q.marks || 1,
          timeSpentSeconds: resp?.timeSpentSeconds || 0,
          wordCount,
          confidence: resp?.confidence || null,
          skipped: !resp || !!resp.skipped || studentAnswer === null || studentAnswer === undefined,
        });
      });
      sectionsData.push({ title: 'Main Assessment', items: fallbackItems });
    }

    // JSON Format download
    if (format === 'json') {
      const jsonPayload = {
        student: attempt.nickname,
        examTitle,
        examSubject,
        status: attempt.status,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        exportedAt: new Date(),
        sections: sectionsData,
      };

      const safeFilename = `${attempt.nickname}_${examTitle.replace(/[^a-zA-Z0-9]/g, '_')}_Answers.json`;
      return new NextResponse(JSON.stringify(jsonPayload, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${safeFilename}"`,
        },
      });
    }

    // Markdown / Clean Document Format download
    let md = `# Exam Answers Submission\n\n`;
    md += `**Student Name:** ${attempt.nickname}\n`;
    md += `**Examination:** ${examTitle}\n`;
    md += `**Subject:** ${examSubject}\n`;
    md += `**Status:** ${attempt.status.toUpperCase()}\n`;
    md += `**Date Submitted:** ${attempt.completedAt ? new Date(attempt.completedAt).toLocaleString() : (attempt.startedAt ? new Date(attempt.startedAt).toLocaleString() : 'In Progress')}\n\n`;
    md += `---\n\n`;

    sectionsData.forEach((sec) => {
      md += `## ${sec.title}\n\n`;

      sec.items.forEach((item) => {
        const typeLabel =
          item.type === 'mcq'
            ? 'Multiple Choice Question (MCQ)'
            : item.type === 'short_answer' || item.type === 'short_text'
            ? 'Short Answer Question'
            : 'Long Essay / Case Study';

        md += `### Question ${item.index} [${typeLabel}]\n`;
        md += `**Question:**\n${item.stem}\n\n`;

        if (item.opts && item.opts.length > 0) {
          md += `**Options:**\n`;
          item.opts.forEach((opt: string, idx: number) => {
            const letter = String.fromCharCode(65 + idx);
            md += `- **${letter}.** ${opt}\n`;
          });
          md += `\n`;
        }

        md += `**Student's Answer:**\n`;
        if (item.skipped || item.studentAnswer === null || item.studentAnswer === undefined) {
          md += `*Not Answered / Skipped*\n\n`;
        } else if (item.type === 'mcq') {
          const optIdx = item.studentAnswer.charCodeAt(0) - 65;
          const optText = item.opts?.[optIdx] ? ` - ${item.opts[optIdx]}` : '';
          md += `> **${item.studentAnswer}${optText}**`;
          if (item.confidence) {
            md += ` *(Confidence: ${item.confidence})*`;
          }
          md += `\n\n`;
          if (item.correctAnswer) {
            md += `**Answer Key:** ${item.correctAnswer}\n\n`;
          }
        } else {
          // Short or Long Answer
          md += `> ${String(item.studentAnswer).replace(/\n/g, '\n> ')}\n\n`;
          md += `*Word Count:* **${item.wordCount} words** | *Time Spent:* **${item.timeSpentSeconds} seconds**\n\n`;

          if (item.modelAnswer) {
            md += `**Model Answer / Reference Guide:**\n`;
            md += `> ${String(item.modelAnswer).replace(/\n/g, '\n> ')}\n\n`;
          }
        }

        md += `---\n\n`;
      });
    });

    const safeFilename = `${attempt.nickname}_${examTitle.replace(/[^a-zA-Z0-9]/g, '_')}_Answers.md`;
    return new NextResponse(md, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
      },
    });
  } catch (err: any) {
    console.error('Export answers error:', err);
    return NextResponse.json({ error: 'Failed to export answers' }, { status: 500 });
  }
}

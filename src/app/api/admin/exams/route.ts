import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Exam } from '@/lib/models/Exam';
import { parseAndPlanExamJson } from '@/lib/exam-parser';
import fs from 'fs';
import path from 'path';

// Seed demo exam if none exists
async function ensureDemoExamLoaded() {
  const existing = await Exam.findOne({ isDemo: true });
  if (!existing) {
    const demoFilePath = path.resolve(process.cwd(), 'questions', 'demo_college_exam_forensic.json');
    if (fs.existsSync(demoFilePath)) {
      try {
        const raw = fs.readFileSync(demoFilePath, 'utf-8');
        const parsed = parseAndPlanExamJson(raw);
        if (parsed.success && parsed.exam) {
          parsed.exam.isDemo = true;
          await Exam.updateOne(
            { examId: parsed.exam.examId },
            { $set: parsed.exam },
            { upsert: true }
          );
        }
      } catch (e) {
        console.error('Failed to auto-seed demo exam:', e);
      }
    }
  }
}

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    await ensureDemoExamLoaded();

    const exams = await Exam.find({}).sort({ createdAt: -1 }).lean();

    const formatted = exams.map((ex: any) => {
      let totalQ = 0;
      let mcqCount = 0;
      let shortCount = 0;
      let longCount = 0;

      (ex.sections || []).forEach((s: any) => {
        (s.items || []).forEach((it: any) => {
          totalQ++;
          if (it.type === 'mcq') mcqCount++;
          else if (it.type === 'short_answer' || it.type === 'short_text') shortCount++;
          else longCount++;
        });
      });

      return {
        examId: ex.examId,
        title: ex.title,
        subject: ex.subject,
        durationMinutes: ex.durationMinutes,
        totalMarks: ex.totalMarks,
        totalQuestions: totalQ,
        mcqCount,
        shortCount,
        longCount,
        isDemo: !!ex.isDemo,
        createdAt: ex.createdAt,
      };
    });

    // Also include RBI Baseline as a permanent option
    formatted.push({
      examId: 'rbi_baseline',
      title: 'RBI Grade B Baseline Assessment (Default)',
      subject: 'RBI Grade B Diagnostic',
      durationMinutes: 270,
      totalMarks: 200,
      totalQuestions: 175,
      mcqCount: 165,
      shortCount: 0,
      longCount: 10,
      isDemo: false,
      createdAt: new Date('2026-01-01'),
    });

    return NextResponse.json({ exams: formatted });
  } catch (err: any) {
    console.error('List exams error:', err);
    return NextResponse.json({ error: 'Failed to fetch exams' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const rawJson = body.json || body.content || body;
    const isDemo = !!body.isDemo;
    const shouldSave = body.save !== false;

    const result = parseAndPlanExamJson(rawJson);
    if (!result.success || !result.exam) {
      return NextResponse.json({ error: result.error || 'Failed to parse exam' }, { status: 400 });
    }

    result.exam.isDemo = isDemo;

    if (shouldSave) {
      await connectDB();
      await Exam.updateOne(
        { examId: result.exam.examId },
        { $set: result.exam },
        { upsert: true }
      );
    }

    return NextResponse.json({
      success: true,
      examId: result.exam.examId,
      title: result.exam.title,
      subject: result.exam.subject,
      durationMinutes: result.exam.durationMinutes,
      totalMarks: result.exam.totalMarks,
      stats: result.stats,
      exam: result.exam,
    });
  } catch (err: any) {
    console.error('Upload exam error:', err);
    return NextResponse.json({ error: err.message || 'Failed to upload exam' }, { status: 500 });
  }
}

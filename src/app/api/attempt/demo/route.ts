import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { connectDB } from '@/lib/db';
import { Exam } from '@/lib/models/Exam';
import { Attempt } from '@/lib/models/Attempt';
import { parseAndPlanExamJson } from '@/lib/exam-parser';

export async function POST(req: NextRequest) {
  try {
    let nickname = 'Practice Student';
    try {
      const body = await req.json();
      if (body.nickname && body.nickname.trim().length >= 2) {
        nickname = body.nickname.trim();
      }
    } catch {
      // Body optional
    }

    await connectDB();

    // Find demo exam or seed it
    let demoExam = await Exam.findOne({ isDemo: true }).lean();
    if (!demoExam) {
      const demoFilePath = path.resolve(process.cwd(), 'questions', 'demo_college_exam_forensic.json');
      if (fs.existsSync(demoFilePath)) {
        const raw = fs.readFileSync(demoFilePath, 'utf-8');
        const parsed = parseAndPlanExamJson(raw);
        if (parsed.success && parsed.exam) {
          parsed.exam.isDemo = true;
          await Exam.updateOne(
            { examId: parsed.exam.examId },
            { $set: parsed.exam },
            { upsert: true }
          );
          demoExam = parsed.exam as any;
        }
      }
    }

    if (!demoExam) {
      return NextResponse.json({ error: 'Demo exam is currently unavailable' }, { status: 404 });
    }

    // Generate instant attempt token
    const token = crypto.randomBytes(16).toString('hex');
    const firstSec = demoExam.sections[0];

    const sectionTimers = demoExam.sections.map((sec) => ({
      sectionId: sec.id,
      durationSeconds: (sec.timeMinutes || 15) * 60,
      bufferUsedSeconds: 0,
      status: 'not_started' as const,
    }));

    const attempt = await Attempt.create({
      token,
      nickname,
      examId: demoExam.examId,
      status: 'not_started',
      currentPartId: firstSec ? firstSec.id : 'SEC_A',
      currentSectionId: firstSec ? firstSec.id : 'SEC_A',
      pooledBufferTotalSeconds: 5 * 60,
      pooledBufferUsedSeconds: 0,
      sectionTimers,
      language: 'en',
    });

    return NextResponse.json({
      success: true,
      token: attempt.token,
      redirectUrl: `/take/${attempt.token}`,
      examTitle: demoExam.title,
      durationMinutes: demoExam.durationMinutes,
      totalQuestions: demoExam.sections.reduce((acc, s) => acc + s.items.length, 0),
    });
  } catch (err: any) {
    console.error('Create demo attempt error:', err);
    return NextResponse.json({ error: 'Failed to create demo attempt' }, { status: 500 });
  }
}


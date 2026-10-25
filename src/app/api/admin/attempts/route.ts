import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminSession, hashPassword } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { ResponseModel } from '@/lib/models/Response';
import { CreateAttemptSchema } from '@/lib/validations';
import { EXAM_SECTIONS } from '@/lib/exam-flow';

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const attempts = await Attempt.find({}).sort({ createdAt: -1 }).lean();

    const formatted = await Promise.all(
      attempts.map(async (att: any) => {
        // Find last activity timestamp from responses
        const lastResp = await ResponseModel.findOne({ attemptId: att._id.toString() })
          .sort({ updatedAt: -1 })
          .select('updatedAt')
          .lean();

        let timeElapsedSeconds = 0;
        if (att.startedAt) {
          const end = att.completedAt ? new Date(att.completedAt).getTime() : Date.now();
          timeElapsedSeconds = Math.max(0, Math.floor((end - new Date(att.startedAt).getTime()) / 1000));
        }

        return {
          id: att._id.toString(),
          token: att.token,
          nickname: att.nickname,
          hasPin: !!att.pinHash,
          status: att.status,
          currentPartId: att.currentPartId,
          currentSectionId: att.currentSectionId,
          startedAt: att.startedAt,
          completedAt: att.completedAt,
          timeElapsedSeconds,
          pooledBufferTotalSeconds: att.pooledBufferTotalSeconds || 1200,
          pooledBufferUsedSeconds: att.pooledBufferUsedSeconds || 0,
          lastActivity: lastResp ? (lastResp as any).updatedAt : att.updatedAt,
          createdAt: att.createdAt,
        };
      })
    );

    return NextResponse.json({ attempts: formatted });
  } catch (err: any) {
    console.error('List attempts error:', err);
    return NextResponse.json({ error: 'Failed to fetch attempts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CreateAttemptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { nickname, pin } = parsed.data;

    await connectDB();

    // Generate secure 32-character hexadecimal token
    const token = crypto.randomBytes(16).toString('hex');

    let pinHash: string | undefined = undefined;
    if (pin && pin.trim().length === 6) {
      pinHash = await hashPassword(pin.trim());
    }

    // Initialize all section timers with their planned durations
    const sectionTimers = EXAM_SECTIONS.map((sec) => ({
      sectionId: sec.id,
      durationSeconds: sec.timeMin * 60,
      bufferUsedSeconds: 0,
      status: 'not_started' as const,
    }));

    const attempt = await Attempt.create({
      token,
      pinHash,
      nickname: nickname.trim(),
      status: 'not_started',
      currentPartId: 'A',
      currentSectionId: 'A',
      pooledBufferTotalSeconds: 20 * 60, // 20 minutes
      pooledBufferUsedSeconds: 0,
      sectionTimers,
      notepad: '',
      language: 'en',
    });

    // Derive URL dynamically from request headers or environment variable
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || (host && !host.includes('localhost') ? 'https' : 'http');
    const dynamicOrigin = host ? `${proto}://${host}` : null;
    const appUrl = (process.env.APP_URL && !process.env.APP_URL.includes('localhost'))
      ? process.env.APP_URL
      : (dynamicOrigin || process.env.APP_URL || 'http://localhost:3000');
    const privateLink = `${appUrl}/take/${token}`;

    return NextResponse.json({
      success: true,
      attempt: {
        id: attempt._id.toString(),
        token,
        nickname: attempt.nickname,
        hasPin: !!pinHash,
        pin: pin || null,
        privateLink,
        status: attempt.status,
      },
    });
  } catch (err: any) {
    console.error('Create attempt error:', err);
    return NextResponse.json({ error: 'Failed to create attempt' }, { status: 500 });
  }
}

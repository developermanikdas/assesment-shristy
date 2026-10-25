import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { comparePassword } from '@/lib/auth';
import { z } from 'zod';

const VerifyPinSchema = z.object({
  token: z.string().min(1),
  pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = VerifyPinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { token, pin } = parsed.data;
    await connectDB();

    const attempt = await Attempt.findOne({ token });
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    if (!attempt.pinHash) {
      // No PIN set on this attempt, always valid
      return NextResponse.json({ valid: true });
    }

    const isValid = await comparePassword(pin, attempt.pinHash);
    if (!isValid) {
      return NextResponse.json({ valid: false, error: 'Incorrect 6-digit PIN' }, { status: 401 });
    }

    return NextResponse.json({ valid: true });
  } catch (err: any) {
    console.error('Verify PIN error:', err);
    return NextResponse.json({ error: 'Failed to verify PIN' }, { status: 500 });
  }
}

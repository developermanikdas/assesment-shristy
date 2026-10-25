import { NextRequest, NextResponse } from 'next/server';
import { AdminLoginSchema } from '@/lib/validations';
import { comparePassword, createAdminToken, setAdminSessionCookie } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Admin } from '@/lib/models/Admin';

// Rate limiting in-memory map
const rateLimitMap = new Map<string, { count: number; firstAttempt: number }>();

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();
    const rate = rateLimitMap.get(ip) || { count: 0, firstAttempt: now };

    if (now - rate.firstAttempt > 60 * 1000) {
      rate.count = 1;
      rate.firstAttempt = now;
    } else {
      rate.count++;
      if (rate.count > 10) {
        return NextResponse.json(
          { error: 'Too many login attempts. Please wait a minute.' },
          { status: 429 }
        );
      }
    }
    rateLimitMap.set(ip, rate);

    const body = await req.json();
    const parsed = AdminLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { email, password } = parsed.data;

    // Check env credentials first
    const envEmail = process.env.ADMIN_EMAIL;
    const envPassword = process.env.ADMIN_PASSWORD;

    let isValid = false;

    if (
      envEmail &&
      envPassword &&
      email.toLowerCase() === envEmail.toLowerCase() &&
      password === envPassword
    ) {
      isValid = true;
    } else {
      // Check database admin
      await connectDB();
      const admin = await Admin.findOne({ email: email.toLowerCase() });
      if (admin && admin.passwordHash) {
        isValid = await comparePassword(password, admin.passwordHash);
      }
    }

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = await createAdminToken(email);
    await setAdminSessionCookie(token);

    return NextResponse.json({ success: true, email });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

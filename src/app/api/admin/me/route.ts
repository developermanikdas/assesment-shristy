import { NextResponse } from 'next/server';
import { clearAdminSessionCookie, getAdminSession } from '@/lib/auth';

export async function POST() {
  await clearAdminSessionCookie();
  return NextResponse.json({ success: true });
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, email: session.email });
}

import { NextResponse } from 'next/server';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!cookie) {
    return NextResponse.json({ authenticated: false });
  }
  const isValid = await verifySession(cookie.value);
  return NextResponse.json({ authenticated: isValid });
}

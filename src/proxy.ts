import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isDashboardPath = path.startsWith('/dashboard');
  const isProtectedApiPath = path.startsWith('/api/') && !path.startsWith('/api/auth');

  if (isDashboardPath || isProtectedApiPath) {
    const isAuthed = await getSession(request);

    if (!isAuthed) {
      if (isProtectedApiPath) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};

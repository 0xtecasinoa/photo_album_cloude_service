import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from './auth.config';

const { auth } = NextAuth(authConfig);

/** Paths reachable without a session. Everything else requires one. */
const PUBLIC_PREFIXES = ['/login', '/signup', '/share', '/api/auth', '/_next', '/favicon'];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) || pathname === '/') {
    return NextResponse.next();
  }

  if (!req.auth) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    // Send the user back where they were trying to go after signing in.
    loginUrl.searchParams.set('callbackUrl', pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)'],
};

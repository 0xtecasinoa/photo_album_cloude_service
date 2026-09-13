import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from './auth.config';

// Next 16 renamed the `middleware` file convention to `proxy`.
const { auth } = NextAuth(authConfig);

/**
 * Routes reachable without a session.
 *
 * Marketing and pre-signup pages MUST be listed here. A prospective customer
 * following 「お問い合わせ」 from the landing page and landing on a login screen is
 * a lost sale, not a security win.
 */
const PUBLIC_EXACT = new Set(['/', '/contact', '/terms', '/privacy', '/forgot-password']);

const PUBLIC_PREFIXES = [
  '/login',
  '/signup',
  '/share', // expiring external share links — authorised by token, not session
  '/api/auth',
  '/_next',
  '/favicon',
  '/brand',
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  if (!req.auth) {
    // API calls get a machine-readable 401. Redirecting them to an HTML login
    // page makes every fetch() look like it succeeded with garbage content.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });
    }

    const loginUrl = new URL('/login', req.nextUrl.origin);
    // Send the user back where they were headed once they sign in.
    loginUrl.searchParams.set('callbackUrl', pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  /**
   * `_next` is excluded wholesale, not just `_next/static` and `_next/image`.
   * The dev server's HMR websocket lives at `_next/hmr`, and running the proxy on
   * that upgrade request breaks the handshake — which silently disables React
   * hydration for the entire app in `next dev`.
   */
  matcher: ['/((?!_next|favicon.ico|brand|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
};

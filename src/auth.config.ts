import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe half of the auth config.
 *
 * Middleware runs on the edge runtime, where bcrypt and the Postgres driver cannot
 * load. Splitting the config keeps middleware able to read the session without
 * dragging the Node-only providers in with it.
 */
export const authConfig = {
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    // Credentials sign-in requires JWT sessions.
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,
  },
  providers: [], // filled in by src/auth.ts on the Node runtime
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.organizationId = (user as { organizationId?: string }).organizationId;
      }
      return token;
    },
    session({ session, token }) {
      if (token.userId) session.user.id = token.userId as string;
      if (token.organizationId) {
        session.user.organizationId = token.organizationId as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

import type { DefaultSession } from 'next-auth';

/**
 * The session carries organizationId so every query can be tenant-scoped without
 * a extra round trip to look up which company the user belongs to.
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      organizationId: string;
    } & DefaultSession['user'];
  }

  interface User {
    organizationId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    organizationId?: string;
  }
}

export {};

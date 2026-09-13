import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { users, accounts, sessions, verificationTokens } from '@/db/schema';
import { authConfig } from './auth.config';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Constant-time-ish login.
 *
 * When the email is unknown we still run a bcrypt comparison against a dummy hash.
 * Returning early would make "no such user" measurably faster than "wrong password",
 * which lets an attacker enumerate who has an account.
 */
const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEeO1234567890abcdefghijklmnopqrstu';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Credentials({
      credentials: {
        email: { label: 'メールアドレス', type: 'email' },
        password: { label: 'パスワード', type: 'password' },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const [user] = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            image: users.image,
            passwordHash: users.passwordHash,
            organizationId: users.organizationId,
            isActive: users.isActive,
          })
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);

        const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

        // Deliberately one message for every failure mode — wrong password, unknown
        // address, and deactivated account must be indistinguishable from outside.
        if (!user || !user.passwordHash || !user.isActive || !ok) return null;

        await db
          .update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, user.id));

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          organizationId: user.organizationId,
        };
      },
    }),
  ],
});

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

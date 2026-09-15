import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import type { Adapter, AdapterUser } from 'next-auth/adapters';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { users, accounts, sessions, verificationTokens, organizations, roles } from '@/db/schema';
import { recordAudit } from '@/lib/audit';
import { SYSTEM_ROLES } from '@/lib/acl/capabilities';
import { slugify } from '@/lib/auth/provision';
import { env } from '@/lib/env';
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

/** Google OAuth is optional; without both halves the provider is simply absent. */
export const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

/**
 * The stock Drizzle adapter inserts only {name, email, emailVerified, image}, but
 * users.organization_id is NOT NULL — an OAuth first sign-in would violate it.
 * Wrapping createUser provisions the organization and its seven roles in the same
 * transaction, so an OAuth user lands fully set up rather than half-created.
 */
function adapterWithProvisioning(): Adapter {
  const base = DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  });

  return {
    ...base,
    async createUser(data) {
      const label = data.name ?? data.email?.split('@')[0] ?? 'マイ組織';
      const companyName = `${label} の組織`;

      return db.transaction(async (tx) => {
        const [org] = await tx
          .insert(organizations)
          .values({ name: companyName, slug: slugify(companyName), plan: 'trial' })
          .returning({ id: organizations.id });

        const roleRows = await tx
          .insert(roles)
          .values(
            Object.values(SYSTEM_ROLES).map((preset) => ({
              organizationId: org!.id,
              slug: preset.slug,
              name: preset.nameJa,
              description: preset.descriptionJa,
              capabilities: [...preset.capabilities],
              isSystem: true,
            })),
          )
          .returning({ id: roles.id, slug: roles.slug });

        const [user] = await tx
          .insert(users)
          .values({
            name: data.name,
            email: data.email,
            emailVerified: data.emailVerified,
            image: data.image,
            organizationId: org!.id,
            defaultRoleId: roleRows.find((r) => r.slug === 'owner')!.id,
          })
          .returning();

        return user as AdapterUser;
      });
    },
  };
}

const providers: NextAuthConfig['providers'] = [
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
          // 会社ごと停止されている場合も入れない。運営が契約を止めたのに
          // 社員が個別にログインできてしまう状態を作らないため。
          organizationIsActive: organizations.isActive,
        })
        .from(users)
        .innerJoin(organizations, eq(organizations.id, users.organizationId))
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

      // Deliberately one outcome for every failure mode — wrong password, unknown
      // address, and deactivated account must be indistinguishable from outside.
      if (!user || !user.passwordHash || !user.isActive || !user.organizationIsActive || !ok) {
        /*
         * 失敗も記録する。「誰かが心当たりのない時刻に入ろうとしている」は
         * お客様から実際に聞かれることで、記録がないと答えられない。
         * ただし存在しないメールアドレスは会社を特定できないため記録しない
         * （監査ログは会社に属する）。
         */
        if (user) {
          await recordAudit({
            organizationId: user.organizationId,
            actorId: user.id,
            actorEmail: user.email,
            actorName: user.name,
            action: 'auth.login_failed',
            targetType: 'user',
            targetId: user.id,
            targetLabel: user.email,
            metadata: {
              reason: !user.passwordHash
                ? 'no_password'
                : !user.isActive
                  ? 'user_suspended'
                  : !user.organizationIsActive
                    ? 'organization_suspended'
                    : 'bad_password',
            },
          });
        }
        return null;
      }

      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

      await recordAudit({
        organizationId: user.organizationId,
        actorId: user.id,
        actorEmail: user.email,
        actorName: user.name,
        action: 'auth.login',
        targetType: 'user',
        targetId: user.id,
        targetLabel: user.email,
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        organizationId: user.organizationId,
      };
    },
  }),
];

if (googleEnabled) {
  providers.push(
    Google({
      clientId: env.GOOGLE_CLIENT_ID!,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: false,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: adapterWithProvisioning(),
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      if (user) {
        token.userId = user.id;
        token.organizationId = (user as { organizationId?: string }).organizationId;
      }
      // OAuth sign-in returns the adapter user, which may not carry our column
      // through; read it back once so the session always has a tenant.
      if (token.userId && !token.organizationId) {
        const [row] = await db
          .select({ organizationId: users.organizationId })
          .from(users)
          .where(eq(users.id, token.userId as string))
          .limit(1);
        if (row) token.organizationId = row.organizationId;
      }
      if (trigger === 'update') {
        const [row] = await db
          .select({ organizationId: users.organizationId })
          .from(users)
          .where(eq(users.id, token.userId as string))
          .limit(1);
        if (row) token.organizationId = row.organizationId;
      }
      return token;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user?.id) return;
      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    },
  },
});

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

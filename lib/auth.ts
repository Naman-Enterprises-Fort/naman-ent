import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { z } from 'zod';
import { clearFailedLogins, isAccountLocked, recordFailedLogin } from '@/lib/account-lockout';
import { prisma } from '@/lib/db';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession['user'];
    tokenVersion?: number;
  }

  interface User {
    role?: string;
    tokenVersion?: number;
  }

  interface JWT {
    id?: string;
    role?: string;
    tokenVersion?: number;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: false,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });

        // Don't tally failed-login attempts for non-existent / blocked /
        // deleted / OAuth-only accounts — incrementing here would leak
        // existence (an attacker could measure lockout to enumerate).
        if (!user?.passwordHash || user.isBlocked || user.deletedAt) return null;

        // Per-account lockout (Sprint 2 polish): 5 failures in 10 min puts
        // the account in a cooldown. Returns the same generic null as a
        // wrong password — no account-state signal to the caller.
        if (await isAccountLocked(email)) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          await recordFailedLogin(email);
          return null;
        }

        await clearFailedLogins(email);
        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? 'CUSTOMER';
        token.tokenVersion = user.tokenVersion ?? 0;
      }
      // Allow `useSession().update()` from the client to pull the latest
      // tokenVersion / role after a revoke or role change.
      if (trigger === 'update' && token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { tokenVersion: true, role: true },
        });
        if (fresh) {
          token.tokenVersion = fresh.tokenVersion;
          token.role = fresh.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? token.sub ?? '';
        session.user.role = (token.role as string) ?? 'CUSTOMER';
      }
      session.tokenVersion = (token.tokenVersion as number) ?? 0;
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (!user?.id) return;
      // Lazy imports to defuse the lib/auth ↔ lib/services/* cycle.
      const [{ recordLoginEvent }, { mergeGuestCartIntoUser }, { readCartSessionId }] =
        await Promise.all([
          import('@/lib/services/auth'),
          import('@/lib/services/cart'),
          import('@/lib/cart-cookie'),
        ]);
      try {
        await recordLoginEvent({ userId: user.id, provider: account?.provider });
      } catch {
        // Audit failure must never block sign-in.
      }
      try {
        const sessionId = await readCartSessionId();
        await mergeGuestCartIntoUser({ userId: user.id, sessionId });
      } catch {
        // Cart merge must never block sign-in.
      }
    },
  },
});

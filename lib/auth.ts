import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { z } from 'zod';
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
        if (!user?.passwordHash || user.isBlocked || user.deletedAt) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

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
      // Lazy import to defuse the lib/auth ↔ lib/services/auth cycle.
      const mod = await import('@/lib/services/auth');
      try {
        await mod.recordLoginEvent({ userId: user.id, provider: account?.provider });
      } catch {
        // Audit failure must never block sign-in.
      }
    },
  },
});

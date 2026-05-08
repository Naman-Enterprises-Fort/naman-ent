import 'server-only';
import type { UserRole } from '@prisma/client';
import { headers } from 'next/headers';
import type { Session } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export class AuthError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface AuthedSession {
  user: {
    id: string;
    role: UserRole;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
  tokenVersion: number;
  expires: string;
}

function narrow(session: Session | null): AuthedSession | null {
  if (!session?.user?.id) return null;
  return {
    user: {
      id: session.user.id,
      role: session.user.role as UserRole,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
    },
    tokenVersion: session.tokenVersion ?? 0,
    expires: session.expires,
  };
}

export async function getSession(): Promise<AuthedSession | null> {
  // `auth` is an overloaded NextAuth helper — when called with no args it
  // resolves to `Session | null`. Cast to disambiguate from the middleware overload.
  const raw = (await auth()) as Session | null;
  return narrow(raw);
}

/** Returns the current session or throws AuthError(401). */
export async function requireSession(): Promise<AuthedSession> {
  const session = await getSession();
  if (!session) throw new AuthError(401, 'Sign in required');
  return session;
}

/**
 * Returns the current session, but ALSO checks that the JWT's tokenVersion
 * still matches the user record. Used for sensitive routes (account settings,
 * checkout, password change). Catches "log out everywhere" + blocked accounts.
 */
export async function requireFreshSession(): Promise<AuthedSession> {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tokenVersion: true, isBlocked: true, deletedAt: true, role: true },
  });
  if (!user || user.deletedAt) throw new AuthError(401, 'Account unavailable');
  if (user.isBlocked) throw new AuthError(403, 'Account is blocked');
  if (user.tokenVersion !== session.tokenVersion) {
    throw new AuthError(401, 'Session expired — please sign in again');
  }
  // Reflect latest role in case it changed since the JWT was minted.
  return { ...session, user: { ...session.user, role: user.role } };
}

export async function requireRole(...roles: UserRole[]): Promise<AuthedSession> {
  const session = await requireFreshSession();
  if (!roles.includes(session.user.role)) {
    throw new AuthError(403, 'Insufficient permissions');
  }
  return session;
}

export async function getRequestMeta(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
}> {
  const h = await headers();
  const ua = h.get('user-agent');
  const fwd = h.get('x-forwarded-for');
  const ip = fwd?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null;
  return { ipAddress: ip, userAgent: ua };
}

export async function recordLoginEvent(params: {
  userId: string;
  kind?: 'LOGIN' | 'LOGOUT' | 'REVOKE_ALL';
  provider?: string | null;
}): Promise<void> {
  const { userId, kind = 'LOGIN', provider = null } = params;
  const { ipAddress, userAgent } = await getRequestMeta();
  await prisma.userLoginEvent.create({
    data: { userId, kind, provider, ipAddress, userAgent },
  });
  if (kind === 'LOGIN') {
    await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  }
}

/** Bumps tokenVersion (kicks every device out on next sensitive call) + records audit row. */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
  await prisma.userLoginEvent.create({
    data: { userId, kind: 'REVOKE_ALL' },
  });
}

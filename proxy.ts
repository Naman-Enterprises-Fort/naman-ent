import { auth } from '@/lib/auth';

/**
 * Next.js 16 proxy (formerly `middleware.ts`). Phase 1 stub: protects
 * /admin and /account by redirecting unauthenticated users to /login.
 *
 * `/checkout` is intentionally NOT gated — guest checkout is allowed
 * (SRS §6.5.1). The success page handles signed-out viewers by hiding
 * the "view order details" link.
 *
 * Sprint 2 expanded this to full RBAC by checking `session.user.role`
 * against route requirements; Sprint 5 adds the rest of the admin gate.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = pathname.startsWith('/admin') || pathname.startsWith('/account');

  if (!isProtected) return;

  if (!req.auth) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ['/admin/:path*', '/account/:path*'],
};

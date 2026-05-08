import { auth } from '@/lib/auth';

/**
 * Next.js 16 proxy (formerly `middleware.ts`). Phase 1 stub: protects
 * /admin, /account, and /checkout routes by redirecting unauthenticated
 * users to /login. Sprint 2 expands this to full RBAC by checking
 * `session.user.role` against route requirements.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/checkout');

  if (!isProtected) return;

  if (!req.auth) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ['/admin/:path*', '/account/:path*', '/checkout/:path*'],
};

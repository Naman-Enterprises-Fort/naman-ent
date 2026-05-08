/** Extracts the best-guess client IP from forwarding headers. Falls back to "unknown". */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  const first = fwd?.split(',')[0]?.trim();
  return first || req.headers.get('x-real-ip') || 'unknown';
}

/** App URL with no trailing slash. Always returns a string (default: localhost). */
export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

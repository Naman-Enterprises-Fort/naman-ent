import { redirect } from 'next/navigation';

/**
 * `/admin` has no UI of its own — it's a convenience entry point that
 * forwards to the real dashboard. The proxy will have already redirected
 * unauthenticated visitors to /login by the time this runs.
 */
export default function AdminRootPage(): never {
  redirect('/admin/dashboard');
}

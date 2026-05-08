import { ChangePasswordForm } from '@/components/account/change-password-form';
import { SessionsPanel } from '@/components/account/sessions-panel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/services/auth';

export const metadata = { title: 'Security' };
export const dynamic = 'force-dynamic';

export default async function SecurityPage() {
  const session = await requireSession();

  const [user, eventsRaw] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true, email: true, emailVerified: true },
    }),
    prisma.userLoginEvent.findMany({
      where: { userId: session.user.id, kind: 'LOGIN' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, provider: true, ipAddress: true, userAgent: true, createdAt: true },
    }),
  ]);

  const events = eventsRaw.map((e) => ({
    id: e.id,
    provider: e.provider,
    ipAddress: e.ipAddress,
    userAgent: e.userAgent,
    createdAt: e.createdAt.toISOString(),
  }));

  const hasPassword = !!user?.passwordHash;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">Security</h1>
        <p className="text-muted-foreground text-sm">
          Manage your password and review devices that have signed in.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Change password</CardTitle>
          <CardDescription>
            {hasPassword
              ? 'Updating your password will sign you out of every device.'
              : 'Your account uses Google sign-in. Use forgot-password to set a password.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasPassword ? (
            <ChangePasswordForm />
          ) : (
            <p className="text-muted-foreground text-sm">No password set on this account.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active sessions</CardTitle>
          <CardDescription>
            Recent sign-ins from any device. If anything looks wrong, sign out everywhere.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SessionsPanel initial={events} />
        </CardContent>
      </Card>
    </div>
  );
}

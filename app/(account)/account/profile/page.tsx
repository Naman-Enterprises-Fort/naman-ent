import { ProfileForm } from '@/components/account/profile-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/services/auth';

export const metadata = { title: 'Profile' };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, phone: true, email: true },
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm">
          Update the details we use on your account and orders.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personal details</CardTitle>
          <CardDescription>
            Name and mobile appear on your invoices and tracking updates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initial={{
              name: user?.name ?? '',
              phone: user?.phone ?? null,
              email: user?.email ?? '',
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

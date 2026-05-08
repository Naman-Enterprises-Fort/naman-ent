import { MailCheck, MailWarning, MapPin, Package, ShieldCheck, User } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/services/auth';

export const metadata = { title: 'Account overview' };
export const dynamic = 'force-dynamic';

export default async function AccountOverviewPage() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      emailVerified: true,
      addresses: { select: { id: true } },
      orders: { select: { id: true } },
    },
  });

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const verified = !!user?.emailVerified;
  const addressCount = user?.addresses.length ?? 0;
  const orderCount = user?.orders.length ?? 0;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-semibold text-3xl tracking-tight">Hi, {firstName}</h1>
        <p className="text-muted-foreground text-sm">
          Manage your profile, orders, addresses, and account security.
        </p>
      </header>

      {!verified && user?.email ? (
        <Card className="border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20">
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <MailWarning className="mt-0.5 size-5 text-amber-700 dark:text-amber-400" aria-hidden />
            <div className="space-y-1.5">
              <CardTitle className="text-base">Confirm your email</CardTitle>
              <CardDescription>
                We sent a verification link to <strong>{user.email}</strong>. You'll need to verify
                before you can check out.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Link
              href="/verify-email"
              className="font-medium text-amber-800 text-sm hover:underline dark:text-amber-300"
            >
              Resend verification link →
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <section aria-labelledby="quick-actions" className="space-y-3">
        <h2 id="quick-actions" className="font-semibold text-sm tracking-tight">
          Quick actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <QuickCard
            href="/account/profile"
            icon={<User className="size-5" aria-hidden />}
            title="Profile"
            description={user?.name ? user.name : 'Add your name and phone number'}
          />
          <QuickCard
            href="/account/orders"
            icon={<Package className="size-5" aria-hidden />}
            title="Orders"
            description={
              orderCount === 0
                ? 'No orders yet'
                : `${orderCount} order${orderCount === 1 ? '' : 's'}`
            }
          />
          <QuickCard
            href="/account/addresses"
            icon={<MapPin className="size-5" aria-hidden />}
            title="Addresses"
            description={
              addressCount === 0
                ? 'Add a delivery address'
                : `${addressCount} saved address${addressCount === 1 ? '' : 'es'}`
            }
          />
          <QuickCard
            href="/account/security"
            icon={<ShieldCheck className="size-5" aria-hidden />}
            title="Security"
            description={verified ? 'Email verified' : 'Email not verified'}
            descriptionIcon={
              verified ? (
                <MailCheck className="size-3.5 text-emerald-600" aria-hidden />
              ) : (
                <MailWarning className="size-3.5 text-amber-600" aria-hidden />
              )
            }
          />
        </div>
      </section>
    </div>
  );
}

function QuickCard({
  href,
  icon,
  title,
  description,
  descriptionIcon,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  descriptionIcon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-lg border bg-card p-4 transition-colors hover:border-foreground/30 hover:bg-accent"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 place-items-center rounded-md bg-muted text-muted-foreground group-hover:bg-foreground group-hover:text-background">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-medium text-sm">{title}</p>
          <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
            {descriptionIcon}
            <span className="truncate">{description}</span>
          </p>
        </div>
      </div>
    </Link>
  );
}

import { ArrowLeftRight, FileCheck, PackageOpen } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireSession } from '@/lib/services/auth';

export const metadata: Metadata = {
  title: 'Returns',
  description: 'Start a return or replacement on an eligible order.',
};

export const dynamic = 'force-dynamic';

const PHASE_2 = [
  {
    icon: PackageOpen,
    title: 'Start a return from any order',
    body: 'Pick the item, choose the reason, and we’ll arrange a reverse pickup with your courier.',
  },
  {
    icon: ArrowLeftRight,
    title: 'Replacements + exchanges',
    body: 'Swap to a different size or colour without going through a refund cycle.',
  },
  {
    icon: FileCheck,
    title: 'Live return status',
    body: 'Track pickup, QC inspection, and refund timeline from this page once a return is open.',
  },
] as const;

export default async function ReturnsPage() {
  await requireSession();

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-semibold text-3xl tracking-tight">Returns</h1>
        <p className="text-muted-foreground text-sm">
          The self-service return flow lands in Phase 2.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
            <ArrowLeftRight aria-hidden className="size-5" />
          </span>
          <div className="space-y-1">
            <CardTitle className="text-lg">Need to return something now?</CardTitle>
            <CardDescription>
              Email{' '}
              <a href="mailto:support@naman-ent.example" className="underline">
                support@naman-ent.example
              </a>{' '}
              with your order number and we’ll arrange a pickup. Self-service returns are coming
              with the Phase-2 reverse-logistics integration.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="grid gap-4 sm:grid-cols-3">
            {PHASE_2.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex flex-col gap-2 rounded-md border bg-card p-4">
                <Icon aria-hidden className="size-4 text-muted-foreground" />
                <p className="font-medium text-sm">{title}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">{body}</p>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/account/orders">View your orders</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/returns">Read return policy</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

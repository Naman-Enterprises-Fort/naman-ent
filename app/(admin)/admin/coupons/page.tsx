import { ArrowUpRight, Percent, Sparkles, Tag, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireRole } from '@/lib/services/auth';

export const metadata = { title: 'Admin · Coupons' };
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PHASE_2_FEATURES = [
  {
    icon: Percent,
    title: 'Percent + fixed-amount discounts',
    body: 'Stackable rules with min-spend, max-discount, and per-customer caps.',
  },
  {
    icon: Tag,
    title: 'Category + product targeting',
    body: 'Restrict a code to specific brands, categories, or SKUs — first-order-only, sale-eligible, BOGO.',
  },
  {
    icon: Users,
    title: 'Single-use + new-customer codes',
    body: 'Unique-per-user redemptions backed by the CouponUsage audit trail.',
  },
  {
    icon: Sparkles,
    title: 'Automatic vs manual codes',
    body: 'Auto-apply offers on the cart page or hand out shareable codes for marketing campaigns.',
  },
] as const;

export default async function AdminCouponsPage() {
  await requireRole('MARKETING_MANAGER', 'SUPER_ADMIN');

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-3xl tracking-tight">Coupons</h1>
        <p className="text-muted-foreground text-sm">
          Discount codes, automatic offers, and stackable rules — landing in Phase 2.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles aria-hidden className="size-5" />
              Coupon engine — Phase 2
            </CardTitle>
            <CardDescription>
              The order schema already reserves a{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">discountTotal</code>{' '}
              line, so wiring in redemption is additive once the engine ships.
            </CardDescription>
          </div>
          <a
            href="https://github.com/anthropics"
            className="hidden items-center gap-1 text-muted-foreground text-xs hover:text-foreground sm:flex"
          >
            SRS §6.9
            <ArrowUpRight aria-hidden className="size-3" />
          </a>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-4 sm:grid-cols-2">
            {PHASE_2_FEATURES.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="flex gap-3 rounded-md border bg-card p-4 transition-shadow hover:shadow-sm"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon aria-hidden className="size-4" />
                </span>
                <div className="flex flex-col gap-1">
                  <p className="font-medium text-sm">{title}</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

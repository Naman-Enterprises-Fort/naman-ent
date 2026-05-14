import { ArrowUpRight, BarChart3, LineChart, PieChart, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireRole } from '@/lib/services/auth';

export const metadata = { title: 'Admin · Reports' };
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PHASE_5_FEATURES = [
  {
    icon: LineChart,
    title: 'Revenue trends',
    body: 'Daily / weekly / monthly GMV with returns and refunds netted out, broken down by payment method.',
  },
  {
    icon: BarChart3,
    title: 'Top products + categories',
    body: 'Best-sellers by units and revenue, with stock-turn rate and gross margin if cost prices are set.',
  },
  {
    icon: PieChart,
    title: 'Conversion funnel',
    body: 'Sessions → product viewed → added to cart → checkout started → paid, sourced from PostHog + Sentry breadcrumbs.',
  },
  {
    icon: TrendingUp,
    title: 'Cohort + LTV',
    body: 'Repeat-purchase curves, average order value, and customer lifetime value by acquisition month.',
  },
] as const;

export default async function AdminReportsPage() {
  await requireRole('SUPER_ADMIN', 'ORDER_MANAGER');

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-3xl tracking-tight">Reports</h1>
        <p className="text-muted-foreground text-sm">
          Revenue, conversion, and cohort analytics — landing in Sprint 5 alongside the analytics
          stack.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <BarChart3 aria-hidden className="size-5" />
              Reports — Sprint 5
            </CardTitle>
            <CardDescription>
              Connects to Vercel Analytics + GA4 + PostHog + Microsoft Clarity once those land in
              Sprint 5D. Phase-1 dashboards stay deliberately thin to ship faster.
            </CardDescription>
          </div>
          <a
            href="https://github.com/anthropics"
            className="hidden items-center gap-1 text-muted-foreground text-xs hover:text-foreground sm:flex"
          >
            SRS §11
            <ArrowUpRight aria-hidden className="size-3" />
          </a>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-4 sm:grid-cols-2">
            {PHASE_5_FEATURES.map(({ icon: Icon, title, body }) => (
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

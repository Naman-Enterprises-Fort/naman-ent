import { MessageSquare, Star, ThumbsUp } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireSession } from '@/lib/services/auth';

export const metadata: Metadata = {
  title: 'Reviews',
  description: 'Manage the reviews you’ve written and rate your past purchases.',
};

export const dynamic = 'force-dynamic';

const PHASE_2 = [
  {
    icon: Star,
    title: 'Rate your past purchases',
    body: 'Star ratings, optional text, and verified-buyer badges sourced from your order history.',
  },
  {
    icon: MessageSquare,
    title: 'Q&A on product pages',
    body: 'Ask the seller (or other buyers) about a product, and answer questions from yours.',
  },
  {
    icon: ThumbsUp,
    title: 'Helpful-vote signals',
    body: 'Upvote reviews that helped you decide; the most useful float to the top of the PDP.',
  },
] as const;

export default async function ReviewsPage() {
  await requireSession();

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-semibold text-3xl tracking-tight">Reviews</h1>
        <p className="text-muted-foreground text-sm">
          Star ratings, written reviews, and Q&A — landing in Phase 2.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
            <Star aria-hidden className="size-5" />
          </span>
          <div className="space-y-1">
            <CardTitle className="text-lg">Reviews are coming in Phase 2</CardTitle>
            <CardDescription>
              The product schema already reserves room for ratings + Q&A so wiring them in is
              additive. Until then, your orders page is the source of truth for what you’ve bought.
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
              <Link href="/">Continue shopping</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

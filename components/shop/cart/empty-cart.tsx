import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function EmptyCart({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? 'flex flex-col items-center justify-center gap-3 py-12 text-center'
          : 'flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-muted/20 px-6 py-16 text-center'
      }
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <ShoppingBag aria-hidden className="size-6" />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-base">Your cart is empty</h2>
        <p className="text-muted-foreground text-sm">
          Browse the catalog and add a product to get started.
        </p>
      </div>
      <Button asChild size="sm">
        <Link href="/">Continue shopping</Link>
      </Button>
    </div>
  );
}

import { Package } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const metadata = { title: 'Orders' };

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">Orders</h1>
        <p className="text-muted-foreground text-sm">
          Track every order, download invoices, and start a return — all in one place.
        </p>
      </header>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <Package aria-hidden className="size-5" />
          </span>
          <div className="space-y-1">
            <p className="font-medium">No orders yet</p>
            <p className="text-muted-foreground text-sm">
              When you place your first order, you'll see its status, tracking, and invoice here.
            </p>
          </div>
          <Button asChild>
            <Link href="/">Start shopping</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

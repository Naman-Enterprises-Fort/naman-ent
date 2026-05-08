import { LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CategoryNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <LayoutGrid aria-hidden className="size-10 text-muted-foreground" />
      <h1 className="font-semibold text-2xl tracking-tight">Category not found</h1>
      <p className="text-muted-foreground text-sm">
        We couldn’t find that category. Browse all categories or use search to find what you’re
        after.
      </p>
      <div className="mt-2 flex gap-3">
        <Button asChild>
          <Link href="/category">All categories</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/search">Search</Link>
        </Button>
      </div>
    </div>
  );
}

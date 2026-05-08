import { PackageOpen } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ProductNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <PackageOpen aria-hidden className="size-10 text-muted-foreground" />
      <h1 className="font-semibold text-2xl tracking-tight">Product not found</h1>
      <p className="text-muted-foreground text-sm">
        The product you’re looking for may have been moved, archived, or never existed.
      </p>
      <div className="mt-2 flex gap-3">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/search">Search the catalog</Link>
        </Button>
      </div>
    </div>
  );
}

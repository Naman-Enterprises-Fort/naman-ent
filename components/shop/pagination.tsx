import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Pagination({
  page,
  pageCount,
  buildHref,
}: {
  page: number;
  pageCount: number;
  buildHref: (n: number) => string;
}) {
  if (pageCount <= 1) return null;

  const window = 1;
  const pages: (number | 'ellipsis')[] = [];
  for (let i = 1; i <= pageCount; i++) {
    if (i === 1 || i === pageCount || (i >= page - window && i <= page + window)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== 'ellipsis') {
      pages.push('ellipsis');
    }
  }

  const linkClass =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-md border bg-background px-3 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground';
  const activeClass = 'border-foreground bg-foreground text-background hover:bg-foreground/90';
  const disabledClass = 'pointer-events-none opacity-50';

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5">
      <Link
        href={buildHref(Math.max(1, page - 1))}
        className={cn(linkClass, page === 1 && disabledClass)}
        aria-label="Previous page"
        rel="prev"
      >
        <ChevronLeft aria-hidden className="size-4" />
      </Link>
      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e-${i}`} aria-hidden className="px-1.5 text-muted-foreground text-sm">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(linkClass, p === page && activeClass)}
          >
            {p}
          </Link>
        ),
      )}
      <Link
        href={buildHref(Math.min(pageCount, page + 1))}
        className={cn(linkClass, page === pageCount && disabledClass)}
        aria-label="Next page"
        rel="next"
      >
        <ChevronRight aria-hidden className="size-4" />
      </Link>
    </nav>
  );
}

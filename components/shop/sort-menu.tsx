'use client';

import { ArrowUpDown, Check } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Customer rating' },
  { value: 'popular', label: 'Most popular' },
] as const;

type SortValue = (typeof OPTIONS)[number]['value'];

export function SortMenu({ defaultValue = 'relevance' }: { defaultValue?: SortValue }) {
  const router = useRouter();
  const params = useSearchParams();
  const current = (params.get('sort') as SortValue) ?? defaultValue;
  const [pending, start] = useTransition();

  function setSort(v: SortValue) {
    const next = new URLSearchParams(params.toString());
    if (v === defaultValue) next.delete('sort');
    else next.set('sort', v);
    next.delete('page');
    start(() => router.push(`?${next.toString()}`, { scroll: false }));
  }

  const label = OPTIONS.find((o) => o.value === current)?.label ?? 'Relevance';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending} className="gap-2">
          <ArrowUpDown aria-hidden className="size-4" />
          <span className="hidden sm:inline">Sort:</span>
          <span className="font-medium">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((o) => (
          <DropdownMenuItem
            key={o.value}
            onSelect={() => setSort(o.value)}
            className="justify-between"
          >
            {o.label}
            {current === o.value && <Check aria-hidden className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

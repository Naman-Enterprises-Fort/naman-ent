'use client';

import { Search as SearchIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function SearchBar({
  initial,
  className,
  placeholder = 'Search smartphones, laptops, audio, more...',
  size = 'md',
}: {
  initial?: string;
  className?: string;
  placeholder?: string;
  size?: 'sm' | 'md';
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial ?? '');

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <search aria-label="Search products" className={cn('block w-full', className)}>
      <form onSubmit={onSubmit} className="relative flex w-full items-center">
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
        />
        <Input
          type="search"
          name="q"
          autoComplete="off"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'pl-9',
            size === 'md' && 'h-10 rounded-lg text-sm',
            size === 'sm' && 'h-9 rounded-md text-sm',
          )}
          aria-label="Search query"
        />
      </form>
    </search>
  );
}

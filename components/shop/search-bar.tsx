'use client';

import { Search as SearchIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Suggestion {
  id: string;
  name: string;
  slug: string;
}

const SUGGEST_DEBOUNCE_MS = 150;

export function SearchBar({
  initial,
  className,
  placeholder = 'Search smartphones, laptops, audio, more...',
  size = 'md',
  suggest = false,
}: {
  initial?: string;
  className?: string;
  placeholder?: string;
  size?: 'sm' | 'md';
  suggest?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial ?? '');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchSuggestions = useCallback(async (term: string) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch(`/api/search?mode=suggest&q=${encodeURIComponent(term)}&limit=6`, {
        signal: ac.signal,
      });
      if (!res.ok) return;
      const data = (await res.json()) as { suggestions?: Suggestion[] };
      setSuggestions(data.suggestions ?? []);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    if (!suggest) return;
    const term = q.trim();
    if (term.length < 2) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(term), SUGGEST_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, suggest, fetchSuggestions]);

  useEffect(() => {
    if (!suggest) return;
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [suggest]);

  function go(slug: string) {
    setOpen(false);
    setActiveIndex(-1);
    router.push(`/products/${slug}`);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    if (suggest && activeIndex >= 0 && activeIndex < suggestions.length) {
      const picked = suggestions[activeIndex];
      if (picked) {
        go(picked.slug);
        return;
      }
    }
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!suggest) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length === 0) return;
      setOpen(true);
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length === 0) return;
      setOpen(true);
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  }

  const showDropdown = suggest && open && q.trim().length >= 2 && suggestions.length > 0;

  return (
    <search aria-label="Search products" className={cn('block w-full', className)}>
      <div ref={containerRef} className="relative w-full">
        <form onSubmit={onSubmit} className="relative flex w-full items-center">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
          />
          <Input
            ref={inputRef}
            type="search"
            name="q"
            autoComplete="off"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActiveIndex(-1);
              if (suggest) setOpen(true);
            }}
            onFocus={() => suggest && q.trim().length >= 2 && setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className={cn(
              'pl-9',
              size === 'md' && 'h-10 rounded-lg text-sm',
              size === 'sm' && 'h-9 rounded-md text-sm',
            )}
            aria-label="Search query"
            role={suggest ? 'combobox' : undefined}
            aria-expanded={suggest ? showDropdown : undefined}
            aria-controls={suggest ? listboxId : undefined}
            aria-autocomplete={suggest ? 'list' : undefined}
            aria-activedescendant={
              suggest && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
            }
          />
        </form>
        {showDropdown ? (
          <div
            id={listboxId}
            role="listbox"
            className="absolute top-full left-0 z-50 mt-1 max-h-80 w-full overflow-auto rounded-md border bg-popover shadow-md"
          >
            {suggestions.map((s, i) => (
              <div
                key={s.id}
                id={`${listboxId}-opt-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                tabIndex={-1}
              >
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent',
                    i === activeIndex && 'bg-accent',
                  )}
                  onMouseDown={(e) => {
                    // Prevent input blur before click fires.
                    e.preventDefault();
                  }}
                  onClick={() => go(s.slug)}
                >
                  <SearchIcon aria-hidden className="size-3.5 text-muted-foreground" />
                  <span className="line-clamp-1">{s.name}</span>
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </search>
  );
}

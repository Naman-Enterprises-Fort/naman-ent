'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export type Facet = { id: string; name: string; slug: string; count: number };

export function FilterSidebar({
  brandFacets,
  className,
}: {
  brandFacets: Facet[];
  className?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const selectedBrands = params.getAll('brand');
  const minPrice = params.get('minPrice') ?? '';
  const maxPrice = params.get('maxPrice') ?? '';
  const inStock = params.get('inStock') === 'true';

  function toggleBrand(slug: string, checked: boolean) {
    const next = new URLSearchParams();
    for (const [k, v] of params.entries()) {
      if (k === 'brand') continue;
      next.append(k, v);
    }
    const newSet = new Set(selectedBrands);
    if (checked) newSet.add(slug);
    else newSet.delete(slug);
    for (const s of newSet) next.append('brand', s);
    next.delete('page');
    start(() => router.push(`?${next.toString()}`, { scroll: false }));
  }

  function setRange(formData: FormData) {
    const next = new URLSearchParams(params.toString());
    const min = String(formData.get('minPrice') ?? '');
    const max = String(formData.get('maxPrice') ?? '');
    min ? next.set('minPrice', min) : next.delete('minPrice');
    max ? next.set('maxPrice', max) : next.delete('maxPrice');
    next.delete('page');
    start(() => router.push(`?${next.toString()}`, { scroll: false }));
  }

  function toggleStock(checked: boolean) {
    const next = new URLSearchParams(params.toString());
    if (checked) next.set('inStock', 'true');
    else next.delete('inStock');
    next.delete('page');
    start(() => router.push(`?${next.toString()}`, { scroll: false }));
  }

  function clearAll() {
    const next = new URLSearchParams();
    const q = params.get('q');
    const sort = params.get('sort');
    if (q) next.set('q', q);
    if (sort) next.set('sort', sort);
    start(() => router.push(`?${next.toString()}`, { scroll: false }));
  }

  const hasFilters = selectedBrands.length > 0 || minPrice || maxPrice || inStock;

  return (
    <aside
      aria-label="Product filters"
      data-pending={pending}
      className={`flex flex-col gap-6 ${className ?? ''}`}
    >
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm">Filters</p>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-7 px-2 text-muted-foreground text-xs"
          >
            Clear all
          </Button>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <p className="font-medium text-sm">Availability</p>
        <Label className="flex items-center gap-2 font-normal text-sm">
          <Checkbox
            checked={inStock}
            onCheckedChange={(v) => toggleStock(Boolean(v))}
            aria-label="In stock only"
          />
          In stock only
        </Label>
      </section>

      <Separator />

      <section className="flex flex-col gap-3">
        <p className="font-medium text-sm">Price range</p>
        <form action={setRange} className="grid grid-cols-2 gap-2">
          <input
            type="number"
            inputMode="numeric"
            name="minPrice"
            placeholder="Min ₹"
            defaultValue={minPrice}
            min={0}
            className="h-9 rounded-md border bg-background px-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <input
            type="number"
            inputMode="numeric"
            name="maxPrice"
            placeholder="Max ₹"
            defaultValue={maxPrice}
            min={0}
            className="h-9 rounded-md border bg-background px-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="col-span-2"
            disabled={pending}
          >
            Apply
          </Button>
        </form>
      </section>

      {brandFacets.length > 0 && (
        <>
          <Separator />
          <section className="flex flex-col gap-3">
            <p className="font-medium text-sm">Brand</p>
            <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {brandFacets.map((b) => {
                const checked = selectedBrands.includes(b.slug);
                return (
                  <li key={b.id}>
                    <Label className="flex items-center justify-between gap-2 font-normal text-sm">
                      <span className="flex items-center gap-2">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => toggleBrand(b.slug, Boolean(v))}
                          aria-label={`Filter by ${b.name}`}
                        />
                        {b.name}
                      </span>
                      <span className="text-muted-foreground text-xs">{b.count}</span>
                    </Label>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </aside>
  );
}

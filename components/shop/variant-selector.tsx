'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

type Variant = {
  id: string;
  sku: string;
  name: string | null;
  attributes: Record<string, unknown>;
  price: { toString: () => string };
  stock: number;
};

export function VariantSelector({
  variants,
  selectedId,
  onSelect,
}: {
  variants: Variant[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  // Group variants by attribute keys (color, storage, ram...) so we render one row per axis.
  const axes = useMemo(() => {
    const keys = new Set<string>();
    for (const v of variants) {
      for (const k of Object.keys(v.attributes ?? {})) keys.add(k);
    }
    return Array.from(keys);
  }, [variants]);

  if (variants.length <= 1) return null;

  // No axes (e.g. SKU-only variants) — fall back to a flat list of SKUs.
  if (axes.length === 0) {
    return (
      <fieldset className="flex flex-col gap-2">
        <legend className="font-medium text-sm">Variants</legend>
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => (
            <Pill
              key={v.id}
              selected={v.id === selectedId}
              disabled={v.stock <= 0}
              onSelect={() => onSelect(v.id)}
              label={v.name ?? v.sku}
            />
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {axes.map((axis) => {
        const seen = new Map<string, Variant>();
        for (const v of variants) {
          const val = String((v.attributes as Record<string, unknown>)?.[axis] ?? '');
          if (val && !seen.has(val)) seen.set(val, v);
        }
        const selectedVal = String(
          (variants.find((v) => v.id === selectedId)?.attributes as Record<string, unknown>)?.[
            axis
          ] ?? '',
        );
        return (
          <fieldset key={axis} className="flex flex-col gap-2">
            <legend className="font-medium text-sm capitalize">{axis}</legend>
            <div className="flex flex-wrap gap-2">
              {Array.from(seen.entries()).map(([val, exemplar]) => (
                <Pill
                  key={val}
                  selected={val === selectedVal}
                  disabled={exemplar.stock <= 0}
                  onSelect={() => onSelect(exemplar.id)}
                  label={val}
                />
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

function Pill({
  selected,
  disabled,
  onSelect,
  label,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        'inline-flex h-9 min-w-12 items-center justify-center rounded-md border bg-background px-3 font-medium text-sm transition-colors',
        selected
          ? 'border-foreground bg-foreground text-background'
          : 'hover:border-muted-foreground',
        disabled && 'cursor-not-allowed line-through opacity-40',
      )}
    >
      {label}
    </button>
  );
}

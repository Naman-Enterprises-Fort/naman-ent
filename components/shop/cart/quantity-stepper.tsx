'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  disabled = false,
  size = 'sm',
  className,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const decDisabled = disabled || value <= min;
  const incDisabled = disabled || value >= max;
  const dim = size === 'sm' ? 'h-8' : 'h-9';

  return (
    <fieldset
      className={cn(
        'inline-flex items-center overflow-hidden rounded-md border bg-background p-0',
        dim,
        className,
      )}
    >
      <legend className="sr-only">Quantity</legend>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={decDisabled}
        onClick={() => onChange(value - 1)}
        className={cn(
          'flex aspect-square items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
          dim,
        )}
      >
        <Minus aria-hidden className="size-3.5" />
      </button>
      <span aria-live="polite" className="min-w-8 text-center font-medium text-sm tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={incDisabled}
        onClick={() => onChange(value + 1)}
        className={cn(
          'flex aspect-square items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
          dim,
        )}
      >
        <Plus aria-hidden className="size-3.5" />
      </button>
    </fieldset>
  );
}

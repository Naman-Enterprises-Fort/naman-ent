'use client';

import { Bookmark, BookmarkCheck, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cloudinaryLoader } from '@/lib/cloudinary';
import { useRemoveCartItem, useUpdateCartItem } from '@/lib/hooks/use-cart';
import { formatINR, fromPaise } from '@/lib/money';
import type { CartLineView } from '@/lib/services/cart';
import { cn } from '@/lib/utils';
import { QuantityStepper } from './quantity-stepper';

const PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MDAgNDAwIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YxZjVmOSIvPjwvc3ZnPg==';

export function CartLine({
  line,
  variant,
  highlighted = false,
}: {
  line: CartLineView;
  variant: 'mini' | 'page';
  highlighted?: boolean;
}) {
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();

  const isMini = variant === 'mini';
  const stockOut = line.stock <= 0;
  const overStock = !line.inStock && !stockOut;
  const errorMsg = stockOut
    ? 'Out of stock'
    : overStock
      ? `Only ${line.stock} available`
      : update.error
        ? update.error.message
        : remove.error
          ? remove.error.message
          : null;

  const attributesText = Object.entries(line.variantAttributes)
    .map(([k, v]) => `${cap(k)}: ${String(v)}`)
    .join(' · ');

  return (
    <article
      aria-busy={update.isPending || remove.isPending}
      className={cn(
        'group relative flex gap-3 transition-colors',
        isMini ? 'py-3' : 'rounded-lg border bg-card p-3 sm:p-4',
        highlighted && 'ring-2 ring-emerald-500/40 ring-offset-2 ring-offset-background',
      )}
    >
      <Link
        href={`/products/${line.productSlug}`}
        className={cn(
          'relative flex-shrink-0 overflow-hidden rounded-md border bg-muted',
          isMini ? 'size-16' : 'size-20 sm:size-28',
        )}
      >
        {line.imageUrl ? (
          <Image
            loader={cloudinaryLoader}
            src={line.imageUrl}
            alt={line.imageAlt ?? line.productName}
            fill
            sizes={isMini ? '64px' : '120px'}
            className="object-contain"
            placeholder="blur"
            blurDataURL={PLACEHOLDER}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
            No image
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-col gap-0.5">
          {line.brandName && (
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
              {line.brandName}
            </p>
          )}
          <Link
            href={`/products/${line.productSlug}`}
            className="line-clamp-2 font-medium text-sm leading-snug hover:underline"
          >
            {line.productName}
          </Link>
          {attributesText && <p className="text-muted-foreground text-xs">{attributesText}</p>}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-sm">{formatINR(fromPaise(line.unitPricePaise))}</span>
          {line.unitMrpPaise > line.unitPricePaise && (
            <span className="text-[11px] text-muted-foreground line-through">
              {formatINR(fromPaise(line.unitMrpPaise))}
            </span>
          )}
        </div>

        {!line.savedForLater ? (
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <QuantityStepper
              value={line.quantity}
              max={Math.max(line.quantity, line.stock || line.quantity)}
              disabled={update.isPending || remove.isPending || stockOut}
              onChange={(next) => update.mutate({ itemId: line.id, patch: { quantity: next } })}
            />
            <span className="font-semibold text-sm tabular-nums">
              {formatINR(fromPaise(line.pricing.lineTotalPaise))}
            </span>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-[11px] text-muted-foreground">
              Saved for later
            </span>
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
          <button
            type="button"
            disabled={update.isPending}
            onClick={() =>
              update.mutate({ itemId: line.id, patch: { savedForLater: !line.savedForLater } })
            }
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {line.savedForLater ? (
              <>
                <BookmarkCheck aria-hidden className="size-3.5" />
                Move to cart
              </>
            ) : (
              <>
                <Bookmark aria-hidden className="size-3.5" />
                Save for later
              </>
            )}
          </button>
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() => remove.mutate(line.id)}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-muted-foreground hover:bg-accent hover:text-destructive"
          >
            <Trash2 aria-hidden className="size-3.5" />
            Remove
          </button>
        </div>

        {errorMsg && <p className="text-destructive text-xs">{errorMsg}</p>}
      </div>
    </article>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

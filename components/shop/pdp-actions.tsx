'use client';

import { Heart, ShoppingBag, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { discountPct, formatINR } from '@/lib/money';
import { VariantSelector } from './variant-selector';

type Variant = {
  id: string;
  sku: string;
  name: string | null;
  attributes: unknown;
  mrp: { toString: () => string; toNumber?: () => number };
  price: { toString: () => string; toNumber?: () => number };
  stock: number;
  isDefault: boolean;
};

function decimalToNumber(d: { toString: () => string; toNumber?: () => number }): number {
  return d.toNumber ? d.toNumber() : Number(d.toString());
}

export function PdpActions({ variants }: { variants: Variant[] }) {
  const initial = variants.find((v) => v.isDefault) ?? variants[0];
  const [selectedId, setSelectedId] = useState(initial?.id ?? '');
  const selected = useMemo(
    () => variants.find((v) => v.id === selectedId) ?? initial,
    [selectedId, variants, initial],
  );

  if (!selected) {
    return <p className="text-muted-foreground text-sm">No purchasable variant.</p>;
  }

  const price = decimalToNumber(selected.price);
  const mrp = decimalToNumber(selected.mrp);
  const discount = discountPct(mrp, price);
  const stock = selected.stock;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-3">
          <p className="font-semibold text-3xl tracking-tight">{formatINR(price)}</p>
          {price < mrp && (
            <>
              <p className="text-base text-muted-foreground line-through">{formatINR(mrp)}</p>
              {discount && (
                <Badge variant="success" className="text-xs">
                  {discount}% off
                </Badge>
              )}
            </>
          )}
        </div>
        <p className="text-muted-foreground text-xs">Inclusive of all taxes</p>
      </div>

      <VariantSelector
        variants={variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          name: v.name,
          attributes: (v.attributes as Record<string, unknown>) ?? {},
          price: v.price,
          stock: v.stock,
        }))}
        selectedId={selected.id}
        onSelect={setSelectedId}
      />

      <div className="flex flex-col gap-2">
        {stock <= 0 ? (
          <p className="font-medium text-destructive text-sm">Currently out of stock</p>
        ) : stock <= 5 ? (
          <p className="font-medium text-amber-600 text-sm dark:text-amber-400">
            Only {stock} left — order soon
          </p>
        ) : (
          <p className="font-medium text-emerald-700 text-sm dark:text-emerald-400">In stock</p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" disabled={stock <= 0} className="gap-2">
            <ShoppingBag aria-hidden className="size-4" />
            Add to cart
          </Button>
          <Button size="lg" variant="outline" disabled={stock <= 0} className="gap-2">
            <Zap aria-hidden className="size-4" />
            Buy now
          </Button>
        </div>

        <Button variant="ghost" size="sm" className="gap-2 self-start">
          <Heart aria-hidden className="size-4" />
          Save to wishlist
        </Button>
      </div>
    </div>
  );
}

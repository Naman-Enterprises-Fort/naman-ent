'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type GalleryImage = {
  id: string;
  url: string;
  alt: string | null;
};

export function ProductGallery({
  images,
  productName,
}: {
  images: GalleryImage[];
  productName: string;
}) {
  const [active, setActive] = useState(0);
  const main = images[active] ?? images[0];

  if (!main) {
    return (
      <div
        role="img"
        aria-label="No product image"
        className="aspect-square rounded-xl border bg-muted"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      {images.length > 1 && (
        <ol
          aria-label="Product image thumbnails"
          className="order-2 -mx-1 flex flex-row gap-2 overflow-x-auto px-1 lg:order-1 lg:max-h-[520px] lg:flex-col lg:overflow-y-auto"
        >
          {images.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === active ? 'true' : 'false'}
                className={cn(
                  'relative size-16 shrink-0 overflow-hidden rounded-md border bg-muted transition-colors',
                  i === active
                    ? 'border-foreground'
                    : 'border-border hover:border-muted-foreground',
                )}
              >
                <Image
                  src={img.url}
                  alt={img.alt ?? `${productName} thumbnail ${i + 1}`}
                  fill
                  sizes="64px"
                  className="object-contain"
                />
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="relative order-1 aspect-square w-full overflow-hidden rounded-xl border bg-muted lg:order-2 lg:flex-1">
        <Image
          key={main.id}
          src={main.url}
          alt={main.alt ?? productName}
          fill
          sizes="(min-width: 1024px) 640px, 100vw"
          priority
          className="object-contain"
        />
      </div>
    </div>
  );
}

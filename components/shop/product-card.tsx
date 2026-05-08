import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cloudinaryLoader } from '@/lib/cloudinary';
import { discountPct, formatINR } from '@/lib/money';
import type { ProductCard as ProductCardData } from '@/lib/services/catalog';

const PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MDAgNDAwIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YxZjVmOSIvPjwvc3ZnPg==';

export function ProductCard({ product }: { product: ProductCardData }) {
  const variant = product.variants[0];
  const image = product.images[0];
  const discount = variant ? discountPct(variant.mrp, variant.price) : null;
  const stockOut = variant ? variant.stock <= 0 : true;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {image?.url ? (
          <Image
            loader={cloudinaryLoader}
            src={image.url}
            alt={image.alt ?? product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            placeholder="blur"
            blurDataURL={PLACEHOLDER}
          />
        ) : (
          <div
            aria-hidden
            className="flex h-full items-center justify-center text-muted-foreground text-xs"
          >
            No image
          </div>
        )}
        {discount && (
          <Badge variant="success" className="absolute top-2 left-2 px-1.5 py-0.5 text-[11px]">
            {discount}% off
          </Badge>
        )}
        {stockOut && (
          <Badge variant="secondary" className="absolute top-2 right-2 px-1.5 py-0.5 text-[11px]">
            Sold out
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        {product.brand && (
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            {product.brand.name}
          </p>
        )}
        <p className="line-clamp-2 font-medium text-sm leading-snug">{product.name}</p>
        {variant && (
          <div className="mt-auto flex items-baseline gap-2">
            <span className="font-semibold text-base">{formatINR(variant.price)}</span>
            {variant.price.toNumber() < variant.mrp.toNumber() && (
              <span className="text-muted-foreground text-xs line-through">
                {formatINR(variant.mrp)}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

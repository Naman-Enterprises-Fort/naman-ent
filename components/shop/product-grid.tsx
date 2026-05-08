import type { ProductCard as ProductCardData } from '@/lib/services/catalog';
import { ProductCard } from './product-card';

export function ProductGrid({
  products,
  className,
}: {
  products: ProductCardData[];
  className?: string;
}) {
  if (!products.length) return null;
  return (
    <ul
      className={[
        'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4',
        className ?? '',
      ].join(' ')}
    >
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}

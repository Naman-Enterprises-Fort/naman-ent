import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/shop/breadcrumbs';
import { getCategoryTree } from '@/lib/services/catalog';
import { safe } from '@/lib/utils/safe';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'All categories',
  description:
    'Browse every product category — ink cartridges, toner cartridges, ink bottles, printers, and more.',
  alternates: { canonical: '/category' },
};

export default async function AllCategoriesPage() {
  const tree = await safe(() => getCategoryTree(), []);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:py-12">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Categories' }]} />
      <h1 className="font-semibold text-3xl tracking-tight md:text-4xl">All categories</h1>
      {tree.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
          <p className="font-medium">No categories yet</p>
          <p className="mt-1 text-muted-foreground text-sm">
            Add categories from{' '}
            <Link href="/admin" className="underline">
              /admin
            </Link>{' '}
            or seed the database to populate this list.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {tree.map((c) => (
            <li key={c.id}>
              <Link
                href={`/category/${c.slug}`}
                className="group flex aspect-[5/4] flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md"
              >
                {c.image ? (
                  <div className="relative flex-1 overflow-hidden bg-muted/40">
                    <Image
                      src={c.image}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 280px, (min-width: 640px) 33vw, 50vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="flex-1 bg-muted/30" />
                )}
                <div className="flex flex-col gap-0.5 border-t bg-card px-3 py-2.5">
                  <p className="font-medium text-sm">{c.name}</p>
                  {c.children.length > 0 && (
                    <p className="text-muted-foreground text-xs">
                      {c.children.length} subcategor{c.children.length === 1 ? 'y' : 'ies'}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

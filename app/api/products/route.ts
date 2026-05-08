import { NextResponse } from 'next/server';
import { getCategoryDescendantIds, listProducts } from '@/lib/services/catalog';
import { productFiltersSchema } from '@/lib/validators/search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());

  const brand = url.searchParams.getAll('brand');
  const category = url.searchParams.getAll('category');

  const parsed = productFiltersSchema.safeParse({
    ...params,
    brand: brand.length > 1 ? brand : brand[0],
    category: category.length > 1 ? category : category[0],
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid filters', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  let categoryIds: string[] | undefined;
  const cat = parsed.data.category;
  if (cat) {
    const slugs = Array.isArray(cat) ? cat : [cat];
    const sets = await Promise.all(slugs.map(getCategoryDescendantIds));
    categoryIds = Array.from(new Set(sets.flat()));
    if (categoryIds.length === 0) {
      return NextResponse.json({
        products: [],
        total: 0,
        page: parsed.data.page,
        perPage: parsed.data.perPage,
        pageCount: 1,
      });
    }
  }

  const result = await listProducts({ ...parsed.data, categoryIds });
  return NextResponse.json(result);
}

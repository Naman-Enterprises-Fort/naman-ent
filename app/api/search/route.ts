import { NextResponse } from 'next/server';
import { searchProducts, searchSuggest } from '@/lib/services/catalog';
import { searchSuggestSchema } from '@/lib/validators/search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode') ?? 'full';

  if (mode === 'suggest') {
    const parsed = searchSuggestSchema.safeParse({
      q: searchParams.get('q') ?? '',
      limit: searchParams.get('limit') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query', issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const suggestions = await searchSuggest(parsed.data.q, parsed.data.limit);
    return NextResponse.json({ suggestions });
  }

  const q = (searchParams.get('q') ?? '').trim();
  if (!q || q.length < 1 || q.length > 120) {
    return NextResponse.json({ error: 'Invalid q parameter' }, { status: 400 });
  }
  const limit = Math.min(60, Math.max(1, Number(searchParams.get('limit') ?? '24')));
  const products = await searchProducts(q, limit);
  return NextResponse.json({ products, count: products.length });
}

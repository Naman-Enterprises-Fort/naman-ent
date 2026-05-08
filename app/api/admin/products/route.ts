import { type NextRequest, NextResponse } from 'next/server';
import { createProduct, ProductError } from '@/lib/services/admin/products';
import { AuthError, requireRole } from '@/lib/services/auth';
import { createProductSchema } from '@/lib/validators/product';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await requireRole('CATALOG_MANAGER', 'SUPER_ADMIN');
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const product = await createProduct(parsed.data);
    return NextResponse.json({ ok: true, product }, { status: 201 });
  } catch (e) {
    if (e instanceof ProductError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    throw e;
  }
}

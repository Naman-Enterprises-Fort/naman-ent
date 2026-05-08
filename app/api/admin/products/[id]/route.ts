import { type NextRequest, NextResponse } from 'next/server';
import { ProductError, softDeleteProduct, updateProduct } from '@/lib/services/admin/products';
import { AuthError, requireRole } from '@/lib/services/auth';
import { updateProductSchema } from '@/lib/validators/product';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('CATALOG_MANAGER', 'SUPER_ADMIN');
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = updateProductSchema.safeParse({ ...(body as object), id });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const product = await updateProduct(parsed.data);
    return NextResponse.json({ ok: true, product });
  } catch (e) {
    if (e instanceof ProductError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    throw e;
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('CATALOG_MANAGER', 'SUPER_ADMIN');
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const { id } = await ctx.params;
  try {
    await softDeleteProduct(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ProductError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    throw e;
  }
}

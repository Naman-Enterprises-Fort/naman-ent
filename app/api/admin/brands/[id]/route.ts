import { type NextRequest, NextResponse } from 'next/server';
import { BrandError, deleteBrand, updateBrand } from '@/lib/services/admin/brands';
import { AuthError, requireRole } from '@/lib/services/auth';
import { updateBrandSchema } from '@/lib/validators/brand';

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
  const parsed = updateBrandSchema.safeParse({ ...(body as object), id });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const brand = await updateBrand(parsed.data);
    return NextResponse.json({ ok: true, brand });
  } catch (e) {
    if (e instanceof BrandError) {
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
    await deleteBrand(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof BrandError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    throw e;
  }
}

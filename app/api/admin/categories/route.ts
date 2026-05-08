import { type NextRequest, NextResponse } from 'next/server';
import { CategoryError, createCategory } from '@/lib/services/admin/categories';
import { AuthError, requireRole } from '@/lib/services/auth';
import { createCategorySchema } from '@/lib/validators/category';

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
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const category = await createCategory(parsed.data);
    return NextResponse.json({ ok: true, category }, { status: 201 });
  } catch (e) {
    if (e instanceof CategoryError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    throw e;
  }
}

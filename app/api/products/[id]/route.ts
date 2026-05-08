import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  id: z.string().min(1).max(64),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const parsed = paramsSchema.safeParse(await ctx.params);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }
  const { id } = parsed.data;

  // Accept either cuid (id) or slug — useful for both admin and shop callers.
  const product = await prisma.product.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
      deletedAt: null,
    },
    include: {
      brand: { select: { id: true, name: true, slug: true, logo: true } },
      categories: {
        select: {
          category: { select: { id: true, name: true, slug: true } },
        },
      },
      variants: {
        orderBy: [{ isDefault: 'desc' }, { position: 'asc' }],
      },
      images: { orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }] },
      specs: { orderBy: { position: 'asc' } },
    },
  });

  if (!product) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ product });
}

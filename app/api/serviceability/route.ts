import { NextResponse } from 'next/server';
import { checkServiceability } from '@/lib/services/serviceability';
import { serviceabilityQuerySchema } from '@/lib/validators/checkout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = serviceabilityQuerySchema.safeParse({
    // Coerce a missing param to '' so the schema returns the friendly
    // pincode-format message instead of a raw "expected string, received null".
    pincode: url.searchParams.get('pincode') ?? '',
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid pincode', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const result = await checkServiceability(parsed.data.pincode);
  return NextResponse.json(result);
}

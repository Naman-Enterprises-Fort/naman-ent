import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceability, isShiprocketConfigured } from '@/lib/shiprocket';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Shipping rate quote — proxies Shiprocket's serviceability endpoint.
 *
 * Phase 1 returns the raw courier list with rates and ETAs. The customer-
 * facing checkout still uses the flat-tier engine for transparency (the
 * /shipping policy page advertises the flat rates), so this endpoint is
 * primarily for admin/diagnostic use and Phase-2 carrier-selection UX.
 *
 * Falls open with `available: false` when Shiprocket creds are missing — the
 * caller should fall back to flat tiers.
 */

const ratesQuerySchema = z.object({
  pickupPincode: z.string().regex(/^\d{6}$/, 'Invalid pickup pincode'),
  deliveryPincode: z.string().regex(/^\d{6}$/, 'Invalid delivery pincode'),
  weightKg: z.coerce.number().min(0.1).max(50),
  cod: z
    .union([z.literal('1'), z.literal('0'), z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === '1' || v === 'true'),
  declaredValue: z.coerce.number().min(0).max(10_00_000).optional(),
});

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const parsed = ratesQuerySchema.safeParse({
    pickupPincode: sp.get('pickupPincode'),
    deliveryPincode: sp.get('deliveryPincode'),
    weightKg: sp.get('weightKg'),
    cod: sp.get('cod') ?? '0',
    declaredValue: sp.get('declaredValue') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  if (!isShiprocketConfigured()) {
    return NextResponse.json(
      {
        available: false,
        reason: 'shiprocket_unconfigured',
        couriers: [],
      },
      { status: 200 },
    );
  }

  const result = await getServiceability({
    pickupPostcode: parsed.data.pickupPincode,
    deliveryPostcode: parsed.data.deliveryPincode,
    weightKg: parsed.data.weightKg,
    cod: parsed.data.cod ?? false,
    declaredValue: parsed.data.declaredValue,
  });

  if (!result.ok) {
    return NextResponse.json(
      { available: false, reason: result.reason, couriers: [] },
      { status: 200 },
    );
  }

  const couriers = result.data.data?.available_courier_companies ?? [];
  return NextResponse.json(
    {
      available: couriers.length > 0,
      recommendedCourierId: result.data.data?.recommended_courier_company_id ?? null,
      couriers: couriers.map((c) => ({
        courierId: c.courier_company_id,
        name: c.courier_name,
        ratePaise: Math.round((c.rate ?? 0) * 100),
        etd: c.etd ?? c.estimated_delivery_days ?? null,
        isSurface: c.is_surface === 1,
        codAvailable: c.cod === 1,
      })),
    },
    { status: 200 },
  );
}

import 'server-only';

/**
 * Pincode serviceability + ETA — Phase 1 stub.
 *
 * Sprint 4 needs a "yes, we ship to your pincode" check on PDP/cart/checkout. Until
 * Sprint 5 wires Shiprocket's rate engine, we delegate city/state lookup to the
 * public India Post endpoint (already used by the address autofill) and apply
 * a simple metro/tier-1 prefix rule for ETA. COD eligibility piggybacks on
 * "serviceable + not in a deny-list" — the deny list is empty in Phase 1.
 *
 * The endpoint fails open on India Post outages: `serviceable: true, city: null,
 * state: null` so the user can still proceed with manual address entry. Real
 * gating happens at the address form's Zod schema and the order-place transaction.
 */

export interface ServiceabilityEta {
  standard: { minDays: number; maxDays: number };
  express?: { minDays: number; maxDays: number };
  sameDay?: { minDays: number; maxDays: number };
}

export interface ServiceabilityResult {
  pincode: string;
  serviceable: boolean;
  city: string | null;
  state: string | null;
  codAvailable: boolean;
  eta: ServiceabilityEta;
}

interface IndiaPostPostOffice {
  Name: string;
  District: string;
  State: string;
  Pincode: string;
}

interface IndiaPostEntry {
  Status: 'Success' | 'Error' | '404';
  Message?: string;
  PostOffice?: IndiaPostPostOffice[];
}

/** Tier-1 metros eligible for same-day delivery in Phase 1. */
const METRO_PIN_PREFIXES = ['110', '400', '560', '700', '600', '500'];

const NON_SERVICEABLE_PINS = new Set<string>([]);

export async function checkServiceability(pincode: string): Promise<ServiceabilityResult> {
  const base = (process.env.INDIA_POST_API_URL ?? 'https://api.postalpincode.in').replace(
    /\/$/,
    '',
  );

  let city: string | null = null;
  let state: string | null = null;

  try {
    const res = await fetch(`${base}/pincode/${pincode}`, {
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (res.ok) {
      const data = (await res.json()) as IndiaPostEntry[];
      const office = data?.[0]?.PostOffice?.[0];
      if (office) {
        city = office.District || office.Name;
        state = office.State;
      }
    }
  } catch {
    // India Post outage — fall through with null city/state.
  }

  const serviceable = !NON_SERVICEABLE_PINS.has(pincode);
  const isMetro = METRO_PIN_PREFIXES.some((p) => pincode.startsWith(p));

  const eta: ServiceabilityEta = {
    standard: { minDays: 4, maxDays: 7 },
    express: { minDays: 2, maxDays: 3 },
  };
  if (isMetro) eta.sameDay = { minDays: 0, maxDays: 0 };

  return {
    pincode,
    serviceable,
    city,
    state,
    codAvailable: serviceable,
    eta,
  };
}

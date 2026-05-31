import 'server-only';

/**
 * Store-wide identity + compliance details. Sourced from env so legal copy can
 * be re-pointed without a redeploy. The fallbacks are visible placeholders so
 * a forgotten env var surfaces in the rendered legal page rather than masking
 * as production-grade copy.
 *
 * TODO(integration): set the production values in Vercel env vars before launch.
 */

const env = (key: string, fallback: string) => {
  const v = process.env[key];
  return v && v.trim().length > 0 ? v : fallback;
};

export const storeConfig = {
  name: env('NEXT_PUBLIC_STORE_NAME', 'Naman Enterprises'),
  legalName: env('STORE_LEGAL_NAME', 'Naman Enterprises Pvt Ltd [TODO: register]'),
  url: env('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  supportEmail: env('SUPPORT_EMAIL', 'support@naman-ent.example'),
  supportPhone: env('SUPPORT_PHONE', '+91 00000 00000'),
  registeredAddress: env(
    'STORE_REGISTERED_ADDRESS',
    'Registered office address — to be filled in before launch',
  ),
  gstin: env('STORE_GSTIN', '[TODO: GSTIN]'),
  cin: env('STORE_CIN', ''),
  grievanceOfficer: {
    name: env('GRIEVANCE_OFFICER_NAME', '[TODO: Grievance Officer Name]'),
    email: env('GRIEVANCE_OFFICER_EMAIL', 'grievance@naman-ent.example'),
    designation: env('GRIEVANCE_OFFICER_DESIGNATION', 'Grievance Officer'),
  },
  policyEffectiveDate: '2026-05-08',
  policyJurisdiction: 'Mumbai, Maharashtra, India',
} as const;

export type StoreConfig = typeof storeConfig;

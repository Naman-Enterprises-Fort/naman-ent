# PENDING.md — Open work-in-progress checklist

> Lightweight tracker for items that are *known incomplete* and intentionally deferred. **Not a substitute for PROGRESS.md** — sprint state and decisions still live there. This file exists so we don't lose track of polish items between sessions. Delete entries when done; delete the whole file when the list is empty.

---

## Sprint 5C — finish verification before declaring DONE

The branch `feature/sprint-5-shipping` is code-complete (typecheck + lint clean). No schema changes — `Shipment`, `Warehouse`, and `StockMovement` were already in the Sprint-0 schema. The verification gate is the dev-server smoke against a wired Shiprocket sandbox plus the production build.

### A. Verification (blocks `IN_PROGRESS → DONE`)

- [ ] **`pnpm db:seed`** — confirms the `code: 'DEFAULT'` Mumbai HQ warehouse upsert lands. Pair with `pnpm prisma migrate dev --name init` if rolling forward from a fresh DB.
- [ ] **Shiprocket sandbox creds** — fill `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`, `SHIPROCKET_WEBHOOK_TOKEN` in `.env.local` from a Shiprocket API user (Settings → API → Add New API User). Set `SHIPROCKET_PICKUP_LOCATION` to a nickname that already exists on the Shiprocket dashboard (Settings → Pickup Addresses) — defaults to `"Primary"`.
- [ ] **`pnpm dev` smoke — order pipeline**: place an order (Sprint 4 path), sign in as `SUPER_ADMIN`, transition CONFIRMED → PROCESSING. Watch stdout for: a Shiprocket login (only on first call after restart), a `POST /v1/external/orders/create/adhoc`, a `POST /v1/external/courier/assign/awb`, a `POST /v1/external/courier/generate/pickup`, and the local Shipment row INSERT. Confirm `/account/orders/<num>` shows the new Tracking section with courier + AWB + tracking link.
- [ ] **`pnpm dev` smoke — tracking webhook**: hand-craft a `POST /api/webhooks/shiprocket` with `x-api-key: <SHIPROCKET_WEBHOOK_TOKEN>` and a body matching the Shiprocket `current_status: "Out for Delivery"` shape. Confirm `Shipment.status → OUT_FOR_DELIVERY` and `Order.status → OUT_FOR_DELIVERY`. Replay the same webhook — confirm no duplicate OrderEvent and no duplicate email. Replay an "earlier" status (`In Transit`) — confirm no-op (rank-based forward-only).
- [ ] **`pnpm dev` smoke — webhook signature failure**: POST without the `x-api-key` header — confirm `401 unauthorized`, no DB rows mutated.
- [ ] **`pnpm dev` smoke — rate quote**: `curl 'http://localhost:3000/api/shipping/rates?pickupPincode=400001&deliveryPincode=110001&weightKg=1&cod=0'` returns a list of available couriers with rates and ETAs. With creds missing, returns `{ available: false, reason: 'shiprocket_unconfigured' }`.
- [ ] **`pnpm dev` smoke — StockMovement audit**: place an order while signed in, then `psql` `SELECT * FROM stock_movement WHERE ref_id = '<order.id>'` — expect one `SALE` row per non-backorder line. Cancel the order from `/account/orders/<num>` — expect a matching `RETURN` row. Backorder-allowed variants should produce no audit row on placement.
- [ ] **₹1 Razorpay-then-Shiprocket end-to-end** in sandbox — verifies the Sprint 4 → 5B → 5C pipeline survives a real round-trip. Use the Razorpay test card `4111 1111 1111 1111` then walk the order to PROCESSING; confirm Shiprocket receives the order and the tracking webhook fires correctly when status changes propagate.
- [ ] **`pnpm build`** — first production build for Sprint 5C. The 4 new TS modules and 2 new routes should compile cleanly.

### B. Sprint 5C polish (deferred, out of Sprint 5C's critical path)

- [ ] **Per-product package dimensions on `ProductVariant`** — currently 30×30×10 cm + summed `weightGrams` (with 500 g/item fallback). A Phase-2 catalog enhancement adds a `dimensions Json?` field (length/breadth/height) so the createShiprocketOrder call can use real values. Until then, oversized / underweight orders may get rejected by Shiprocket and the admin will see the warning in stdout.
- [ ] **Admin "manual pickup" / "regenerate AWB" buttons** — currently the admin can only retry by re-running `→ PROCESSING` manually (which is currently a one-shot transition). A polish item is to expose `requestShiprocketPickup` + `assignAwb` as explicit admin actions on `/admin/orders/[id]`.
- [ ] **Returns pickup integration** (`/v1/external/orders/create/return` + reverse-pickup) — Phase 2 alongside the customer-side return UI.
- [ ] **Multi-warehouse routing** (per-pincode origin selection) — Phase 3, alongside multi-vendor.
- [ ] **Customer-facing variable shipping rates** at checkout — Phase 2 commercial decision (pass real costs vs absorb-and-flat-price). The /api/shipping/rates endpoint is the building block.
- [ ] **Multi-package shipments** (one Order → many Shipments) — Phase 2; current model assumes 1 Shipment per Order.
- [ ] **Status mapping for NDR / RTO** (Non-Delivery Reason, Return-to-Origin) — currently mapped to `EXCEPTION` / `RETURNED_TO_ORIGIN` but no customer-facing flow exists yet.

### C. Operational follow-ups

- [ ] **Set `SHIPROCKET_*` env vars** in Vercel preview / staging / production. The pickup location must already exist on the Shiprocket dashboard under the same nickname.
- [ ] **Configure the Shiprocket webhook** on Settings → API → Webhooks to POST `https://<production>/api/webhooks/shiprocket` with the matching Security Token in `x-api-key`.
- [ ] **Update the seeded warehouse address** to the real Mumbai HQ address (`UPDATE warehouse SET line1 = '...' WHERE code = 'DEFAULT'` or amend [prisma/seed.ts](./prisma/seed.ts) and re-seed).
- [ ] **Whitelist Shiprocket callbacks** in any production WAF / Cloudflare rules (their IP range is published in the Shiprocket integration docs).

---

## Sprint 5B — finish verification before declaring DONE

The branch `feature/sprint-5-email-programme` is code-complete (typecheck + lint clean). One new model (`CartReminder`) lands in the next migration; otherwise the changes are template + service + cron-route additions and two surgical wiring edits.

### A. Verification (blocks `IN_PROGRESS → DONE`)

- [ ] **Migration**: `pnpm prisma migrate dev --name init` (or `--name sprint-5-cart-reminders` if rolling Sprint 5B as its own migration once the initial one already exists). Adds the `CartReminder` table.
- [ ] **`pnpm build`** — first production build with the four new email templates + the cron route compiled. Cron route pins `runtime = 'nodejs'` for `node:crypto.timingSafeEqual`.
- [ ] **`pnpm dev` smoke — order shipped + delivered**: place an order (Sprint 4 path), sign in as `SUPER_ADMIN`, walk it through CONFIRMED → PROCESSING → SHIPPED → OUT_FOR_DELIVERY → DELIVERED. Watch stdout for `[email:dev] →` logs at SHIPPED and DELIVERED. Confirm the customer-facing `/account/orders/<num>` timeline shows the events.
- [ ] **`pnpm dev` smoke — refund**: replay a `refund.processed` webhook against `/api/webhooks/razorpay` for a `CAPTURED` payment using the Sprint 4 hand-crafted-HMAC pattern. Confirm `[email:dev] →` log fires with the refund amount + payment method label. Replay the same event a second time — confirm zero new emails (idempotency: existing-status early-return inside the TX skips the `justProcessed` flag).
- [ ] **`pnpm dev` smoke — cart abandonment**: build a cart while signed in, edit `lib/services/cart-abandonment.ts` `TIERS` thresholds to `[0, 0, 0]` for the smoke run, POST to `/api/cron/cart-abandonment`. Confirm a single `[email:dev] →` log per tier per cart. Run the cron a second time without changing the cart — confirm zero new emails (the `reminders: { none: { tier } }` filter + the `@@unique([cartId, tier])` constraint). Reset `TIERS` after the test.
- [ ] **Bearer auth on `/api/cron/cart-abandonment`**: set `CRON_SECRET="test123"` in `.env.local`, send a POST with `Authorization: Bearer test123` — succeeds. Send a POST without the header — `401`. Send a POST with `Authorization: Bearer wrong` — `401`.
- [ ] **Resend rendering smoke**: render each new email locally with `react-email-preview` (or via the Resend dashboard's preview tool) and confirm the heading / body / CTA / footer all look right on desktop + mobile widths. Specifically check the cart-abandoned template across `tier=1`, `tier=2`, `tier=3` so the copy switching reads cleanly.

### B. Operational follow-ups (blocks launch, not Sprint 5B merge)

- [ ] **Provision QStash credentials** (`QSTASH_URL`, `QSTASH_TOKEN`) and create a QStash schedule that POSTs `https://<production>/api/cron/cart-abandonment` every 15 minutes with the `Authorization: Bearer <CRON_SECRET>` header. Or, alternatively, add a `vercel.json` `crons` entry for the same route — Vercel Cron auto-injects the bearer header from `CRON_SECRET`. Pick one, document the choice.
- [ ] **Set `CRON_SECRET`** in Vercel preview / staging / production env vars. Generate via `openssl rand -base64 32`.
- [ ] **Resend domain verification**: replace the `onboarding@resend.dev` fallback `from` address with a verified production sender once the Resend domain is provisioned (`RESEND_FROM_EMAIL` env var is already wired through `lib/resend.ts`). Add SPF/DKIM records on the production domain.
- [ ] **Monitoring**: surface the cron's `summary.totalSent` to Sentry / a logging dashboard once Sprint 5D wires those. For now, the response JSON is the only signal.

---

## Sprint 5A — finish verification before declaring DONE

The branch `feature/sprint-5-seo-compliance` is code-complete (typecheck + lint clean). No schema changes, no third-party creds required for this slice. The verification gate is the production build + a manual smoke of the new public pages and sitemap/robots routes.

### A. Verification (blocks `IN_PROGRESS → DONE`)

- [ ] **`pnpm build`** — first production build for the four sitemap routes + `app/robots.ts` + the 7 legal pages. The sitemap routes pin `runtime = 'nodejs'` and use `safe()` to fall back to an empty `<urlset>` when the DB is unreachable, so the build should succeed even before Neon is wired.
- [ ] **`pnpm dev` smoke — public pages**: visit `/privacy`, `/terms`, `/returns`, `/shipping`, `/cancellation`, `/cookies`, `/contact`. Confirm: breadcrumbs, last-updated date, the visible `[TODO: …]` placeholders surface where the corresponding `STORE_*` / `GRIEVANCE_OFFICER_*` env vars are unset.
- [ ] **`pnpm dev` smoke — sitemap + robots**: GET `/sitemap.xml` (index referencing the 3 sub-sitemaps), `/sitemap-pages.xml` (Home + /category + 7 legal pages), `/sitemap-categories.xml` (active categories), `/sitemap-products.xml` (active products), and `/robots.txt` (allow-all + disallow list + sitemap pointer). Validate the XML at the [Google Search Console sitemap validator](https://search.google.com/search-console).
- [ ] **`<head>` audit** — view-source on Home, a PLP, a PDP, and one of the legal pages. Confirm: `<link rel="canonical">`, `<meta name="robots">` (index/follow on public, noindex on `/cart` / `/checkout` / `/(auth)/*` / `/account/*` / `/admin/*`), Open Graph tags, Twitter Card tags, and the three Home JSON-LD blocks (Organization with contactPoint, WebSite with SearchAction, ItemList for Trending).
- [ ] **Footer audit** — every link in the footer should resolve to a real page (no /about 404). The "Legal" column links Privacy / Terms / Cookies / Cancellation; the "Help" column links Contact / Shipping / Returns / Track order.
- [ ] **Lighthouse mobile** on Home, a PLP, a PDP, and `/privacy`: SEO ≥ 95 on each. A11y ≥ 95 on each. Perf ≥ 85 on Home / PLP / PDP (legal pages have no Perf threshold).
- [ ] **Schema.org validator** — paste the rendered HTML of `/`, `/products/iphone-15-pro` (or any seeded PDP), and `/category/smartphones` into [validator.schema.org](https://validator.schema.org/) and confirm zero errors.

### B. Operational follow-ups (blocks launch, not Sprint 5A merge)

- [ ] Fill the new compliance env vars in Vercel preview / staging / production: `STORE_LEGAL_NAME`, `STORE_REGISTERED_ADDRESS`, `STORE_GSTIN`, `STORE_CIN` (optional), `SUPPORT_EMAIL`, `SUPPORT_PHONE`, `GRIEVANCE_OFFICER_NAME`, `GRIEVANCE_OFFICER_EMAIL`, `GRIEVANCE_OFFICER_DESIGNATION`. Until set, the legal pages render visible `[TODO: …]` placeholders.
- [ ] Submit the production sitemap.xml to Google Search Console and Bing Webmaster Tools after the develop → main release.
- [ ] Legal review of the 7 compliance pages by an Indian e-commerce / consumer-law counsel before launch. The drafts in this branch are intentionally CP-Rules-2020 / IT-Rules-2021 / DPDP-Act-2023 aware but are not a substitute for review.
- [ ] Designate a real Grievance Officer (with name, email at the company domain, designation) and update env vars accordingly.

---

## Sprint 1 — finish verification before declaring DONE

The branch `feature/sprint-1-catalog` was merged into `develop` (commit `62e2f50`) but the dev-server smoke + Lighthouse pass that flip Sprint 1 to truly DONE still need to run against a wired Neon DB.

### A. Verification (blocks `IN_PROGRESS → DONE`)

- [ ] Copy `.env.example` → `.env.local`; fill `DATABASE_URL` (pooled) + `DIRECT_URL` (direct) from Neon free tier.
- [ ] `pnpm prisma migrate dev --name init` — first migration against the dev DB. (Sprint 2's schema additions land in the same `init` migration if Sprint 1's hasn't been generated yet — name it `init` and include both.)
- [ ] `psql "$DIRECT_URL" -f prisma/migrations/manual/_search.sql` — installs `pg_trgm` + GIN trigram indexes used by `searchProducts` / `searchSuggest`.
- [ ] `pnpm db:seed` — populates 6 categories / 6 brands / 8 products.
- [ ] `pnpm dev` — visual QA on **mobile + desktop** viewports for the catalog (`/`, `/category/smartphones`, `/products/iphone-15-pro`, `/search?q=iphone`, `/admin/{dashboard,products,categories,brands}`).
- [ ] `pnpm build` — production build must succeed end-to-end.
- [ ] Lighthouse mobile (Chrome devtools or `pnpm dlx lighthouse`) on Home / PLP / PDP — Perf ≥ 85, A11y ≥ 95, SEO ≥ 95.

### B. Sprint 1 polish (Phase-1 admin CRUD, can land any time inside Phase 1)

- [x] ~~**Admin product create/edit form**~~ — done; `/admin/products/new` + `/admin/products/[id]` + the matching API routes, with variant diff-by-id, image + spec wholesale replacement, soft-archive, and on-demand revalidation of `catalog:product` + `/products/[slug]` PDP segment.
- [x] ~~**Admin category create/edit form**~~ — done; `/admin/categories/new` + `/admin/categories/[id]` + the matching API routes, with parent picker + cycle prevention.
- [x] ~~**Admin brand create/edit form**~~ — done; `/admin/brands/new` + `/admin/brands/[id]` + the matching API routes.
- [x] ~~**POST/PATCH/DELETE `/api/admin/products`**~~ — done with the variant upsert-and-delete-with-FK-protection logic; inline editing of categories / images / specs (wholesale-replaced).
- [x] ~~**On-demand revalidation**~~ — done across brand, category, and product mutations (`revalidateTag(... , 'max')` + `revalidatePath` for Home / `/category` / `/category/[...slug]` / `/products/[slug]` / `/search`).
- [x] ~~**`app/sitemap.ts` + `app/robots.ts`**~~ — done in Sprint 5A.
- [x] ~~**Header search suggest**~~ — done; debounced 150 ms fetch to `/api/search?mode=suggest`, ARIA combobox semantics, full keyboard nav.
- [ ] **Hero image asset** — Home currently uses a CSS gradient placeholder. Either commission a hero illustration, or use a Cloudinary upload + the existing `cloudinaryUrl()` helper.
- [ ] **Cloudinary creds on Vercel preview** — once a Cloudinary cloud is provisioned, set `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` + the API key/secret in Vercel preview env vars so seeded placeholder URLs resolve.

---

## Sprint 2 — finish verification before declaring DONE

The branch `feature/sprint-2-auth` was merged into `develop` (commit `0e5556f`); same verification gate as Sprint 1, blocked on a wired DB.

### A. Verification (blocks `IN_PROGRESS → DONE`)

- [ ] **Migration**: `pnpm prisma migrate dev --name init` (folds Sprint 1 + 2 + 3 schema into the first migration once `.env.local` is wired). Sprint 2's additions: `User.tokenVersion`, `UserLoginEvent`, `UserLoginEventKind`, `PasswordResetToken`.
- [ ] **`pnpm dev` smoke** — register a new account and confirm the verify link appears in stdout (`[email:dev] →`) when `RESEND_API_KEY` is unset. Click the link → land on `/verify-email?status=success` → sign in → verify the account dropdown, profile edit, address create with pincode autofill (try `110001` → New Delhi / Delhi), security page change-password and revoke-all.
- [ ] **Forgot-password flow** — request reset, follow the dev-stdout link, set new password, confirm sign-in works and the old session was invalidated on a second device (or open a private window first).
- [ ] **Google OAuth smoke** (optional in dev — needs `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`).
- [ ] **`pnpm build`** — first production-build pass for Sprint 2; auth routes pin `runtime = 'nodejs'` for bcrypt + `node:crypto` so confirm they survive the build.
- [ ] **Lighthouse on `/login`** (mobile) — should still pass A11y ≥ 95 / SEO ≥ 95 (Perf threshold doesn't apply to non-public pages but should still score well).

### B. Sprint 2 polish (deferred, out of Sprint 2's critical path)

- [ ] **Phone + OTP signup** (SRS §6.1.1) — blocked on MSG91 DLT registration (~1 week lead). `otpLimiter` is wired so the new `/api/auth/otp/{request,verify}` routes can drop in cleanly.
- [ ] **2FA setup** (SRS §6.11) — Phase-2 polish, not in Sprint 2 acceptance.
- [ ] **Real Resend sender + DKIM/SPF** on the production domain. Currently any non-empty `RESEND_API_KEY` engages the SDK; a verified sending domain ships before launch.
- [x] ~~**Cloudflare Turnstile**~~ — done; widget on `/register` and `/forgot-password`, server-side `siteverify` in `lib/turnstile.ts`, dev-fallback permissive when `TURNSTILE_SECRET_KEY` is unset, production fail-closed.
- [ ] **Session refresh on the current device after `tokenVersion` bump** — change-password and revoke-all currently force `signOut()` for safety; a smoother path would call `useSession().update()` to re-mint the JWT in place.
- [ ] **Login history vs active-sessions distinction** — Phase 1 collapses both into the same `UserLoginEvent` audit table. True per-session revoke would need a per-session `jti` claim + denylist; defer until checkout-grade stakes warrant it.
- [x] ~~**Per-account lockout after 5 failed logins** (SRS §6.1.2)~~ — done; `lib/account-lockout.ts` increments a 10-min Redis counter on (existing user, password mismatch), wired into `lib/auth.ts` Credentials authorize. Increments only on real password mismatches (no enumerable side-channel for missing-user / blocked / OAuth-only).
- [ ] **HIBP pwned-password check** (SRS §6.1.3 "optional") — `HIBP_USER_AGENT` env var is reserved; integration not wired.

### C. Operational follow-ups

- [ ] MSG91 DLT registration kicked off (≈ 1 week lead time) — blocks Sprint 2B OTP login.
- [ ] Razorpay KYC kicked off (1–3 days) — blocks Sprint 4 checkout.
- [ ] Branch-protection rules on `develop` and `main` (require passing CI + 1 review). CI itself ships in Sprint 5.
- [ ] Resend sandbox account + verified sender domain.
- [ ] Upstash Redis REST credentials (free tier).

---

## Sprint 4 — finish verification before declaring DONE

The branch `feature/sprint-4-checkout` is code-complete (typecheck + lint clean). No new schema (Order / OrderItem / OrderAddress / OrderEvent / Payment / Refund were already in the Sprint-0 schema), so the verification gate is the dev-server smoke + a real Razorpay test transaction + production build.

### A. Verification (blocks `IN_PROGRESS → DONE`)

- [ ] **Razorpay test keys** — fill `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` in `.env.local` from the Razorpay test-mode dashboard.
- [ ] **Migration**: `pnpm prisma migrate dev --name init` (folds Sprint 1 + 2 + 3 + 4 schema into the first migration once `.env.local` is wired). No Sprint-4 schema additions.
- [ ] **`pnpm dev` smoke — COD path**: log in → add items → `/checkout` → pick COD → Place order → land on `/checkout/success?orderNumber=...` → check stdout for the `[email:dev] →` order-placed email log → `/account/orders` lists the new order → open the detail page → confirm timeline shows PENDING + CONFIRMED events with the COD note → cancel the order → confirm stock is restored on the variant (compare ProductVariant.stock before/after).
- [ ] **`pnpm dev` smoke — online path**: pick UPI → confirm Razorpay test modal opens (loaded from `https://checkout.razorpay.com/v1/checkout.js`) → use test card `4111 1111 1111 1111` (CVV 123, any future expiry, OTP 1234) → modal closes → land on `/checkout/success` → email log fires → order detail shows CONFIRMED + payment CAPTURED + a Razorpay `payment_id` on the Payment row.
- [ ] **₹1 Razorpay test transaction** in the Razorpay sandbox to validate the auto-capture + signature verify wiring end-to-end.
- [ ] **Webhook idempotency** — hand-craft a `payment.captured` POST against `/api/webhooks/razorpay` with the live HMAC and replay it twice; confirm the second call is a no-op (Payment.gatewayPaymentId unique constraint).
- [ ] **Webhook signature failure** — send a webhook POST without the `x-razorpay-signature` header; confirm `400 invalid_signature` and that no DB rows are mutated.
- [ ] **Admin transitions** — sign in as `SUPER_ADMIN`, walk an order CONFIRMED → PROCESSING → SHIPPED → OUT_FOR_DELIVERY → DELIVERED; confirm OrderEvents accrete with timestamps + the internal note. Confirm `nextAdminStatuses(DELIVERED)` doesn't allow random transitions back to PROCESSING (409 INVALID_TRANSITION).
- [ ] **Inter-state vs intra-state GST split** — place an order with shipping state = origin state (`Maharashtra` by default); confirm CGST + SGST split kicks in on the order (each = tax/2). Place another with shipping state ≠ origin; confirm IGST = full tax. The cart preview shows a single GST line; the split is server-side at placement and surfaces in the OrderItem.taxAmount + the Order.taxTotal field.
- [ ] **`pnpm build`** — first production build for Sprint 4; checkout / orders / webhook routes pin `runtime = 'nodejs'` (Prisma + node:crypto for HMAC). Confirm all routes survive the build.
- [ ] **Lighthouse mobile on `/checkout`**: A11y ≥ 95 / SEO threshold N/A (page is `robots: { index: false }`).

### B. Sprint 4 polish (deferred, out of Sprint 4's critical path)

- [ ] **Razorpay Magic Checkout** (SRS §6.5.3) — Phase-2 1-click checkout with saved addresses (~2× faster conversion). Web Checkout Standard ships in Sprint 4.
- [ ] **Coupon engine** (SRS §6.9) — Phase 2; the order schema reserves `discountTotal` so wiring is additive.
- [ ] **Loyalty point redemption + GST invoice PDF** — partially supported (`isGstInvoice` + `gstin` already land on the order); the printable invoice PDF is Sprint 5+.
- [ ] **Order cleanup cron for abandoned PENDING orders** — Phase 1 doesn't run a cron, so an online order whose Razorpay modal is closed leaves an Order in `PENDING` with stock decremented. Sprint 5's QStash schedule should mark them FAILED + restore stock after 30 minutes (Razorpay `payment.failed` webhook handles this when it fires; the cron is a backstop).
- [ ] **Reschedule delivery + return flow** (SRS §6.6.2) — Phase 2.
- [ ] **Bulk admin actions** (mark shipped, generate invoices, export CSV — SRS §6.6.3) — Phase 2; Sprint 4 ships per-order transitions only.
- [ ] **`StockMovement` audit row on order placement / cancel** — currently we only adjust `ProductVariant.stock`; the audit table needs a Phase-1 warehouse to land. Sprint 5 wires it alongside Shiprocket.
- [ ] **Guest checkout polish** — works, but a "track my order with email + order number" lookup form is Phase 2.
- [ ] **`x-razorpay-event-id` dedup audit log** — webhook handler is already idempotent via `gatewayPaymentId` / `gatewayRefundId` unique constraints; a separate `WebhookEvent` audit log would make the trail explicit. Sprint 5.
- [ ] **Cart abandonment recovery emails** (1h / 24h / 72h via Resend) — Sprint 5 alongside the rest of the email programme.

### C. Operational follow-ups

- [ ] Razorpay live keys provisioned (after KYC clears) — only added to production env vars.
- [ ] Razorpay webhook endpoint registered on the dashboard pointing at `https://<production>/api/webhooks/razorpay` with the signing key matching `RAZORPAY_WEBHOOK_SECRET`.

---

## Sprint 3 — finish verification before declaring DONE

The branch `feature/sprint-3-cart` is code-complete (typecheck + lint clean). No new schema (Cart + CartItem + Variant.version were already in the Sprint-0 schema), so the verification gate is just the dev-server smoke + production build.

### A. Verification (blocks `IN_PROGRESS → DONE`)

- [ ] **`pnpm dev` smoke — guest journey**: visit `/` → click into a PDP → press Add to cart → confirm the mini-cart drawer opens with the new line ring-highlighted for ~1.4s → tweak quantity in the stepper (totals re-render instantly without a second fetch) → press "View cart" → confirm `/cart` shows the same lines and the Subtotal matches the drawer total exactly → press "Save for later" on a line → confirm it moves to a separate "Saved for later" section and is excluded from totals → press "Move to cart" → confirm it returns to the active list → press "Remove" → confirm the line is gone and the empty state renders.
- [ ] **Variant-aware sticky CTA** (mobile viewport, < 768px): on a PDP with multiple variants, switch to a non-default variant and confirm the sticky bar at the bottom shows the new variant's price + adds the right SKU on tap.
- [ ] **Free-shipping bar** correctness: with a single low-price item (e.g. Boat Airdopes 141 @ ₹1,199) the bar should read "Add ₹X for free shipping" with the right delta; once items push the cart over ₹999, the bar swaps to the green "You qualify for free shipping" state and the summary's Shipping line goes from ₹49 to "Free".
- [ ] **Merge-on-login**: build a guest cart with two lines → sign in as an existing user → confirm the user cart now contains the merged lines (quantities summed where the same variant existed before, otherwise added). Sign out and confirm the new browser session starts with an empty cart (the guest cart cookie was rotated and the user's cart is no longer reachable without signing back in).
- [ ] **Pricing parity** between client-rendered totals and a server `getCartView()` recompute (sanity check). The acceptance bullet "totals match server-side recompute exactly" is the contract — eyeball the GST line on a 28% HSN to confirm the back-out math (`tax = price·gst/(100+gst)`).
- [ ] **`pnpm build`** — first production build for Sprint 3; cart routes pin `runtime = 'nodejs'` (Prisma + node:crypto for the cookie). Confirm both routes survive the build.
- [ ] **Lighthouse mobile on `/cart`**: A11y ≥ 95 / SEO threshold N/A (page is `robots: { index: false }`). Cart page Perf doesn't have an explicit SRS threshold but should still score reasonably.

### B. Sprint 3 polish (deferred, out of Sprint 3's critical path)

- [ ] **Coupon code application** (SRS §6.4.1) — Phase 2 polish. The summary panel reserves a Discount line that renders only when `discountPaise > 0`, so wiring is a one-line addition once the coupon engine lands.
- [ ] **Cross-sell strip** ("People also bought") on the cart page — Phase 2 polish; can reuse `getRelatedProducts` from `lib/services/catalog.ts`.
- [ ] **Save-for-later → wishlist move** — Sprint 3 only flips `CartItem.savedForLater`; the multi-list wishlist move is Phase 2.
- [ ] **Optimistic-lock stock decrement** — variant `version` is read in the cart-add TX but not bumped. The real `UPDATE … WHERE id = ? AND version = ?` decrement lands at order placement (Sprint 4).
- [ ] **Cart abandonment recovery emails** (1h / 24h / 72h via Resend) — Sprint 5 alongside the rest of the email programme.
- [ ] **Switch the cart-icon badge to the lighter `getCartItemCount()` aggregate** — both shop and account layouts currently call `getCartView()` on every render to prime the TanStack cache. Acceptable at Phase-1 scale but worth profiling against the lighter `getCartItemCount()` if the Lighthouse Perf score on heavy pages dips.
- [ ] **Inline stock alert on the cart page** — currently we surface the per-line "Out of stock" / "Only N available" message inline on each line. SRS §6.4.1 mentions a cart-level stock alert; not strictly required for the acceptance criteria.

---

## Conventions for this file

- One section per sprint or per task; delete sections when fully closed out.
- Each item is a checkbox with a single self-contained sentence — when an item needs more than that, it belongs in a code TODO with a `TODO(sprint-N):` prefix, or in the relevant SRS section.
- Don't move items between PENDING.md and PROGRESS.md mechanically — PROGRESS.md tracks sprint *state*, this file tracks *open polish*.

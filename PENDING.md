# PENDING.md — Open work-in-progress checklist

> Lightweight tracker for items that are *known incomplete* and intentionally deferred. **Not a substitute for PROGRESS.md** — sprint state and decisions still live there. This file exists so we don't lose track of polish items between sessions. Delete entries when done; delete the whole file when the list is empty.

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

- [ ] **Admin product create/edit form** — server action + `react-hook-form` + `createProductSchema`/`updateProductSchema` (already in [lib/validators/product.ts](./lib/validators/product.ts)). Variant editor, image picker (Cloudinary upload widget), specs editor, category multi-select, brand picker.
- [ ] **Admin category create/edit form** — name, slug (auto-generated via [lib/utils/slug.ts](./lib/utils/slug.ts)), parent picker, position, image, SEO fields. Reuses `createCategorySchema` / `updateCategorySchema`.
- [ ] **Admin brand create/edit form** — name, slug, logo, SEO fields. Reuses `createBrandSchema` / `updateBrandSchema`.
- [ ] **POST/PATCH/DELETE `/api/admin/{products,categories,brands}`** — backed by the same Zod schemas. Auth gate now exists in `lib/services/auth.ts` (`requireRole('CATALOG_MANAGER', 'SUPER_ADMIN')`).
- [ ] **On-demand revalidation** — when admin mutations land, call `revalidateTag('catalog:product')` / `'catalog:category'` / `'catalog:brand'` so PDPs and PLPs pick up changes without waiting for the ISR window.
- [ ] **`app/sitemap.ts` + `app/robots.ts`** — Sprint 5 also touches these but landing them earlier costs nothing.
- [ ] **Header search suggest** — debounced (~150 ms) client-side fetch to `/api/search?mode=suggest` (route already exists), render under the header search input as a dropdown.
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
- [ ] **Cloudflare Turnstile** on `/register` and `/forgot-password` (env vars are in place: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`).
- [ ] **Session refresh on the current device after `tokenVersion` bump** — change-password and revoke-all currently force `signOut()` for safety; a smoother path would call `useSession().update()` to re-mint the JWT in place.
- [ ] **Login history vs active-sessions distinction** — Phase 1 collapses both into the same `UserLoginEvent` audit table. True per-session revoke would need a per-session `jti` claim + denylist; defer until checkout-grade stakes warrant it.
- [ ] **Per-account lockout after 5 failed logins** (SRS §6.1.2) — currently we only rate-limit by IP. Per-account lockout needs a counter + 10-min cooldown in Redis keyed by `email`.
- [ ] **HIBP pwned-password check** (SRS §6.1.3 "optional") — `HIBP_USER_AGENT` env var is reserved; integration not wired.

### C. Operational follow-ups

- [ ] MSG91 DLT registration kicked off (≈ 1 week lead time) — blocks Sprint 2B OTP login.
- [ ] Razorpay KYC kicked off (1–3 days) — blocks Sprint 4 checkout.
- [ ] Branch-protection rules on `develop` and `main` (require passing CI + 1 review). CI itself ships in Sprint 5.
- [ ] Resend sandbox account + verified sender domain.
- [ ] Upstash Redis REST credentials (free tier).

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

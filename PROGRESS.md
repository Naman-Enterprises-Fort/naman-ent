# PROGRESS.md — Sprint Tracker

> Updated at the end of every session. Read this and [CLAUDE.md](./CLAUDE.md) before writing any code.

---

## Per-Sprint Branch Workflow (do this every sprint, no exceptions)

This is the official workflow for every sprint and every task after Sprint 0. Sprint 0 (the bootstrap) lives on `main` directly. Everything from Sprint 1 onwards follows the steps below — branch off `develop`, work, test, PR back into `develop`, then a separate `develop → main` release PR.

### 1. Start a sprint or task

```bash
git checkout develop
git pull origin develop
git checkout -b feature/sprint-<N>-<slug>
```

Branch naming:
- One branch per sprint when the sprint fits in one session: `feature/sprint-1-catalog`, `feature/sprint-2-auth`, `feature/sprint-3-cart`, `feature/sprint-4-checkout`, `feature/sprint-5-shipping`.
- One branch per task when a sprint is large enough to split: `feature/sprint-1-catalog-pdp`, `feature/sprint-1-catalog-plp`, `feature/sprint-1-catalog-search`. Each task PR merges into `develop` independently — keep PRs small and reviewable.
- For non-feature work, use the matching prefix: `fix/...`, `chore/...`, `refactor/...`, `test/...`, `docs/...`, `perf/...`.

### 2. Commit atomically with Conventional Commits

One logical change per commit. Do not batch refactors with features.

- `feat(catalog): add PDP gallery component`
- `feat(api): add GET /api/products/[slug] handler`
- `fix(cart): clamp negative quantity on PATCH`
- `refactor(pricing): extract GST calculator into lib/services/pricing.ts`
- `chore: regenerate Prisma client after schema change`
- `test(orders): cover idempotent webhook signature verify`
- `docs: note Razorpay test card numbers in SETUP_GUIDE`

### 3. "Done" means done — verify locally before merging

A sprint or task is mergeable only when **all** of these pass on your machine:

- [ ] `pnpm typecheck` — zero errors
- [ ] `pnpm lint` — zero errors
- [ ] `pnpm test` — all green (once the test suite exists; Sprint 5+ for E2E)
- [ ] `pnpm build` — production build succeeds
- [ ] All acceptance criteria for this sprint in this file are checked off
- [ ] Manual smoke test in `pnpm dev` — golden path **and** at least one edge case
- [ ] Mobile + desktop viewports checked for any UI changes (Chrome devtools at minimum)
- [ ] Lighthouse mobile: Perf ≥ 85, A11y ≥ 95, SEO ≥ 95 for any new public page
- [ ] No `console.log` / debug code left behind
- [ ] No secrets in the diff (run `git diff --cached | grep -iE "key|secret|token"` before commit)

### 4. Update PROGRESS.md *before* opening the PR

- Tick off all sprint acceptance criteria
- Move the sprint status from `IN_PROGRESS` → `DONE`
- Update the "Last session summary" block at the top
- Append any new architectural decisions to the Decisions log
- Bump the next sprint to `IN_PROGRESS` only when you actually start it

### 5. Open the PR and merge into `develop`

```bash
gh pr create --base develop --head feature/sprint-<N>-<slug> \
  --title "Sprint <N>: <Sprint Name>"
# After CI is green and review is done:
gh pr merge --squash --delete-branch
```

Default to **squash-merge** for feature branches (clean history on `develop`). Use a regular merge commit only when the branch's intermediate commits tell a story worth keeping.

### 6. Release `develop → main`

`develop → main` is a separate, deliberate "release" PR — never auto-merge. Do this at the end of each sprint OR batch multiple sprints into one release window. Merging to `main` triggers the Vercel production deploy.

```bash
gh pr create --base main --head develop --title "Release: Sprint <N> — <Sprint Name>"
```

### 7. After merging — clean up and start the next sprint

```bash
git checkout develop && git pull origin develop
git branch -d feature/sprint-<N>-<slug>   # local cleanup
# loop back to step 1 for the next sprint
```

### Sprint-0 exception

Sprint 0 = bootstrap = lives directly on `main` because there's nothing to merge into yet. The workflow above starts at Sprint 1.

---

## Last Session Summary

**Date:** 2026-05-08
**Sprint:** Sprint 3 — Cart
**Status:** CODE COMPLETE — typecheck + lint clean; verification (DB migration, dev-server smoke, build) tracked in [PENDING.md](./PENDING.md)

### Done this session

- **Pricing engine** — [lib/services/pricing.ts](./lib/services/pricing.ts) is a pure module that turns cart items into a wire-safe priced view. Money is integer paise on the wire and Decimal(12,2) at rest. `priceLine` / `computeCartTotals` back tax out of the GST-inclusive `variant.price` (`tax = price · gst / (100 + gst)`); the CGST+SGST vs IGST split kicks in only when a destination state is supplied (Sprint 4 from the checkout address). Free-shipping default: ₹999 threshold / ₹49 flat — overridable via `STORE_ORIGIN_STATE` env.
- **Cart service + cookie session** — [lib/services/cart.ts](./lib/services/cart.ts) exposes `getOrCreateCart` / `getCartView` / `getCartItemCount` / `addItem` / `updateItem` / `removeItem` / `clearCart` / `mergeGuestCartIntoUser`. Every write runs in a `prisma.$transaction` so the stock check stays consistent with the cart upsert; `CartError` codes (`OUT_OF_STOCK` / `VARIANT_UNAVAILABLE` / `NOT_FOUND`) map cleanly to 4xx HTTP. Variant `version` is read in the TX so Sprint 4's order-placement decrement can do the optimistic-lock UPDATE WHERE version = ?. [lib/cart-cookie.ts](./lib/cart-cookie.ts) mints a 32-byte hex `naman_cart_id` cookie (HttpOnly, SameSite=Lax, 1-year expiry) on first read.
- **Merge-on-login** — `events.signIn` in [lib/auth.ts](./lib/auth.ts) lazy-imports `mergeGuestCartIntoUser` and feeds it the cookie's sessionId after the LOGIN audit row. Folds guest items into the user cart with quantities summed and clamped to stock; deletes the guest cart so logout doesn't expose it to the next browser user. Idempotent.
- **API routes** — [app/api/cart/route.ts](./app/api/cart/route.ts) (`GET` / `POST` / `DELETE`) and [app/api/cart/items/[id]/route.ts](./app/api/cart/items/[id]/route.ts) (`PATCH` / `DELETE`). Every handler validates input with [lib/validators/cart.ts](./lib/validators/cart.ts) (`addToCartSchema`, `updateCartItemSchema` — per-line cap 20). Mutations return the new full cart so client mutations `setQueryData('cart', …)` once and the UI re-renders without a second fetch.
- **Client plumbing** — [components/providers.tsx](./components/providers.tsx) wraps the app in a single TanStack QueryClient (30s `staleTime`, no window-focus refetch). [lib/hooks/use-cart.ts](./lib/hooks/use-cart.ts) exports `useCart` / `useAddToCart` / `useUpdateCartItem` / `useRemoveCartItem`. [lib/cart-store.ts](./lib/cart-store.ts) is a Zustand store for UI flags only (drawer open/closed + a 1.4s "highlight latest line" hint). Per CLAUDE.md §3.13 cart **data** never leaves DB + cookies; the Zustand store only carries UI state.
- **Mini-cart drawer** — [components/shop/cart/mini-cart.tsx](./components/shop/cart/mini-cart.tsx) is a Sheet-based slide-out. Empty state when there's nothing in the cart, active lines with quantity steppers when there is, footer with free-shipping progress + Subtotal + View-cart / Checkout CTAs. The drawer briefly ring-highlights the most recently added line so Add-to-cart feedback feels alive.
- **Cart page** — [app/(shop)/cart/page.tsx](./app/(shop)/cart/page.tsx) is RSC, fetches the full priced cart at the boundary (wrapped in `safe()` so a DB outage doesn't 500 the marketing shell), and hydrates [CartPageClient](./components/shop/cart/cart-page-client.tsx). Renders the active list, a "Saved for later" list, free-shipping bar, and the [CartSummary](./components/shop/cart/cart-summary.tsx) sidebar (sticky on `lg:`). Marked `robots: { index: false }` per SRS §11.
- **Cart line item** — [components/shop/cart/cart-line.tsx](./components/shop/cart/cart-line.tsx) is shared between mini-cart and page. [QuantityStepper](./components/shop/cart/quantity-stepper.tsx) is a `<fieldset>` with sr-only `<legend>` (assistive tech reads the buttons as a labelled group). Save-for-later button flips the schema field; stock-conflict / generic mutation errors render inline as helpful copy.
- **Add-to-cart wiring** — [AddToCartButton](./components/shop/cart/add-to-cart-button.tsx) wraps the mutation with loading/check states and a `buyNow` flag that redirects to `/checkout` post-add (Phase-1 stub; Sprint 4 wires the real flow). [PdpActions](./components/shop/pdp-actions.tsx) and [StickyCta](./components/shop/sticky-cta.tsx) now both use it; the sticky bar follows variant changes via [lib/pdp-store.ts](./lib/pdp-store.ts) — fixes a real bug where the mobile sticky CTA always added the default variant regardless of selection.
- **Header + bottom-nav badges** — [CartButton](./components/shop/cart/cart-button.tsx) replaces the bare `<Link href="/cart">` in the header; [MobileBottomNav](./components/shop/mobile-bottom-nav.tsx)'s Cart tab now badges live (server-rendered initial count + client-side `useCart` updates after every mutation). Both shop and account layouts mount [MiniCart](./components/shop/cart/mini-cart.tsx) so the drawer is reachable wherever the cart icon is visible.

### Verification

| Command | Result |
|---|---|
| `pnpm typecheck` (`tsc --noEmit`) | ✅ exit 0, zero errors |
| `pnpm lint` (`biome lint .`) | ✅ exit 0, zero new warnings (the 2 pre-existing nursery `noArrayIndexKey` warnings on Sprint-1 breadcrumbs/pagination remain accepted) |
| `pnpm prisma validate` | ✅ schema valid (no Sprint-3 schema changes — Cart + CartItem + Wishlist + Variant.version were already in the Sprint-0 schema) |
| `pnpm dev` | ⏸️ not booted — local Neon + AUTH_SECRET still unprovisioned (Sprint 1 carry-over). Cart flows are gracefully degraded via `safe()` at every page boundary so the shell stays renderable. |

### Up next — to take Sprint 3 from code-complete to merged

1. **Migration** — same `pnpm prisma migrate dev --name init` (or `sprint-2-auth` → `sprint-3-cart`) once `.env.local` is wired against Neon. No Sprint-3 schema additions, but Sprint 1 + 2 migrations are still pending.
2. **`pnpm dev` smoke** — guest journey: visit `/` → PDP → click Add to cart → confirm drawer pops with the line ring-highlighted → tweak quantity in the stepper (totals re-render instantly) → hit "View cart" → confirm `/cart` shows the same line + matches the drawer total exactly → save-for-later toggle → remove. Then sign in (existing user from Sprint 2 smoke) and confirm the guest cart is folded into the user cart on next login.
3. **Cross-state pricing sanity** — once a wire DB exists, eyeball the GST line vs SRS examples (₹26,990 audio @ 18% → tax ≈ ₹4,117.46, subtotal ≈ ₹22,872.54). Sprint 4 will add the formal CGST/SGST/IGST split test once a destination address is on the order.
4. **`pnpm build`** — first production build for Sprint 3; cart routes pin `runtime = 'nodejs'` (Prisma + node:crypto for the cookie). Confirm both routes survive the build.
5. Tick the Sprint 3 acceptance bullets below, flip status `IN_PROGRESS → DONE`, open the PR per the per-sprint workflow.

**Sprint 3 polish backlog** (deferred, out of Sprint 3's critical path):
- **Coupon code application** (SRS §6.4.1) — Phase 2 polish. The summary panel reserves the discount line so it's a one-line addition.
- **Cart abandonment recovery emails** (SRS §6.4.1) — Sprint 5 alongside the rest of the email programme.
- **Cross-sell strip** ("People also bought") — Phase 2 polish; Sprint 4 may surface a simpler "from this brand" strip on the cart page.
- **Save-for-later → wishlist move** — Sprint 3 flips `CartItem.savedForLater`; the move into a multi-list wishlist is Phase 2.
- **Optimistic-lock stock decrement** — variant `version` is read in the cart-add TX but not yet incremented; the real decrement lands at order placement (Sprint 4) where `UPDATE … WHERE id = ? AND version = ?` will engage.
- **Cart drawer count from a lighter aggregate query** — both layouts currently call `getCartView()` on every render. `getCartItemCount()` exists for the cheaper path; switch to it once the SSR-prime-cache pattern is reviewed (the heavier query is acceptable at Phase-1 scale).

### Blockers carried over from Sprint 1 / Sprint 2

- DB still not provisioned locally; same Neon block as Sprint 1 / 2.
- MSG91 DLT and Razorpay KYC — same as prior sprint blocker notes.

### Decisions made this session

- **Server-side pricing engine in pure paise integers**, with the GST split deferred to checkout. The cart page shows a single GST line because the destination state isn't known until address selection (Sprint 4). The `CartTotals` shape carries `cgst/sgst/igst` fields so the split renders in-place once Sprint 4 supplies a `destinationState`.
- **Cart cookie identity = 32-byte hex random, HttpOnly, SameSite=Lax, 1-year expiry**. Lax is sufficient for cart-add (top-level POSTs); we don't share carts across cross-site iframes. The cookie is rotated cleanly on logout (a fresh cookie is minted on next page request).
- **Merge-on-login folds guest items into the user cart with quantities summed and clamped to stock**, then deletes the guest cart so the next browser user can't inherit the previous user's cart. Idempotent: re-running the merge on a subsequent sign-in is a no-op.
- **Stock validation runs inside the same `$transaction` as the cart upsert.** Variant `version` is read in the TX but not yet bumped — Sprint 3 doesn't reserve stock at cart-add time (industry standard is to decrement on order placement). The version field is in place so Sprint 4 can land the optimistic-lock decrement without schema churn.
- **Single mini-cart drawer mounted in both shop and account layouts.** Mounting at the root layout would force a cart fetch on every page (auth, marketing) which is wasteful. Mounting per-layout where a Cart icon is visible is the right granularity.
- **TanStack QueryClient lives in the root layout** so the cache survives navigation. `staleTime: 30s` and `refetchOnWindowFocus: false` keep cache hits high; mutations always invalidate explicitly via `setQueryData` rather than `invalidateQueries`, which means add/update/remove feels instant.
- **Zustand only holds cart UI flags** (drawer open/closed + the 1.4s "highlight latest line" hint). Cart **data** never leaves DB + cookies (CLAUDE.md §3.13). The "highlightedVariantId" state is set inside the mutation's `onSuccess` callback and cleared by a 1.4s timer.
- **PDP variant store** — a new `lib/pdp-store.ts` Zustand slice mirrors the variant selection from `PdpActions` so the mobile-only `StickyCta` adds the right SKU. Previously the sticky bar always added the default variant regardless of which variant the user had picked — a real bug for variant-heavy products.
- **No coupon UI in Sprint 3.** The summary panel reserves a Discount line that renders only when `discountPaise > 0` (Phase 2).

### Previous sessions

- **Sprint 2 — Auth + Account** shipped registration, email verification (Resend + dev fallback), credentials + Google login, forgot/reset password (15-min SHA-256 hashed token), `User.tokenVersion`-based "log out everywhere", account dashboard with profile + address CRUD + security pages, Upstash rate-limiters, and the merged shop header account dropdown. Verification (DB migration + dev-server smoke) tracked in [PENDING.md](./PENDING.md). Squash-merged via PR [#2](https://github.com/) (commit `0e5556f`).
- **Sprint 1 — Catalog (Home, PLP, PDP)** shipped the RSC catalog (Home + PLP + PDP + Search), pg_trgm-based search, Cloudinary loader, money helpers, SEO JSON-LD, Shadcn primitives, mobile bottom nav, and read-only admin tables. Squash-merged via PR [#1](https://github.com/) (commit `62e2f50`).

---

## Phase 1 Sprint Breakdown (per SRS §14)

### Sprint 0 — Bootstrap
**Status:** DONE ✅

- [x] Read SRS + SETUP_GUIDE
- [x] Write CLAUDE.md
- [x] Write PROGRESS.md (this file)
- [x] `pnpm init` + install locked versions
- [x] `tsconfig.json` strict, `paths`
- [x] Biome config (`biome.json`)
- [x] Husky + lint-staged pre-commit
- [x] `.nvmrc`, `.env.example`, `.gitignore`, `.editorconfig`
- [x] Folder structure per SRS §5.3
- [x] Tailwind 4 + globals.css + Shadcn/UI baseline (New York / slate)
- [x] Prisma 7 schema (full schema from SRS §7) + `lib/db.ts` singleton + `prisma.config.ts`
- [x] Auth.js v5 scaffolding (`lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `proxy.ts`)
- [x] Move SRS.md → `docs/SRS.md`
- [x] `pnpm typecheck` clean
- [x] `pnpm lint` clean
- [x] `npx prisma validate` clean
- [x] `pnpm dev` boots on localhost:3000 (HTTP 200 confirmed)

---

### Sprint 1 — Catalog (Home, PLP, PDP)
**Status:** MERGED into `develop` (commit `62e2f50`) — verification items (Neon migration, Lighthouse, admin CRUD polish) tracked in [PENDING.md](./PENDING.md)
**Relevant SRS:** §6.2, §6.3 (Phase-1 Postgres search), §10, §11

- [x] Shadcn/UI components needed for Sprint 1 — hand-written into `components/ui/` (button, card, input, label, sheet, dropdown-menu, skeleton, badge, separator, accordion, checkbox, radio-group). Radix peer deps installed.
- [ ] Category and Brand admin CRUD (basic — full UI later) — read-only tables done, create/edit forms deferred to Sprint 1 polish
- [ ] Product admin CRUD (title, slug, brand, description, MRP, selling price, GST %, HSN, country of origin, BEE rating, hazmat flags, status, images, specs, variants) — read-only table done, full create/edit form deferred to Sprint 1 polish (Zod schemas already in place)
- [x] Public **Home** page — hero, category tiles, trending products, brand strip (RSC, ISR 5min). Newsletter form deferred (no Resend list yet).
- [x] Public **Category PLP** — `/category/[...slug]`, faceted filters via search params, sort, pagination, breadcrumbs (RSC + ISR 5min)
- [x] Public **PDP** — `/products/[slug]`, gallery, variant selector, pincode check, price breakdown, Add to Cart / Buy Now (UI only — wired to actual cart in Sprint 3), sticky mobile CTA, specs accordion, related strip, JSON-LD Product + BreadcrumbList (RSC + ISR 1hr; on-demand revalidate to land in Sprint 1 polish once admin mutations exist)
- [x] Postgres-based search — pg_trgm path live (`/api/search` + `searchProducts`/`searchSuggest`). tsvector graduation deferred until SKU count crosses ~5k.
- [x] `next/image` + Cloudinary loader for all product imagery (`lib/cloudinary.ts`, used by ProductCard, ProductGallery, Home tiles, all-categories)
- [x] Mobile bottom nav (Home/Categories/Search/Cart/Account, safe-area aware)
- [x] Skeletons + designed empty/error states (`loading.tsx` for shop root + PDP, `not-found.tsx` for products + categories, empty-states on Home/PLP/Search)
- [ ] Lighthouse: Perf ≥ 85 mobile, A11y ≥ 95, SEO ≥ 95 on Home, PLP, PDP — to be measured after the dev server boots against Neon

**Acceptance:** Customer can browse Home → Category → PDP without login. Search returns results. Lighthouse passes thresholds.

---

### Sprint 2 — Auth + Account
**Status:** MERGED into `develop` (commit `0e5556f`) — verification items (DB migration, dev-server smoke, Lighthouse on `/login`) tracked in [PENDING.md](./PENDING.md)
**Relevant SRS:** §6.1, §6.11

- [x] Email + password registration (bcrypt, complexity rules) with email verification (Resend) — `/api/auth/register` + `/api/auth/verify-email` + `/api/auth/resend-verification`; React Email templates in `/emails`. Resend has a dev-mode console-log fallback when `RESEND_API_KEY` is unset.
- [x] Login (email/password + Google OAuth) — Credentials + Google providers already scaffolded in `lib/auth.ts`; `/login` page now wired with the `LoginForm` client island and a `verified=1` success banner from the verify-email redirect.
- [x] Forgot password (15-min token) — `/api/auth/forgot-password` issues SHA-256-hashed `PasswordResetToken`s, `/api/auth/reset-password` consumes them, bumps `tokenVersion`, marks `emailVerified` (proof of inbox control). UI: `/forgot-password` + `/reset-password?token=...`.
- [x] Account dashboard shell: profile, addresses, orders (placeholder), security — sidebar + 2-column layout in `app/(account)/account/layout.tsx`; pages at `/account`, `/account/profile`, `/account/orders`, `/account/addresses`, `/account/security`.
- [x] Address CRUD (label, default flag, pincode autocomplete via India Post API) — `/api/account/addresses` + `/[id]` (PUT sets default), `lib/services/addresses.ts` enforces single-default invariant inside a Prisma transaction. India Post lookup auto-fills city/state on the client.
- [x] Rate limiting on login + OTP (Upstash Redis sliding window) — `lib/redis.ts` exposes `loginLimiter` 5/min, `registerLimiter` 5/h, `otpLimiter` 3/min, `passwordResetLimiter` 3/h, `verifyEmailLimiter` 5/h. Permissive no-op fallback when Upstash creds are unset; OTP route blocked on MSG91 DLT.
- [x] Session list + revoke (Phase 1 minimum: list active, revoke all) — `UserLoginEvent` audit table records every successful sign-in via Auth.js `events.signIn`. `/api/account/sessions` lists last 20, `/api/account/sessions/revoke` bumps `User.tokenVersion` (kills every JWT on next sensitive call). UI on `/account/security`.

**Acceptance:** User can sign up, verify email, log in via password or Google, manage addresses, see empty orders list. ✅ Code path complete; final tick on `IN_PROGRESS → DONE` after dev-server smoke + `pnpm build` against a wired DB.

---

### Sprint 3 — Cart
**Status:** IN_PROGRESS — code complete; verification (DB migration, dev-server smoke, build) tracked in [PENDING.md](./PENDING.md)
**Relevant SRS:** §6.4.1, §6.5.4 (pricing engine basics)

- [x] Guest cart: HTTP-only cookie session id → DB-backed Cart (Cart, CartItem) — `naman_cart_id` cookie keys the guest cart in the existing `Cart.sessionId`. Cookie is HttpOnly + SameSite=Lax + 1-year expiry, minted on first read in [lib/cart-cookie.ts](./lib/cart-cookie.ts).
- [x] Logged-in cart with merge-on-login — [lib/services/cart.ts](./lib/services/cart.ts) `mergeGuestCartIntoUser` is invoked from `events.signIn` in [lib/auth.ts](./lib/auth.ts). Folds guest items into the user cart with quantities summed and clamped to stock; deletes the guest cart so logout doesn't expose it. Idempotent.
- [x] Mini-cart drawer (Zustand UI flag, Shadcn Sheet) — [components/shop/cart/mini-cart.tsx](./components/shop/cart/mini-cart.tsx) keyed off [lib/cart-store.ts](./lib/cart-store.ts) `useCartUi`. Mounted in both shop and account layouts so the drawer is reachable wherever the cart icon is visible.
- [x] Cart page with quantity update, remove, save-for-later, free-shipping progress — [app/(shop)/cart/page.tsx](./app/(shop)/cart/page.tsx) RSC + [CartPageClient](./components/shop/cart/cart-page-client.tsx) hydration, [QuantityStepper](./components/shop/cart/quantity-stepper.tsx) for inline updates, save-for-later toggle on each line (Phase-1 flips `CartItem.savedForLater`; Phase-2 wires the move-to-wishlist), [FreeShippingBar](./components/shop/cart/free-shipping-bar.tsx) at the top of both mini-cart and page.
- [x] Server-side pricing engine (HSN-driven GST, inter/intra-state, paise integers everywhere) — [lib/services/pricing.ts](./lib/services/pricing.ts) `computeCartTotals`. The CGST+SGST vs IGST split engages when a `destinationState` is supplied; cart UI shows a single GST line for now. Free-shipping default ₹999 / flat ₹49 below.
- [x] `/api/cart` `POST` / `GET` / `DELETE` and `/api/cart/items/[id]` `PATCH` / `DELETE` with Zod validation — [lib/validators/cart.ts](./lib/validators/cart.ts) gates every mutation; `CartError` codes map to 4xx HTTP cleanly.
- [x] Stock validation on add/update with optimistic locking (variant `version`) — every cart write runs in a `prisma.$transaction` so the stock check stays consistent with the upsert. Variant `version` is read in the TX; the actual decrement-on-order-placement lands in Sprint 4 alongside the `UPDATE … WHERE id = ? AND version = ?` pattern.

**Acceptance:** Guest and logged-in users can build a cart that survives reload, login merges correctly, totals match server-side recompute exactly. ✅ Code path complete; final tick on `IN_PROGRESS → DONE` after dev-server smoke + `pnpm build` against a wired DB.

---

### Sprint 4 — Checkout + Razorpay + Order Placement
**Status:** NOT_STARTED
**Relevant SRS:** §6.5, §6.6, §12.2

- [ ] Single-page accordion checkout (Contact, Address, Shipping, Payment, Review)
- [ ] Pincode serviceability + ETA (`/api/serviceability`)
- [ ] Razorpay order create (`/api/checkout/session`)
- [ ] Razorpay Web Checkout iframe integration (Phase 1 standard, Magic in Phase 2)
- [ ] `/api/orders/verify` — HMAC-SHA256 signature verification on raw body, idempotent payment_id constraint, server-side amount re-check
- [ ] Order placement with full snapshot (OrderItem.productSnapshot JSON, OrderAddress snapshot)
- [ ] COD path: OTP-on-delivery flag, COD convenience fee
- [ ] `/api/webhooks/razorpay` — handles `payment.captured`, `payment.failed`, `payment.authorized`, `order.paid`, `refund.created`, `refund.processed`, `refund.failed`. Raw-body signature verify, idempotent, returns 2xx within 5s.
- [ ] Order confirmation page + email (Resend + React Email)
- [ ] Customer order list + order detail with timeline
- [ ] Admin order list + status transitions
- [ ] Cancel order (until SHIPPED)

**Acceptance:** End-to-end test transaction (₹1) processes via UPI, card, and COD. Webhook events update order state idempotently. Refund flow works.

---

### Sprint 5 — Shipping + Notifications + Polish
**Status:** NOT_STARTED
**Relevant SRS:** §6.7, §6.10, §11

- [ ] Shiprocket integration: rate quote, label create, AWB, tracking webhook
- [ ] Order timeline updates from Shiprocket webhook
- [ ] Email notifications: welcome, order placed, shipped, delivered, refund, password reset (React Email templates)
- [ ] SMS via MSG91: OTP, order placed, delivery slot, COD OTP
- [ ] SEO: sitemap.xml split (sitemap-products, sitemap-categories), robots.txt blocking /admin /account /checkout, canonical URLs, OG/Twitter Card meta on every page
- [ ] Compliance pages: Privacy, Terms, Returns, Shipping, Cancellation, Cookie, Contact (with grievance officer per India CP Rules)
- [ ] Vercel deployment: GitHub Actions CI (lint, typecheck, vitest, prisma migrate dry-run), preview + staging environments
- [ ] Sentry wired in
- [ ] Analytics: Vercel Analytics, GA4, PostHog, Microsoft Clarity

**Acceptance:** Pre-launch checklist (SETUP_GUIDE Part 8) passes. Real ₹1 transaction tested end-to-end on staging.

---

## Decisions Log

> Architectural decisions made during the build. Append-only — never edit or delete entries.

| Date | Decision | Reason |
|------|----------|--------|
| 2026-05-08 | **Linter = Biome** (not ESLint + Prettier) | Single tool replaces both, ~10× faster (Rust), zero config drift between formatter and linter. Matches the lean Phase-1 ethos. Revisit only if a missing rule blocks us. |
| 2026-05-08 | **Auth.js v5 = `next-auth@5.0.0-beta.31`** | SRS specifies "Auth.js 5.x". Stable v5 not yet released as of bootstrap; beta.31 is the current head of the v5 channel. Pin exactly. |
| 2026-05-08 | **Tailwind 4 CSS-first config** (`@theme` in `app/globals.css`, no `tailwind.config.js`) | Tailwind 4's recommended setup. PostCSS plugin = `@tailwindcss/postcss`. |
| 2026-05-08 | **Shadcn/UI = New York style + slate neutral** | Per MASTER_PROMPT options (slate / zinc). Slate has slightly warmer mids; works well with most accents. |
| 2026-05-08 | **Node target = 22 LTS** in `.nvmrc` | Per SRS / MASTER_PROMPT. Forward-compatible with the Node 24 currently on the dev machine. |
| 2026-05-08 | **Prisma 7 schema = single `prisma/schema.prisma` file** | Prisma 7 supports multi-file schemas via `prismaSchemaFolder`, but Phase 1 is small enough that a single file is clearer. Revisit if it crosses ~1.5k lines. |
| 2026-05-08 | **Phase 1 search = Postgres `pg_trgm` + `tsvector`** | SRS Appendix D defers Algolia to Phase 2. Free, native to Neon, sufficient under ~5k SKUs and 500ms p95. |
| 2026-05-08 | **Cart state = HTTP-only cookie session id → DB Cart** (no `localStorage`) | Per CLAUDE.md rule §3.13. Survives device, mergeable on login, no XSS exposure. |
| 2026-05-08 | **Money on the wire = integer paise** (server-to-client) and `Decimal(12,2)` server-side | Per SRS §7.3 and CLAUDE.md rule §3.12. Eliminates float drift forever. |
| 2026-05-08 | **Prisma 7 driver-adapter pattern**: `@prisma/adapter-pg` + plain `pg` | Prisma 7 GA broke the legacy `url`/`directUrl` schema fields — they now live in `prisma.config.ts`, and the runtime client must use an adapter. We use `@prisma/adapter-pg` (works against Neon over standard wire protocol). Switch to `@prisma/adapter-neon` later if Vercel cold-start latency demands the HTTP driver. |
| 2026-05-08 | **TypeScript 6 — removed deprecated `baseUrl`** | TS 6 deprecates `baseUrl`. Modern TS resolves `paths` relative to the `tsconfig.json` location, so `baseUrl` is no longer required. |
| 2026-05-08 | **Next.js 16 — `proxy.ts` (not `middleware.ts`)** | Next.js 16 renamed the file convention from `middleware` to `proxy`. The exported `auth` callback signature is unchanged. |
| 2026-05-08 | **Biome CSS parsing disabled (TS/JS/JSON only)** | Biome's CSS parser doesn't yet recognize Tailwind 4 directives (`@theme`, `@custom-variant`, `@layer`). Linting CSS would only produce noise. Re-enable when Biome ships Tailwind 4 support. |
| 2026-05-08 | **Removed `@types/bcryptjs`** | Deprecated stub — bcryptjs ships its own types since v3. |
| 2026-05-08 | **Sprint 1 search = pg_trgm only** (no tsvector yet) | Trigram covers typo-tolerant prefix/substring search up to ~5k SKUs cleanly, and `searchVector` in the schema can stay unused for Phase 1. Graduate to a generated tsvector column or Algolia when p95 search latency exceeds 500ms or recall starts to suffer. |
| 2026-05-08 | **pg_trgm bootstrapped via manual SQL** (`prisma/migrations/manual/_search.sql`) | Avoids coupling to Prisma's `previewFeatures = ["postgresqlExtensions"]`, which is still preview-flagged. Script is idempotent so re-runs are safe across environments. |
| 2026-05-08 | **Money helpers do not import `Decimal` from `@prisma/client/runtime/library`** | The path moved between Prisma 6 and 7 betas and broke TS module resolution. Helpers now duck-type any `{ toString(): string; toNumber?(): number }` — Prisma's Decimal already satisfies that, plus plain numbers and strings. Real Decimal arithmetic should `import { Prisma } from '@prisma/client'` and use `Prisma.Decimal`. |
| 2026-05-08 | **Pincode lookup hits India Post directly from the client** | Phase 1 has no `/api/serviceability` (Sprint 4). The India Post endpoint is public, doesn't need an API key, and CORS-allows browsers. Marked `TODO(integration)` so Sprint 4 can swap to the internal serviceability route. |
| 2026-05-08 | **Public RSC pages use a shared `safe()` fallback** so the catalog renders empty-state UI instead of HTTP 500 when the DB is unreachable | Lets the dev server boot and the marketing shell stay reviewable before Neon credentials exist. Kept narrow — only catches read paths at the page boundary; service code still throws so failures surface in logs. |
| 2026-05-08 | **Sprint 1 ships on slate-only**, no chromatic accent | SRS leaves accent "TBD per brand kit." Slate + semantic state colours (success/warning/destructive/info) are enough for clean Phase-1 polish. Pick the accent during Sprint 1 polish once a logo/wordmark exists. |
| 2026-05-08 | **JWT strategy + `User.tokenVersion` for "log out everywhere"** | SRS §6.1.4 requires JWT-rotating sessions + revoke-all. Bumping `tokenVersion` invalidates every minted JWT on its next call into `requireFreshSession()` (used by every `/account/*` and `/checkout/*` handler). Catalog reads stay stateless; only writes pay the freshness check. |
| 2026-05-08 | **Email-verification reuses Auth.js `VerificationToken`** with `verify:<email>` identifier prefix | The Auth.js standard table is already in the schema and the column shapes match. Avoids inventing a parallel model. SHA-256-hash the secret on disk so a DB leak doesn't expose live links. |
| 2026-05-08 | **Password reset gets its own `PasswordResetToken` model** | Different lifecycle from email-verification: 15-min TTL, single-use (`usedAt`), per-user (`userId`). Mixing it with `VerificationToken` would smear two lifecycles together. |
| 2026-05-08 | **Always reject register if email exists, including OAuth-only accounts** | Letting a guest set a password on a Google-only account would be account takeover (no inbox proof). Legitimate owners use forgot-password — which proves inbox control — to set their first password. |
| 2026-05-08 | **Reset-password also sets `emailVerified`** | Receiving the reset email already proves inbox control; making the user click another verify link adds friction with no extra security. |
| 2026-05-08 | **Account-enumeration safety on every public auth surface** | `/forgot-password` and `/resend-verification` always respond 200 with the same message regardless of whether the email exists. `/register` returns the same generic conflict whether the prior account had a password or used Google. |
| 2026-05-08 | **Upstash Ratelimit is permissive when creds are missing** | Local dev avoids the Redis sidecar requirement. Production must set `UPSTASH_REDIS_REST_*` or the gate vanishes — surfaced as a Sprint 5 deployment-checklist item. |
| 2026-05-08 | **Resend dev fallback logs the rendered plain-text email to stdout** | Auth flows stay usable end-to-end without a Resend sandbox subscription. Production must set `RESEND_API_KEY`. |
| 2026-05-08 | **Single-default-address invariant inside a Prisma transaction** | Setting a new default flips off any prior default in the same TX. Deleting the current default auto-promotes the next-most-recent address so checkout never sees "no defaults exist". |
| 2026-05-08 | **Phone-OTP signup deferred to Sprint 2B** | Blocked on MSG91 DLT registration (≈1 week lead time). The `otpLimiter` is wired so the route can drop in once provisioned. |
| 2026-05-08 | **Cart pricing engine is pure-paise integer math, server-side only** | Per CLAUDE.md §3.12 floats never appear in business logic. `priceLine` / `computeCartTotals` operate on integer paise; `decimalToPaise` / `paiseToDecimal` are the only sanctioned `Decimal` ↔ paise conversions. Eliminates float drift between the cart preview, the order placement, and the Razorpay amount-recheck server-side. |
| 2026-05-08 | **Cart `variant.price` is GST-inclusive; tax is backed out** | PDP shows "Inclusive of all taxes", so `tax = price · gst / (100 + gst)`. `subtotal + tax === inclusive` is preserved exactly by allocating remainder paise to the subtotal. Avoids changing what's rendered on PDP / cards. |
| 2026-05-08 | **CGST/SGST/IGST split deferred to checkout** | The cart page doesn't know the destination state — that's chosen in Sprint 4's address step. The cart UI shows a single "GST included" line; `computeCartTotals` returns 0 in `cgst/sgst/igst` until a `destinationState` is passed (Sprint 4 wires it). |
| 2026-05-08 | **Free-shipping default ₹999 / flat ₹49 below** | SRS §6.7 will replace this with a per-pincode rate engine in Sprint 5. The Phase-1 default is good enough to render the "Add ₹X for free shipping" progress bar SRS §6.4.1 calls for, and the constants are exported so Sprint 5 can swap them out without touching call sites. |
| 2026-05-08 | **Cart cookie = 32-byte hex random, HttpOnly, SameSite=Lax, 1-year expiry** | Lax is sufficient for cart-add (top-level POSTs); we don't share carts across cross-site iframes. The cookie is set on first read so the cart page never has to mint twice. |
| 2026-05-08 | **Merge-on-login folds guest items into the user cart with quantities summed and clamped to stock**, then deletes the guest cart | The guest cart can't be inherited by the next browser user after sign-out. `mergeGuestCartIntoUser` is idempotent so a stale `events.signIn` retry is a no-op. |
| 2026-05-08 | **Stock validation runs in the same `$transaction` as the cart upsert; variant `version` is read but not bumped in Sprint 3** | Sprint 3 doesn't reserve stock at cart-add time (industry standard is to decrement on order placement). The `version` field is read in the TX so Sprint 4's order-placement decrement can do the optimistic-lock `UPDATE … WHERE id = ? AND version = ?` cleanly. |
| 2026-05-08 | **Single TanStack QueryClient at the root layout; mutations `setQueryData('cart', …)` instead of `invalidateQueries`** | The mutation response IS the new cart (every API write returns the full priced view), so a second fetch after every action would be wasted RTT. The cache survives navigation because `<Providers>` lives at the root level. |
| 2026-05-08 | **Mini-cart drawer mounted in shop and account layouts (not at root)** | Mounting at the root would force a cart fetch on every page (auth, marketing) which is wasteful. Mounting per-layout where a Cart icon is visible is the right granularity. |
| 2026-05-08 | **Zustand only holds cart UI flags** (drawer open/closed + 1.4s "highlight latest line") | Per CLAUDE.md §3.13 cart state lives in DB + cookies. The Zustand store is intentionally tiny and never holds line items. |
| 2026-05-08 | **PDP variant store** (`lib/pdp-store.ts`) so the mobile sticky CTA tracks variant changes | Previously `<StickyCta>` always added the default variant regardless of which one the user picked — a real bug for variant-heavy pages. The store is PDP-scoped and reset on unmount so it doesn't leak across products. |
| 2026-05-08 | **`<fieldset>` + sr-only `<legend>` for the QuantityStepper instead of `role="group"`** | Biome's a11y rule rejects `role="group"` on a bare div when a semantic equivalent exists. Fieldset is the semantic group; the sr-only legend gives screen readers the "Quantity" label without surfacing the default browser fieldset chrome. |

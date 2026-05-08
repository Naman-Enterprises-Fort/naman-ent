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

**Date:** 2026-05-09
**Sprint:** Sprint 2 polish — Auth hardening (per-account lockout + Cloudflare Turnstile)
**Status:** CODE COMPLETE — typecheck + lint clean (same two pre-existing nursery warnings; no new ones); verification (lockout smoke against Upstash Redis, Turnstile end-to-end with a real site key) tracked in [PENDING.md](./PENDING.md). With this slice merged, the Phase-1 Sprint-1 + Sprint-2 polish backlogs are effectively closed (only Cloudinary widget + Phase-2 nice-to-haves remain). Sprint 5D stays intentionally deferred.

### Done this session

- **Per-account login lockout** — [lib/account-lockout.ts](./lib/account-lockout.ts) tracks failed credential authorize attempts in a 10-minute sliding window keyed on the lower-cased email (`naman:lockout:<email>` Redis key, INCR + EXPIRE on first hit). At 5 failures the account is locked until the window expires. Wired into [lib/auth.ts](./lib/auth.ts) Credentials authorize: `recordFailedLogin` runs only when (user exists, has `passwordHash`, isn't blocked / deleted) AND `bcrypt.compare` returns false — so wrong-email or OAuth-only-account attempts don't increment, sidestepping account enumeration via lockout side-channels. `clearFailedLogins` runs on successful authorize so legitimate users don't accumulate state.
- **Cloudflare Turnstile** — [lib/turnstile.ts](./lib/turnstile.ts) is a thin `fetch`-based wrapper around Cloudflare's `siteverify` endpoint. Returns `{ success, reason?: 'unconfigured' | 'missing_token' | 'http_error' | 'rejected' | 'network', detail? }` so call sites can degrade gracefully. In dev with `TURNSTILE_SECRET_KEY` unset, the verifier passes through (so local sign-up works without provisioning a Turnstile site key); production with no secret denies — fail-closed. Wired into [/api/auth/register](./app/api/auth/register/route.ts) and [/api/auth/forgot-password](./app/api/auth/forgot-password/route.ts) before any state-mutating work; both return 400 "Bot verification failed" if the token is rejected.
- **TurnstileWidget client component** — [components/auth/turnstile-widget.tsx](./components/auth/turnstile-widget.tsx) lazy-loads `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` via `next/script` (afterInteractive strategy) and uses the explicit-render API to mount the widget into a ref'd container. Exposes a single `onVerify(token: string | null)` callback so forms can store the token in state and include it on submit. Uses error/expired callbacks to clear the token. When `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is unset, renders an inline "Bot protection not configured" notice instead of the widget — production-clean, dev-friendly. Mounted in both [register-form.tsx](./components/auth/register-form.tsx) and [forgot-password-form.tsx](./components/auth/forgot-password-form.tsx).
- **Schema extension** — [lib/validators/auth.ts](./lib/validators/auth.ts) `registerSchema` and `forgotPasswordSchema` gain an optional `turnstileToken: z.string().min(1).max(2048).nullish()` field so forms can post the captured token through the existing Zod gate.

### Verification

| Command | Result |
|---|---|
| `pnpm typecheck` (`tsc --noEmit`) | ✅ exit 0, zero errors |
| `pnpm lint` (`biome lint .`) | ✅ exit 0, zero new warnings (the same 2 pre-existing nursery `noArrayIndexKey` warnings remain accepted) |
| `pnpm prisma validate` | ✅ schema valid (no schema changes) |
| `pnpm build` | ⏸️ deferred — same Neon block as prior sessions |

### Up next — to take this slice from code-complete to merged

1. **`pnpm dev` smoke — lockout**: with Upstash Redis creds wired, sign in to a real account with the wrong password 5 times in a row → 6th attempt should also fail (locked) for the next 10 minutes even with the correct password. Verify by `redis-cli` against Upstash that `naman:lockout:<email>` shows count >= 5. Wait 10 minutes (or `redis-cli DEL`) and confirm the account unlocks. Verify wrong-email and OAuth-only-account attempts do NOT increment (no enumerable side-channel).
2. **`pnpm dev` smoke — Turnstile happy path**: with `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` set on a real Cloudflare site key, `/register` should render the widget. Solve the challenge → submit form → 200 + welcome email. Without solving (button-spam) → 400 "Bot verification failed".
3. **`pnpm dev` smoke — Turnstile unconfigured**: with both env vars unset, `/register` shows the inline "Bot protection not configured" notice; submit succeeds because the server-side verifier passes through in dev. Same for `/forgot-password`.
4. **Production fail-closed**: simulate the unconfigured production case (`NODE_ENV=production` + no `TURNSTILE_SECRET_KEY`) and confirm `/api/auth/register` returns 400 with "Bot verification failed" — never accidentally bypassing in production.
5. **`pnpm build`** — first production build with the auth-hardening changes.

### What's still ahead

- **Operational** (the user is handling these on production): provision Cloudflare Turnstile site key + secret, generate Upstash Redis REST creds, set env vars on Vercel preview / staging / production. Without Upstash, the lockout is a permissive no-op (matches the existing rate-limiter behaviour); without Turnstile in production, the form fails-closed and registration breaks — set the secret first.
- **Sprint 5D — Platform** (intentionally deferred — the user is handling it on production): GitHub Actions CI, Sentry, Vercel Analytics + GA4 + PostHog + Microsoft Clarity, order-cleanup cron, WebhookEvent audit log, MSG91 SMS once DLT clears.
- **Phase-2 polish** beyond launch: Cloudinary upload widget + per-product package dimensions, drag-to-reorder for variants/images/specs, bulk CSV import, rich-text Tiptap editor, login-form Turnstile (currently only on register + forgot-password since those are higher-volume bot targets), 2FA setup (SRS §6.11.2), HIBP pwned-password check (SRS §6.1.3).

### Decisions made this session

- **Lockout increments only on (existing user, password mismatch)**, not on missing-user or blocked / deleted / OAuth-only accounts. Incrementing in those cases would let an attacker enumerate by measuring lockout side-channels (e.g. an unknown email never locks, but a known one does). Returning a generic `null` for all four failure modes keeps the response identical.
- **Lockout returns the same generic `null` from `authorize`** on a locked account as on a wrong password. NextAuth surfaces this to the client as a generic "invalid credentials" error — no signal that the account is currently locked vs the password is wrong. The 10-minute window is short enough to not punish legitimate users who fat-fingered, long enough to slow credential-stuffing meaningfully.
- **Lockout uses raw Redis `INCR` + `EXPIRE`**, not the `Ratelimit` sliding-window helper. We need increment-on-failure + clear-on-success semantics; sliding-window's "consume a token on every call" is the wrong shape because successful logins shouldn't tally. The raw INCR pattern is also what the existing rate limiters fall back to in spirit.
- **Lockout window = 10 min, threshold = 5**. Window matches Sprint-2's existing `loginLimiter` IP-throttle 5/min so the account-level gate is one order of magnitude more permissive than the IP gate (lets the IP throttle catch single-source abuse first). Both numbers are configurable as constants for Phase-2 tuning.
- **Turnstile dev fallback is permissive only when `NODE_ENV !== 'production'`**. Production-with-no-secret denies, logs an error. Same fail-closed posture as the cron-secret check in Sprint 5B. Local devs can run `/register` end-to-end without provisioning Cloudflare creds.
- **Turnstile is not on `/login`** in Phase 1. The IP rate limiter (5/min) + per-account lockout (5/10min) cover credential-stuffing; adding Turnstile to login adds friction for every legitimate sign-in. Register + forgot-password are higher-yield bot targets (account creation + password-reset spam) so the widget pays its weight there. Phase-2 can revisit if real abuse data warrants it.
- **Token round-trips on the form via React state**, not via a hidden input that react-hook-form watches. The Turnstile API delivers the token through a callback rather than as a form field, so a small `useState` + `setTurnstileToken` wrapper is the simplest integration. The schema-level field is `nullish()` so a missing token doesn't fail Zod parsing — the Turnstile verifier is the real gate.
- **Explicit-render API + `next/script`**, not auto-render via the `cf-turnstile` div class. Auto-render is simpler but races with React hydration and re-mount cycles; explicit-render gives us deterministic mount/unmount + cleanup via `window.turnstile.remove(widgetId)` on unmount. The `useId()`-derived container id avoids collisions if multiple widgets ever appear on the same page.

### Previous sessions

- **Sprint 1 polish — Admin product CRUD** shipped the full create / edit / soft-archive lifecycle for products with a single-form variant + image + spec editor, FK-protected variant deletion (`VARIANT_IN_USE` 409 when carts/orders reference the variant), wholesale-replace for categories / images / specs, and on-demand revalidation across all catalog surfaces. Squash-merged via PR [#9](https://github.com/) (commit `c60f80b`).
- **Sprint 1 polish — Brand + Category CRUD + search-suggest + pincode fix** shipped the admin Brand and Category create/edit/delete flows (with on-demand revalidation, slug auto-generation, parent cycle prevention), the desktop header search-suggest dropdown (debounced 150ms, full keyboard nav, ARIA combobox), and replaced the PDP pincode-check's Sprint-1-era India-Post-direct fallback with a call to the Sprint-4 `/api/serviceability` endpoint (surfacing metro same-day eligibility). Squash-merged via PR [#8](https://github.com/) (commit `d9b6865`).
- **Sprint 5C — Shiprocket integration + StockMovement audit** shipped the Shiprocket REST client (fetch + module-scoped JWT cache), the shipping service that orchestrates create-order → assign-AWB → request-pickup with rank-based forward-only tracking-webhook updates, the `/api/webhooks/shiprocket` route (constant-time `x-api-key` auth), the `/api/shipping/rates` rate-quote proxy, customer-facing tracking display on `/account/orders/[orderNumber]`, real shipped-email data, and the `StockMovement` audit (deferred from Sprint 4) wired into `placeOrderForCheckout` / `cancelOrder` against a seeded default warehouse. Squash-merged via PR [#7](https://github.com/) (commit `f97000e`).
- **Sprint 5B — Email programme + cart abandonment recovery** shipped the order-shipped, order-delivered, and refund-processed React Email templates with their senders, wired shipped/delivered into the admin transition and refund-processed into the Razorpay webhook (only on the actual `→ PROCESSED` flip), and added the cart abandonment recovery loop (`CartReminder` model with `@@unique([cartId, tier])`, `scanAndRemindAbandonedCarts` walking 1h / 24h / 72h tiers, the `cart-abandoned` template with tier-aware copy, and the `/api/cron/cart-abandonment` endpoint behind `Authorization: Bearer ${CRON_SECRET}`). Squash-merged via PR [#6](https://github.com/) (commit `f816aac`).
- **Sprint 5A — SEO infrastructure + Compliance pages** shipped the sitemap split (sitemap.xml index + sitemap-pages/categories/products), `robots.txt` with parametric URL blocks, layout-level noindex on auth/account/admin, the Home Organization + WebSite + ItemList JSON-LD trio, and seven CP-Rules-2020 + IT-Rules-2021 + DPDP-Act-2023 aware compliance pages (Privacy / Terms / Returns / Shipping / Cancellation / Cookies / Contact with Grievance Officer). Squash-merged via PR [#5](https://github.com/) (commit `88e83e9`).
- **Sprint 4 — Checkout + Razorpay + Order Placement** shipped the single-page accordion checkout (Contact/Address/Shipping/Payment), Razorpay Web Checkout integration with HMAC-SHA256 raw-body webhook verify + idempotent `Payment.gatewayPaymentId @unique`, the order placement TX with optimistic-lock stock decrement and `productSnapshot` snapshots, COD path with ₹49 convenience fee, customer + admin order pages with timeline + cancel/transition gating, and the order-placed React Email template via Resend. Squash-merged via PR [#4](https://github.com/) (commit `1cb7ebf`).
- **Sprint 3 — Cart** shipped the server-side pricing engine (paise-only, GST back-out from inclusive prices), DB-backed cart with `naman_cart_id` cookie + merge-on-login, mini-cart drawer, cart page with quantity stepper / save-for-later / free-shipping bar, and the `/api/cart` + `/api/cart/items/[id]` routes. Variant `version` is read inside cart-add TXs so Sprint 4 could land the optimistic-lock decrement. Squash-merged via PR [#3](https://github.com/) (commit `181cb9b`).
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
- [x] **Brand admin CRUD** — full create / edit / delete via [/admin/brands/new](./app/(admin)/admin/brands/new/page.tsx) + [/admin/brands/[id]](./app/(admin)/admin/brands/[id]/page.tsx) backed by [/api/admin/brands](./app/api/admin/brands/route.ts) + [/api/admin/brands/[id]](./app/api/admin/brands/[id]/route.ts). On-demand revalidates `catalog:brand` + Home.
- [x] **Category admin CRUD** — full create / edit / delete with parent picker + cycle prevention (descendants disabled in dropdown + `assertNoCycle` on the service). [/admin/categories/new](./app/(admin)/admin/categories/new/page.tsx) + [/admin/categories/[id]](./app/(admin)/admin/categories/[id]/page.tsx) + the matching API routes. On-demand revalidates `catalog:category` + `/`, `/category`, `/category/[...slug]`.
- [x] **Product admin CRUD** — full create / edit / soft-archive at [/admin/products/new](./app/(admin)/admin/products/new/page.tsx) + [/admin/products/[id]](./app/(admin)/admin/products/%5Bid%5D/page.tsx) backed by [/api/admin/products](./app/api/admin/products/route.ts) + [/api/admin/products/[id]](./app/api/admin/products/%5Bid%5D/route.ts). Variants diff-by-id (upsert + delete with FK-protected `VARIANT_IN_USE`); categories / images / specs wholesale-replaced. Soft-archive sets `deletedAt` + `status: 'ARCHIVED'` so order history keeps rendering via `productSnapshot`.
- [x] **Header search-suggest dropdown** — debounced 150ms fetch to `/api/search?mode=suggest`, full keyboard nav (ArrowUp/Down/Enter/Esc), ARIA combobox/listbox semantics. Desktop only; mobile keeps the simple form-submit.
- [x] **Pincode-check uses `/api/serviceability`** — Sprint 4's endpoint with the metro same-day flag. Stale Sprint-1-era India-Post-direct fallback retired.
- [x] **On-demand cache revalidation** — admin mutations call `revalidateTag('catalog:*', 'max')` + `revalidatePath` for the Home / category surfaces.
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

**Sprint 2 polish (2026-05-09)** — added on top of the original sprint:

- [x] **Per-account login lockout** — [lib/account-lockout.ts](./lib/account-lockout.ts) tallies failed credentials authorize attempts in a 10-min window, locks at 5; wired into [lib/auth.ts](./lib/auth.ts) authorize.
- [x] **Cloudflare Turnstile** — server-side verifier in [lib/turnstile.ts](./lib/turnstile.ts), `TurnstileWidget` client component, mounted on `/register` and `/forgot-password`.

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
**Status:** IN_PROGRESS — code complete; verification (DB migration, Razorpay test keys, dev-server smoke, ₹1 test transaction, build) tracked in [PENDING.md](./PENDING.md)
**Relevant SRS:** §6.5, §6.6, §12.2

- [x] Single-page accordion checkout (Contact, Address, Shipping, Payment, Review) — [components/shop/checkout/checkout-page.tsx](./components/shop/checkout/checkout-page.tsx) renders four numbered sections + a sticky review sidebar; saved-address radio cards or inline address form with India Post pincode autofill; same-day option auto-disabled outside metro pincodes.
- [x] Pincode serviceability + ETA (`/api/serviceability`) — [lib/services/serviceability.ts](./lib/services/serviceability.ts) wraps the public India Post endpoint and tags metros for same-day; fails open on India Post outage so manual address entry works.
- [x] Razorpay order create (`/api/checkout/session`) — [app/api/checkout/session/route.ts](./app/api/checkout/session/route.ts) places the local order in PENDING (CONFIRMED for COD), then calls Razorpay's `/v1/orders` for online flows. Razorpay 5xx triggers `safeRollbackPlacedOrder` which restores stock and cancels the order so the customer can retry.
- [x] Razorpay Web Checkout iframe integration — [lib/hooks/use-razorpay.ts](./lib/hooks/use-razorpay.ts) lazy-loads `https://checkout.razorpay.com/v1/checkout.js` once per checkout-page mount; the iframe handler POSTs to `/api/orders/verify` on success.
- [x] `/api/orders/verify` — HMAC-SHA256 signature verification on raw body, idempotent payment_id constraint, server-side amount re-check — [app/api/orders/verify/route.ts](./app/api/orders/verify/route.ts) → [verifyAndCapturePayment](./lib/services/payments.ts) verifies the `${order_id}|${payment_id}` HMAC, fetches the live Razorpay payment for an amount recheck (SRS §12.2), then calls the idempotent `confirmOnlinePayment`.
- [x] Order placement with full snapshot (OrderItem.productSnapshot JSON, OrderAddress snapshot) — [lib/services/orders.ts](./lib/services/orders.ts) `placeOrderForCheckout` writes the productSnapshot (name/sku/slug/attributes/hsn/gstRate/brand/image/mrpPaise) + BILLING + SHIPPING address snapshots inside one TX.
- [x] COD path: OTP-on-delivery flag, COD convenience fee — payment_method=COD goes straight to status=CONFIRMED + payment_status=PENDING + gateway=COD, with the ₹49 convenience fee auto-derived in the pricing engine. Courier-side OTP confirmation flips payment_status to CAPTURED on delivery (Sprint 5 wires the carrier webhook).
- [x] `/api/webhooks/razorpay` — handles `payment.captured`, `payment.failed`, `payment.authorized`, `order.paid`, `refund.created`, `refund.processed`, `refund.failed`. Raw-body signature verify, idempotent, returns 2xx within 5s — [lib/services/webhooks.ts](./lib/services/webhooks.ts) verifies the HMAC over `req.text()` before any parse; idempotency rides on `Payment.gatewayPaymentId @unique` + `Refund.gatewayRefundId @unique`.
- [x] Order confirmation page + email (Resend + React Email) — [app/(shop)/checkout/success/page.tsx](./app/(shop)/checkout/success/page.tsx) plus the [order-placed.tsx](./emails/order-placed.tsx) template; `sendOrderPlacedEmail` is best-effort and never throws.
- [x] Customer order list + order detail with timeline — [app/(account)/account/orders/page.tsx](./app/(account)/account/orders/page.tsx) (paginated, status badges, item-thumbnail rail) + [app/(account)/account/orders/[orderNumber]/page.tsx](./app/(account)/account/orders/[orderNumber]/page.tsx) (event timeline, addresses, payment status, [CancelOrderButton](./components/account/cancel-order-button.tsx)).
- [x] Admin order list + status transitions — [app/(admin)/admin/orders/page.tsx](./app/(admin)/admin/orders/page.tsx) (paginated table + status filter chips) + [app/(admin)/admin/orders/[id]/page.tsx](./app/(admin)/admin/orders/[id]/page.tsx) (timeline + [AdminOrderTransitionPanel](./components/admin/admin-order-transition.tsx) gating moves via `nextAdminStatuses(current)`).
- [x] Cancel order (until SHIPPED) — customer + admin both reach `cancelOrder` in [lib/services/orders.ts](./lib/services/orders.ts) which marks the order CANCELLED and increments stock back on each variant. Customer cancel is allowed in `{PENDING, CONFIRMED, PROCESSING}`; admin can additionally cancel up through PROCESSING.

**Acceptance:** End-to-end test transaction (₹1) processes via UPI, card, and COD. Webhook events update order state idempotently. Refund flow works. ✅ Code path complete; final tick on `IN_PROGRESS → DONE` after dev-server smoke + ₹1 Razorpay test transaction + `pnpm build` against a wired DB.

---

### Sprint 5 — Shipping + Notifications + Polish
**Status:** IN_PROGRESS — split into four sub-branches. **5A merged into `develop`** (commit `88e83e9`). **5B merged into `develop`** (commit `f816aac`). **5C code-complete** (typecheck + lint clean; verification gate in [PENDING.md](./PENDING.md)). **5D not started.**
**Relevant SRS:** §6.7, §6.10, §11

#### 5A — SEO infrastructure + Compliance pages
- [x] **SEO**: sitemap.xml index + split sitemaps (sitemap-products, sitemap-categories, sitemap-pages), robots.txt blocking /admin /account /checkout /cart /api + auth-token-bearing pages + parametric `?sort=` / `?page=`, canonical URLs already on Home / PLP / PDP / search, Organization + WebSite JSON-LD on Home, OG/Twitter Card meta inherited from root layout. Layout-level `metadata.robots = { index: false, follow: false }` on `/(auth)`, `/account/*`, `/admin/*`.
- [x] **Compliance pages**: Privacy / Terms / Returns / Shipping / Cancellation / Cookies / Contact (with Grievance Officer per CP (E-Commerce) Rules 2020 + IT Rules 2021 + DPDP Act 2023). All RSC, indexable, with canonical metadata, last-updated date, shared `<LegalArticle>` wrapper. Footer dropped the dead `/about` link and renamed the column "Legal" (Privacy / Terms / Cookies / Cancellation) so every link resolves.

#### 5B — Email programme + cart abandonment
- [x] **Three new transactional templates** ([emails/order-shipped.tsx](./emails/order-shipped.tsx), [emails/order-delivered.tsx](./emails/order-delivered.tsx), [emails/refund-processed.tsx](./emails/refund-processed.tsx)) wired through the existing `EmailLayout` shell. Welcome was already wired in Sprint 2's `/api/auth/verify-email` route, so 5B inherits that. Password-reset email also already shipped (Sprint 2). Order-placed shipped in Sprint 4.
- [x] **Email senders** in [lib/services/order-email.ts](./lib/services/order-email.ts): `sendOrderShippedEmail` / `sendOrderDeliveredEmail` / `sendRefundProcessedEmail`. All best-effort (never throw, log on failure). Shared `trackUrlFor` picks `/account/orders/:n` for signed-in customers and `/checkout/success?orderNumber=...` for guests.
- [x] **Wiring**: [adminTransition](./lib/services/orders.ts) fires shipped/delivered after the TX commits; [onRefundEvent](./lib/services/webhooks.ts) fires refund-processed via a `justProcessed` flag captured inside the TX (only on the actual transition into `PROCESSED`, not on webhook replays).
- [x] **Cart abandonment recovery**: new [CartReminder](./prisma/schema.prisma) model (`@@unique([cartId, tier])`), [lib/services/cart-abandonment.ts](./lib/services/cart-abandonment.ts) `scanAndRemindAbandonedCarts()` that walks tiers `1h / 24h / 72h` with per-tier `maxAgeHours` upper bounds (so first-run doesn't blast everyone), [emails/cart-abandoned.tsx](./emails/cart-abandoned.tsx) shared template with tier-aware copy + cart preview + `Resume checkout` CTA.
- [x] **Cron endpoint**: [/api/cron/cart-abandonment](./app/api/cron/cart-abandonment/route.ts) accepts POST/GET with `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron / QStash compatible). Dev mode (no secret) runs without auth. Returns `{ ok, summary: { perTier, totalSent } }` for monitoring. New `CRON_SECRET` env var documented in `.env.example`.

#### 5C — Shiprocket integration
- [x] **Shiprocket REST client** ([lib/shiprocket.ts](./lib/shiprocket.ts)) — `fetch`-based, no SDK; in-memory token cache with proactive refresh at 9 days (Shiprocket JWT TTL is 10); `ShiprocketResult<T>` discriminated union for graceful degradation; covers `getServiceability`, `createShiprocketOrder`, `assignAwb`, `requestShiprocketPickup`, `trackByAwb`.
- [x] **Shipping service** ([lib/services/shipping.ts](./lib/services/shipping.ts)) — `createShipmentForOrder` orchestrates create-order → assign-AWB → request-pickup with a single local `Shipment` row INSERT; `applyTrackingUpdate` is the rank-based forward-only webhook handler that flips `Order.status` only when the carrier moves us forward and fires shipped/delivered emails on the actual transition.
- [x] **Auto-create shipment on `CONFIRMED → PROCESSING`** — [adminTransition](./lib/services/orders.ts) calls `createShipmentForOrder` after the TX commits. Best-effort: a Shiprocket failure logs a warning but the admin transition still succeeds.
- [x] **Tracking webhook** — [/api/webhooks/shiprocket](./app/api/webhooks/shiprocket/route.ts) verifies the `x-api-key` header against `SHIPROCKET_WEBHOOK_TOKEN` in constant time, always returns 200 (Shiprocket retries on non-2xx), skips `is_return` events.
- [x] **Rate quote endpoint** — [/api/shipping/rates](./app/api/shipping/rates/route.ts) proxies the serviceability endpoint with Zod-validated input; falls open with `available: false` when creds are missing. Phase-1 customer checkout still uses flat tiers (per the [/shipping](./app/(shop)/shipping/page.tsx) policy); the rate endpoint is admin/diagnostic.
- [x] **Customer tracking display** — [/account/orders/[orderNumber]](./app/(account)/account/orders/[orderNumber]/page.tsx) shows a Tracking section above the timeline when a Shipment exists: courier, AWB (mono), formatted ETA, status label, and a `Track` button to the Shiprocket tracking URL.
- [x] **`OrderShippedEmail` reads real Shipment data** — [sendOrderShippedEmail](./lib/services/order-email.ts) now passes `carrier` / `awb` / `estimatedDelivery` from the latest Shipment, falling back to the Sprint 5B null behaviour when no shipment exists.
- [x] **`StockMovement` audit (deferred from Sprint 4)** — [lib/services/inventory.ts](./lib/services/inventory.ts) `recordStockMovements` writes batched audit rows in the same TX as the variant.stock change. Wired into `placeOrderForCheckout` (`SALE`) and `cancelOrder` (`RETURN`). Default warehouse resolved by `code` from `DEFAULT_WAREHOUSE_CODE` (default `'DEFAULT'`), cached after first lookup, skipped silently if not seeded.
- [x] **Default warehouse seed + env vars** — [prisma/seed.ts](./prisma/seed.ts) upserts a Mumbai HQ warehouse with `code: 'DEFAULT'`. `.env.example` adds `SHIPROCKET_PICKUP_LOCATION`, `SHIPROCKET_WEBHOOK_TOKEN`, `DEFAULT_WAREHOUSE_CODE`.

#### 5D — Platform: CI + Sentry + Analytics (NOT STARTED)
- [ ] GitHub Actions CI workflow (lint, typecheck, vitest, `prisma migrate dry-run`), Vercel preview + staging environments wired to the develop / main branches.
- [ ] Sentry SDK with sourcemaps and breadcrumb wiring for Razorpay / Shiprocket / Resend errors.
- [ ] Vercel Analytics, GA4, PostHog (product analytics + feature flags), Microsoft Clarity (heatmaps + session replays with sensitive-field masking).
- [ ] Order cleanup cron for abandoned PENDING orders (QStash @ 30-min interval) + WebhookEvent audit log keyed by `x-razorpay-event-id` (deferred from Sprint 4 polish).
- [ ] MSG91 SMS for OTP / order placed / delivery slot / COD OTP — wires once DLT registration clears (Sprint 2 carry-over blocker).

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
| 2026-05-08 | **Razorpay HTTP client = `fetch` + `node:crypto` (no SDK)** | Phase 1 needs four calls (create order / fetch payment / refund / verify signatures). The REST API is stable, our wrappers are <200 lines, and skipping the SDK keeps the bundle lean. |
| 2026-05-08 | **Auto-capture is the Phase-1 default** (`payment_capture: 1`) | Manual capture (verify-before-charge) is reserved for Sprint 5 polish. Sprint 4 ships the simple, idempotent path. |
| 2026-05-08 | **Webhook idempotency lives on the database, not in code** | `Payment.gatewayPaymentId @unique` and `Refund.gatewayRefundId @unique` make duplicate webhook deliveries cheap to handle. Same idea for `/api/orders/verify` — `confirmOnlinePayment` short-circuits if the webhook already promoted the order. |
| 2026-05-08 | **HMAC verify happens before any `JSON.parse`** | The route reads `req.text()` and only parses inside the verifier success branch. `node:crypto.timingSafeEqual` for the comparison. |
| 2026-05-08 | **Stock decrement happens at order placement** with optimistic lock UPDATE WHERE version = ? | Cart-add only reads `version` (Sprint 3 prep). The single UPDATE bumps stock + version atomically; 0-row return = `STOCK_CONFLICT` and we bail (no retry). Cancel restores stock + bumps version. |
| 2026-05-08 | **Razorpay create-order is OUTSIDE the placement TX** | External HTTP shouldn't hold a Postgres transaction open. `safeRollbackPlacedOrder` runs separately to restore stock + cancel the order if Razorpay returns 5xx. |
| 2026-05-08 | **Server-side amount recheck at verify time** (SRS §12.2) | `verifyAndCapturePayment` calls `fetchRazorpayPayment(payment_id)` and asserts `payment.amount === order.total` in paise before flipping CAPTURED. Signature alone proves payment happened; amount check guards against substitution. |
| 2026-05-08 | **Order numbers `NMN<YYYYMMDD>-<6-char-nanoid>`** with I/O/0/1 excluded for legibility | Reads like a ticket on emails / invoices. ~1B combinations per day; the `@unique` constraint is the hard ceiling. |
| 2026-05-08 | **`OrderItem.productSnapshot` freezes catalog state at placement** (name/sku/slug/attributes/hsn/gstRate/brand/image/mrpPaise) | Order pages never re-join Product on render — even a deleted product still renders the right thumbnail and name. Customer + admin tables read from the snapshot only. |
| 2026-05-08 | **Billing snapshot always written, even when `billingSameAsShipping`** | Saves downstream code (invoice render, refund processing, CRM export) from special-casing the boolean. The 1-row duplication is cheap. |
| 2026-05-08 | **Phase-1 shipping = flat tiers** (Standard ₹49 / free above ₹999, Express ₹99, Same-day ₹199 metro-only) | SRS §6.7's per-pincode rate engine + Shiprocket lands in Sprint 5. Constants in `lib/pricing-shared.ts` so Sprint 5 swaps them out without touching call sites. |
| 2026-05-08 | **COD convenience fee = ₹49 per order**, derived from `paymentMethod === 'COD'` in the pricing engine | SRS §6.5.4 mentions "configurable per pincode tier" — Phase 2 polish. |
| 2026-05-08 | **Same-day delivery gated to metro pincodes** (`110*/400*/560*/700*/600*/500*`) | Delhi / Mumbai / Bengaluru / Kolkata / Chennai / Hyderabad. Checkout disables the radio outside these tiers. Should converge to one source of truth in Sprint 5 (currently in `serviceability.ts` + checkout client). |
| 2026-05-08 | **Pricing constants live in `lib/pricing-shared.ts` (not `services/pricing.ts`)** | The full engine stays `'server-only'` (uses `Prisma.Decimal`); the constants + `shippingPaiseFor` / `codFeeFor` need the client checkout page to render. Splitting them is the cleanest way to share without leaking Prisma into the browser bundle. |
| 2026-05-08 | **Guest checkout allowed** (proxy.ts no longer redirects `/checkout/*` to /login) | Per SRS §6.5.1. The success page handles signed-out viewers by routing the "view order" CTA through `/login`. |
| 2026-05-08 | **Razorpay Web Checkout `<script>` is lazy-loaded via the `useRazorpay` hook** | Cart and PDP visitors don't need the iframe loader; only `/checkout` does. Hook fetches once per page mount and resolves on subsequent calls. |
| 2026-05-08 | **Admin status transitions gated by `nextAdminStatuses(current)`** | PENDING → CONFIRMED / CANCELLED, CONFIRMED → PROCESSING / CANCELLED, PROCESSING → SHIPPED / CANCELLED, SHIPPED → OUT_FOR_DELIVERY → DELIVERED. Customer cancel is a separate path (PENDING / CONFIRMED / PROCESSING only). |
| 2026-05-08 | **Order email send is best-effort + idempotent** at the application layer | Function never throws — Resend outage doesn't fail order placement. Cart abandonment / shipping notifications are Sprint 5 work. |
| 2026-05-08 | **Sprint 5 split into 5A / 5B / 5C / 5D sub-branches** | Sprint 5 bundles SEO, compliance, the rest of the email programme, Shiprocket, MSG91, CI, Sentry, and analytics. One branch would be unreviewable. Splitting along functional seams lets unblocked work (5A: SEO + compliance) ship while creds-blocked work (5C: Shiprocket, 5D: analytics, MSG91) waits. |
| 2026-05-08 | **Sitemap split = manual XML route handlers, not `MetadataRoute.Sitemap`** | Next's typed sitemap helper produces a flat list at `/sitemap.xml`; SRS §11.1 calls for a sitemap *index* referencing `sitemap-products.xml` / `sitemap-categories.xml` / `sitemap-pages.xml`. Hand-rolled XML in [lib/utils/sitemap-xml.ts](./lib/utils/sitemap-xml.ts) gives precise filename + lastmod control. Sub-sitemaps use `safe()` so DB outage falls open to an empty `<urlset>` rather than a 500. |
| 2026-05-08 | **Compliance pages live under `app/(shop)/{slug}/page.tsx`** | Share the shop layout's Header/Footer/bottom-nav for consistent chrome and keep URLs flat (`/privacy` not `/legal/privacy`). A shared `<LegalArticle>` wrapper provides typography + breadcrumbs + last-updated date — no extra layout file needed. |
| 2026-05-08 | **Compliance placeholders are visible `[TODO: …]` strings** | `storeConfig` falls back to marked placeholders when env vars are unset, so a missed legal-name / GSTIN / grievance-officer value renders visibly on the legal page rather than silently shipping. Grep-able in pre-launch QA. |
| 2026-05-08 | **Robots.txt blocks parametric URLs** (`/*?*sort=`, `/*?*page=`) | PLP filter/sort variants all canonicalise back to the parent category. Crawlers following them burn crawl budget on duplicate content. Belt-and-suspenders alongside the page-level `<link rel="canonical">`. |
| 2026-05-08 | **Layout-level `metadata.robots = noindex`** on `/(auth)`, `/account/*`, `/admin/*` | Defense in depth alongside robots.txt. A misconfigured CDN that ignores robots.txt still gets a `<meta name="robots" content="noindex">` on every private page. |
| 2026-05-08 | **Footer dropped the dead `/about` link** | Stubbing a meaningless About page would have produced low-quality crawl content. Better to drop it until there's a real brand story to tell. The Company column was renamed "Legal" (Privacy / Terms / Cookies / Cancellation) so every footer link now resolves. |
| 2026-05-08 | **Grievance Officer disclosure on the Contact page** is the centrepiece — boxed, dl-formatted, with 48-hr ack / 30-day resolution SLA + National Consumer Helpline escalation | India's CP (E-Commerce) Rules 2020 + IT Rules 2021 + DPDP Act 2023 all converge on this exact disclosure shape. Making it the visual anchor of `/contact` (rather than a footnote) shows we've thought about it. |
| 2026-05-08 | **`storeConfig` is `'server-only'`** even though most values are public-facing | Prevents accidental imports into client components and forces the right pattern (RSC reads it, passes values via props, or uses `NEXT_PUBLIC_*` for client-side rendering). |
| 2026-05-08 | **Welcome email stays as-is from Sprint 2** | Sprint 2 already wired `WelcomeEmail` into `/api/auth/verify-email` (fires on first verification). Re-implementing in 5B would risk double-sending. The 5B PROGRESS plan listed welcome only because it's listed in SRS §6.10; reading the existing code showed it was already in place. |
| 2026-05-08 | **Cart-abandonment reminders live in a separate `CartReminder` table**, not fields on `Cart` | Updating fields on `Cart` would auto-bump `Cart.updatedAt` (`@updatedAt` is Prisma-managed), which is the activity signal the abandonment scan keys off. A separate table sidesteps that and makes the per-(cart, tier) idempotency the database's job (`@@unique([cartId, tier])`). |
| 2026-05-08 | **Each abandonment tier sends ONCE per cart, ever** (Phase 1) | If a customer abandons → tier-1 email → comes back → adds an item → abandons again, Phase 1 doesn't send another tier-1. Phase 2 graduates to per-abandonment-cycle reminders, probably via a `Cart.lastAbandonmentCycleStartedAt` field. |
| 2026-05-08 | **Refund email fires only on actual `→ PROCESSED` transition**, not every `refund.processed` webhook | A `justProcessed` flag is captured inside the existing-status check inside the TX. Webhook replays (same `gatewayRefundId` already at `PROCESSED`) early-return from the TX without setting the flag, so no duplicate email. |
| 2026-05-08 | **Email senders are best-effort, never throw** | Consistent with the Sprint 4 `sendOrderPlacedEmail` pattern. CLAUDE.md's principle: an order's lifecycle never fails because Resend is having a bad day. |
| 2026-05-08 | **`adminTransition` awaits the email send after the TX commits** | The admin sees a sub-500ms Resend latency in the response, but in exchange the response only returns when the email actually went out (or failed-and-was-logged). Fire-and-forget would have masked Resend issues. |
| 2026-05-08 | **Shipped-email courier/AWB/ETA fields stay null until Sprint 5C** | The template already shapes for them and hides cleanly when both are null. 5C populates them from the Shiprocket label-create response. |
| 2026-05-08 | **Cron auth = bearer secret, not QStash signed JWT** | The bearer pattern is what Vercel Cron and QStash both natively support, lets us run the cron from either platform interchangeably, and avoids pulling in `@upstash/qstash` for one verifier. Phase 2 can graduate to QStash JWT verify if signed scheduled tasks become useful. |
| 2026-05-08 | **Cron has a per-tier `maxAgeHours` upper bound** (24h / 72h / 14d) | First-run protection: when the cron is initially scheduled, every cart in the database has `updatedAt < now - 1h`. Without an upper bound the first run would email everyone with an old cart. The maxAge clamps each tier to a sensible window. |
| 2026-05-08 | **Cron route allows GET in dev** (when `CRON_SECRET` unset) | Lets curl/browser trigger a manual run for QA. With `CRON_SECRET` set, GET also requires the bearer header — same auth path as POST. |
| 2026-05-09 | **Shiprocket REST client = `fetch` + token cache, no SDK** | Same precedent as Sprint 4's Razorpay client. Phase 1 needs ~6 endpoints; the official Postman collection covers them without npm overhead. The `ShiprocketResult<T>` discriminated union forces every call site to handle creds-missing / network / HTTP-5xx as best-effort. |
| 2026-05-09 | **Shiprocket token cached in module memory, 9-day TTL** | Shiprocket JWTs last 10 days; we proactively refresh at 9. On 401 we refresh once and retry. Multi-instance deployments may want Redis; revisit if login-rate becomes an issue. |
| 2026-05-09 | **Shiprocket order creation fires on `CONFIRMED → PROCESSING`** | Earlier (placement) is too early — online orders sit in PENDING until payment confirms; we'd be filling Shiprocket with un-paid junk. Later (`→ SHIPPED`) is too late — we need an AWB *before* the courier picks up. PROCESSING is "warehouse is packing" which is exactly when the create-order + assign-AWB + request-pickup chain belongs. |
| 2026-05-09 | **Shiprocket order-create lives OUTSIDE the placement TX** | Same principle as Razorpay create-order in Sprint 4: external HTTP shouldn't hold a Postgres transaction open. Trade-off accepted: Order can move to PROCESSING with no Shipment row if Shiprocket is down — admin retries manually (logged warning). |
| 2026-05-09 | **`request_pickup` fires automatically right after `assign_awb`** | Phase 1 is single-warehouse, single-courier-per-order; deferring pickup adds an admin step with no operational benefit. Phase 2 polish: a "pause pickup" admin toggle for batch dispatch. |
| 2026-05-09 | **Tracking webhook is forward-only via rank tables** (`SHIPMENT_FORWARD_RANK`, `ORDER_FORWARD_RANK`) | Carriers occasionally emit out-of-order events ("In Transit" arriving after "Out for Delivery"). Without forward-only enforcement we'd flap statuses + fire duplicate emails. Audit-log loss of transient backwards events is acceptable. |
| 2026-05-09 | **Webhook auth = `x-api-key` shared secret**, not HMAC | Shiprocket only offers this auth shape ("Security token should be an x-api-key"). Constant-time compare. Production-with-no-token denies; dev-with-no-token accepts (warned). Strictly weaker than Razorpay's HMAC-SHA256-over-raw-body but acceptable: impact is "force Shipment status updates" not "induce payments", and an attacker would also need to know the AWB. |
| 2026-05-09 | **Status mapping is string-fuzzy, not status-id-driven** | Shiprocket's `current_status_id` integer is undocumented across courier partners and changes between API versions. Lower-cased substring matching (`includes('delivered')`, `includes('out for delivery')`) is more durable across the ~50 status strings their docs sample-show. |
| 2026-05-09 | **`StockMovement` writes inside the placement / cancel TX** | The Sprint-4 deferral was "no warehouse exists". Sprint 5C seeds one. Co-locating the audit row with the variant.stock change in the same TX keeps them consistent — TX rollback rolls both back together. |
| 2026-05-09 | **Default warehouse keyed by `code`, not by id** | Operationally simpler — `DEFAULT_WAREHOUSE_CODE` env var is human-readable; lets admin add warehouses without code changes. Multi-warehouse routing (per-pincode origin selection) is Phase 3. |
| 2026-05-09 | **Default package = 30×30×10 cm at 500 g/item** | Reasonable fit for typical electronics in our seed catalogue. Per-product package dimensions on `ProductVariant` is a Phase-2 catalog enhancement (the schema doesn't have a dimension JSON yet). |
| 2026-05-09 | **`/api/shipping/rates` is admin/diagnostic only in Phase 1** | Customer-facing checkout still uses flat-tier engine because [/shipping](./app/(shop)/shipping/page.tsx) policy advertises those rates. Surfacing variable Shiprocket quotes at checkout is a Phase-2 commercial decision (pass real costs vs absorb-and-flat-price). |
| 2026-05-09 | **Customer tracking section is RSC, no real-time polling** | The Shiprocket webhook already pushes status changes into our DB, so a page reload picks up the latest. Phase-2 can add SSE / polling refresher if customers complain about staleness. |
| 2026-05-08 | **`StockMovement` audit deferred to Sprint 5** | The model requires a `warehouseId` and Phase-1 doesn't seed warehouses. Direct `ProductVariant.stock` decrement is correct; the audit row joins the inventory pipeline alongside Shiprocket. |
| 2026-05-09 | **Admin auth gate = `requireRole('CATALOG_MANAGER', 'SUPER_ADMIN')`** on every catalog mutation route + page | Matches the Sprint-4 admin-orders precedent. Pages soft-redirect to `/admin/dashboard` rather than 403 so a misnavigated CATALOG_MANAGER lands somewhere sensible. |
| 2026-05-09 | **Cycle prevention for categories is two-layered** (UI disables descendants, service `assertNoCycle` walks parent chain) | The disabled `<option>` in the parent picker is a UX nicety; the server walk is the trust boundary. Walk has a guard set so a corrupt DB cycle short-circuits rather than infinite-loops. |
| 2026-05-09 | **Slug auto-generates from name until manually edited** | The form watches `name` and rewrites `slug` via `slugify()` only while the user hasn't touched the slug field. Reduces friction on the create flow without surprising admins who deliberately set a custom slug. |
| 2026-05-09 | **`revalidateTag(tag, 'max')` on every admin mutation** | Next.js 16's API now requires the cache profile arg; `'max'` matches the on-demand semantics customers expect from an admin save. Combined with `revalidatePath(...)` for the routes that aren't tag-wrapped (Home, /category, etc.). |
| 2026-05-09 | **No optimistic UI on the admin forms** — submit → server roundtrip → `router.refresh()` + redirect | The list re-fetches on next render. Phase-2 polish could add toast notifications + optimistic updates, but Phase 1 prioritises correctness over snappiness for low-frequency admin actions. |
| 2026-05-09 | **Logo / image fields are URL-only inputs in Phase 1** | The schema already expected `z.url()`. The Cloudinary upload widget is operational follow-up tied to provisioning Cloudinary creds. Until that lands, admins paste a URL — same shape as the seeded placeholder images. |
| 2026-05-09 | **Search-suggest debounced at 150ms** + AbortController | Faster than 100ms feels twitchy with India-typical pg_trgm latency; slower than 200ms feels sluggish. 150ms matches what shipped autocompletes (Algolia, Stripe Atlas) use. |
| 2026-05-09 | **Suggest dropdown uses `<div role="listbox">` + `<div role="option" tabIndex={-1}>`** | Biome's a11y rule rejects interactive ARIA roles on `<ul>`/`<li>`; the WAI-ARIA combobox spec actually expects div containers with the input keeping focus and `aria-activedescendant` pointing at the highlighted option. |
| 2026-05-09 | **Mobile search-bar keeps the simple form-submit behaviour** (no dropdown on small viewports) | The dropdown would consume too much screen real estate on mobile. Mobile users hit Enter and land on `/search?q=...`. Phase-2 can add a full-screen mobile-optimised suggest UI. |
| 2026-05-09 | **PDP pincode-check moved to `/api/serviceability`** (was India-Post-direct) | Replaces a Sprint-1-era stale TODO. The internal endpoint surfaces the Sprint 4 metro flag, so the success copy gracefully advertises same-day eligibility for Delhi / Mumbai / Bengaluru / Kolkata / Chennai / Hyderabad. |
| 2026-05-09 | **Product variants diff by `id`** on update | SKU changes are common during catalog cleanup; using `id` as the stable key lets admins rename SKUs without losing the row's history. New variants (no `id`) are inserted; missing existing variants are deleted, with a typed `VARIANT_IN_USE` rejection if FK refs (carts/orders) prevent it. |
| 2026-05-09 | **Soft delete for products** (`deletedAt` + `status: 'ARCHIVED'`) | Hard delete is impossible — order items reference variants under `RESTRICT`. Soft delete vanishes the product from public surfaces while order history keeps rendering via `OrderItem.productSnapshot`. The `ARCHIVED` status is a UI hint for the admin table; `deletedAt` is the trust boundary the catalog reads filter on. |
| 2026-05-09 | **Categories / images / specs wholesale-replaced**, only variants are upserted-by-id | Categories are a thin M2M; images and specs have only `productId` FK so delete-and-recreate is safe and simple. Wholesale replace also makes "drag to reorder" implementable in Phase 2 without changing the API contract. Variants need diff because they're FK-referenced by carts and orders. |
| 2026-05-09 | **Variant attributes round-trip via a `key=value`-per-line textarea**, parsed before submit | A structured key-value-row editor is nicer UX but pushes complexity into the form for marginal benefit. Phase 2 can graduate when SKUs commonly hold >5 attributes. Same call for hazmat flags + box contents (comma-separated text). |
| 2026-05-09 | **Product form does its own `safeParse` before the network call** | Catches type mismatches client-side without paying the round-trip; the server-side validation is still the trust boundary. No `zodResolver` on the form because react-hook-form's resolver runs on the form-shape (with `attributesText` strings) not the schema-shape (with parsed `attributes` records). The manual approach surfaces one first-issue message rather than per-field hints — Phase-2 polish can split. |
| 2026-05-09 | **Per-account lockout uses raw INCR + EXPIRE**, not the sliding-window Ratelimit helper | We need increment-on-failure + clear-on-success semantics; sliding-window's "consume a token on every call" is the wrong shape because successful logins shouldn't tally. The raw INCR pattern is also what the existing rate limiters fall back to in spirit. |
| 2026-05-09 | **Lockout increments only on (existing user, password mismatch)** | Incrementing on missing-user / blocked / OAuth-only would let an attacker enumerate by measuring lockout side-channels. Returning a generic null in all four failure modes keeps the response identical. |
| 2026-05-09 | **Lockout window = 10 min, threshold = 5** | Matches Sprint 2's existing `loginLimiter` IP-throttle of 5/min so the account-level gate is one order of magnitude more permissive (lets the IP throttle catch single-source abuse first). Constants are configurable for Phase-2 tuning. |
| 2026-05-09 | **Turnstile dev fallback is permissive only when `NODE_ENV !== 'production'`** | Local devs can run /register end-to-end without provisioning Cloudflare creds. Production-with-no-secret denies and logs an error — fail-closed posture matching Sprint 5B's cron-secret check. |
| 2026-05-09 | **Turnstile is on /register + /forgot-password but NOT /login** in Phase 1 | The IP rate limiter (5/min) + per-account lockout (5/10min) cover credential-stuffing on login. Adding a Turnstile challenge to every legitimate sign-in adds friction with little marginal benefit; register + forgot-password are higher-yield bot targets (account creation + password-reset spam). Phase-2 can revisit if real abuse data warrants it. |
| 2026-05-09 | **Turnstile token rides through React state**, not a hidden form field | The Turnstile API delivers the token via callback, not as a form input. A small `useState` + setter is simpler than wiring it through react-hook-form. The schema-level field is `nullish()` so a missing token is the verifier's problem, not Zod's. |
| 2026-05-09 | **Explicit-render API + `next/script`**, not the auto-render `cf-turnstile` div class | Auto-render races with React hydration and re-mount cycles. Explicit-render gives deterministic mount/unmount + cleanup via `window.turnstile.remove(widgetId)` on unmount. The `useId()`-derived container id avoids collisions if multiple widgets ever appear on the same page. |

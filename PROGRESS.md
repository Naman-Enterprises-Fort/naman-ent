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
**Sprint:** Sprint 5A — SEO infrastructure + Compliance pages
**Status:** CODE COMPLETE — typecheck + lint clean (only the two pre-existing nursery warnings remain); verification (`pnpm build`, Lighthouse SEO score on Home, Google Search Console submission) tracked in [PENDING.md](./PENDING.md). Sprint 5 is split into multiple branches; 5B (email programme), 5C (Shiprocket), 5D (CI + Sentry + analytics) are still ahead.

### Done this session

- **Branch hygiene** — Sprint 5 is too large for a single branch, so it is being split. 5A landed on `feature/sprint-5-seo-compliance`; subsequent slices each get their own `feature/sprint-5-<slug>` branch and PR. Merged to `develop` independently.
- **Store-wide identity config** — [lib/content/store-config.ts](./lib/content/store-config.ts) consolidates the legal name, GSTIN, registered address, support email/phone, grievance officer name/email/designation, policy effective date, and jurisdiction. Every value falls back to a visible `[TODO: …]` placeholder when its env var is unset, so a forgotten value surfaces in the rendered legal page rather than silently shipping. Marked `'server-only'` so client components can't import it. Compliance env vars are now in [.env.example](./.env.example) under "Compliance / store identity".
- **Sitemap split per SRS §11.1** — manual route handlers, no Next.js `MetadataRoute` magic, because we need a sitemap *index* (Next's helper produces a flat list).
  - [app/sitemap.xml/route.ts](./app/sitemap.xml/route.ts) — sitemap INDEX referencing the three sub-sitemaps. Revalidates every 10 min.
  - [app/sitemap-pages.xml/route.ts](./app/sitemap-pages.xml/route.ts) — Home, `/category`, plus the 7 legal pages.
  - [app/sitemap-categories.xml/route.ts](./app/sitemap-categories.xml/route.ts) — every active category, ordered by `updatedAt` desc; ISR 1 hr.
  - [app/sitemap-products.xml/route.ts](./app/sitemap-products.xml/route.ts) — every `ACTIVE` non-deleted product (cap 45,000 per sitemap to stay under Google's 50k ceiling); ISR 1 hr.
  - All four routes use the `safe()` wrapper so an unreachable Neon doesn't 500 the sitemap. Hand-rolled XML in [lib/utils/sitemap-xml.ts](./lib/utils/sitemap-xml.ts) with proper escaping + ISO-8601 `lastmod`.
- **Robots.txt** — [app/robots.ts](./app/robots.ts) blocks `/admin`, `/account`, `/checkout`, `/cart`, `/api/`, the auth-token-bearing pages (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`), `/search`, and the parametric `?sort=` / `?page=` URLs that would otherwise cause duplicate-content crawl waste. Lists the sitemap index and the canonical host.
- **Site-wide noindex on private surfaces** — `metadata.robots = { index: false, follow: false }` exported from `(auth)/layout.tsx`, `(account)/account/layout.tsx`, and `(admin)/admin/layout.tsx`. Combines with the page-level robots already on `/cart`, `/checkout`, `/checkout/success`, and `/search` for defense in depth.
- **Home JSON-LD trio** — [app/(shop)/page.tsx](./app/(shop)/page.tsx) now emits `Organization` (with `contactPoint` carrying support email + phone, area `IN`, languages `en`/`hi`), `WebSite` (with `SearchAction` so Google's site-search box can route to `/search?q=…`), and the existing `ItemList` for the Trending strip. Both `organizationJsonLd` and the new `websiteJsonLd` live in [lib/utils/seo.ts](./lib/utils/seo.ts).
- **Compliance pages — 7 pages, India-CP-Rules-aware** — every page is RSC, indexable, with proper canonical, last-updated date, `LegalArticle` wrapper ([components/legal/legal-article.tsx](./components/legal/legal-article.tsx)) for consistent typography/breadcrumbs, and a final "Contact" section linking back to the Grievance Officer.
  - [/privacy](./app/(shop)/privacy/page.tsx) — DPDP Act 2023 + IT Rules 2011 wording: scope, data we collect, why, who we share with (Razorpay/Shiprocket/Cloudinary/Resend/MSG91 listed by name), retention (8-yr tax window), Data Principal rights, security, children, cross-border transfers, changes, contact.
  - [/terms](./app/(shop)/terms/page.tsx) — 16-section Terms of Use: acceptance, eligibility (18+, India residency for COD), account, orders/pricing/GST, payment, shipping/returns/cancellation cross-links, IP, user content, acceptable use, disclaimer, indemnity, governing law (Indian Contract Act + Consumer Protection Act 2019), jurisdiction.
  - [/returns](./app/(shop)/returns/page.tsx) — 7-day window, eligibility, non-returnable list, step-by-step return flow, inspection + refund timelines (5–7 business days), replacement, manufacturer warranty.
  - [/shipping](./app/(shop)/shipping/page.tsx) — pan-India coverage, Standard/Express/Same-day timelines, the actual ₹49/free-above-₹999/₹99/₹199 rate card from Sprint 4's pricing engine, COD ₹49 convenience fee + delivery OTP, tracking, failed-delivery re-attempts, damaged-package refusal flow.
  - [/cancellation](./app/(shop)/cancellation/page.tsx) — customer-cancellation window (`PENDING/CONFIRMED/PROCESSING` per Sprint 4's `nextAdminStatuses` map), how-to, our-cancellation cases, refund timelines per payment method, partial-cancellation handling.
  - [/cookies](./app/(shop)/cookies/page.tsx) — essential (authjs session, CSRF, `naman_cart_id`, theme), analytics (Vercel/GA4/PostHog/Clarity — wired in Sprint 5D), third-party (Razorpay iframe, Cloudflare Turnstile), browser controls.
  - [/contact](./app/(shop)/contact/page.tsx) — customer support email/phone block + registered office + Grievance Officer card (name/designation/email/address) with the 48-hr acknowledgement / 30-day resolution SLA per CP (E-Commerce) Rules 2020 + IT Rules 2021 + DPDP Act 2023, plus the National Consumer Helpline escalation path.
- **Footer cleaned up** — [components/shop/footer.tsx](./components/shop/footer.tsx) replaces the previously dead `/about` link with `/cookies`, retitles the column "Legal" (Privacy / Terms / Cookies / Cancellation) so every link in the footer now resolves to a real page.
- **`.env.example` extended** — new "Compliance / store identity" section with `STORE_LEGAL_NAME`, `STORE_REGISTERED_ADDRESS`, `STORE_GSTIN`, `STORE_CIN`, `SUPPORT_EMAIL`, `SUPPORT_PHONE`, and the three `GRIEVANCE_OFFICER_*` variables. The legal pages render visible `[TODO: …]` placeholders whenever any of these are unset, so a missed value never silently ships.

### Verification

| Command | Result |
|---|---|
| `pnpm typecheck` (`tsc --noEmit`) | ✅ exit 0, zero errors |
| `pnpm lint` (`biome lint .`) | ✅ exit 0, zero new warnings (the same 2 pre-existing nursery `noArrayIndexKey` warnings on Sprint-1 breadcrumbs/pagination remain accepted) |
| `pnpm prisma validate` | ✅ schema valid (Sprint 5A makes no schema changes) |
| `pnpm build` | ⏸️ deferred — same Neon block as prior sprints. Sitemap routes use `safe()` so an unreachable DB falls open to an empty `<urlset>` rather than failing the build. |

### Up next — to take Sprint 5A from code-complete to merged

1. **`pnpm build`** — must succeed end-to-end, with the four sitemap routes + `robots.ts` + 7 legal pages prerendering or SSR-caching cleanly.
2. **Manual smoke** — `pnpm dev` + visit `/privacy`, `/terms`, `/returns`, `/shipping`, `/cancellation`, `/cookies`, `/contact`, `/sitemap.xml`, `/sitemap-pages.xml`, `/sitemap-categories.xml`, `/sitemap-products.xml`, and `/robots.txt`. Confirm canonical and OG metadata in each `<head>`.
3. **Lighthouse mobile on Home, PLP, PDP** — confirm SEO ≥ 95 with the new JSON-LD + sitemap presence.
4. **Footer link audit** — every link in [components/shop/footer.tsx](./components/shop/footer.tsx) should now resolve (no more `/about` 404).

### What's still ahead in Sprint 5

- **5B — Email programme + cart abandonment** (welcome / shipped / delivered / refund React Email templates, abandonment recovery via QStash).
- **5C — Shiprocket integration** (rate quote, label/AWB, tracking webhook, returns pickup).
- **5D — Platform** (GitHub Actions CI, Sentry, Vercel Analytics + GA4 + PostHog + Microsoft Clarity, plus the Sprint-5-deferred polish items: order cleanup cron, StockMovement audit, WebhookEvent audit, MSG91 SMS once DLT clears).

### Decisions made this session

- **Sprint 5 is split into four sub-branches (5A–5D), each with its own PR.** Sprint 5 bundles SEO, compliance, the rest of the email programme, Shiprocket, MSG91, CI, Sentry, and analytics — too much for one branch to stay reviewable. Splitting along functional seams keeps each PR small and lets unblocked work (5A: SEO + compliance) ship while creds-blocked work (5C: Shiprocket, 5D: GA4/PostHog/Sentry, MSG91) waits.
- **Compliance pages live under `app/(shop)/{slug}/page.tsx`, not a dedicated `(legal)` route group.** They share the existing shop layout's `<Header>` + `<Footer>` + `<MobileBottomNav>` + `<MiniCart>` so the look-and-feel matches the rest of the site, and the URLs stay flat (`/privacy`, `/terms`, …) rather than nested. A shared `<LegalArticle>` wraps each page for consistent typography, breadcrumbs, and last-updated date.
- **Sitemap split = manual XML route handlers, not Next.js `MetadataRoute.Sitemap`.** Next's typed helper produces a flat list at `/sitemap.xml`; we needed a sitemap *index* referencing per-resource sitemaps with the SRS-mandated filenames (`sitemap-products.xml`, `sitemap-categories.xml`, `sitemap-pages.xml`). Hand-rolled XML in [lib/utils/sitemap-xml.ts](./lib/utils/sitemap-xml.ts) escapes properly and emits ISO-8601 `lastmod`. Each sub-sitemap uses `safe()` so a Neon outage degrades to an empty `<urlset>` rather than a 500.
- **Compliance placeholders are visible `[TODO: …]` strings, not silent empty fallbacks.** Every value in `storeConfig` falls back to a marked placeholder when its env var is unset, so a missed legal-name / GSTIN / grievance-officer value renders visibly on the legal page rather than silently shipping. The same `[TODO: …]` substring is grep-able in pre-launch QA.
- **`storeConfig` is `'server-only'`** even though all of its values are public-facing. Prevents accidental imports into client components and forces the right pattern (RSC reads it, passes values down as props, or uses `NEXT_PUBLIC_*` for client-side rendering).
- **Robots.txt blocks parametric URLs** (`/*?*sort=`, `/*?*page=`) on top of the obvious `/admin /account /checkout /cart /api/` paths. Search engines following PLP filter / sort variants would otherwise burn crawl budget on duplicate-content URLs that all canonicalise back to the parent category.
- **Auth/account/admin layouts export `metadata.robots = { index: false, follow: false }`** for defense in depth alongside `robots.txt`. A misconfigured CDN that ignores `robots.txt` (or a malicious crawler) still gets a `<meta name="robots" content="noindex">` on every page in those groups.
- **Home gets three JSON-LD blocks (Organization, WebSite, ItemList).** Organization carries `contactPoint` (support email + phone, `areaServed: IN`, languages `en` / `hi`). WebSite carries the `SearchAction` so Google's site-search box deep-links into `/search?q=...`. ItemList for the Trending strip already shipped in Sprint 1.
- **Footer dropped the dead `/about` link** rather than stub a meaningless About page. The Company column became "Legal" (Privacy / Terms / Cookies / Cancellation) so every footer link now resolves to a real page. About copy can come back when there's an actual brand story to tell.
- **Grievance Officer block is the Contact page's centrepiece** (boxed, dl-formatted, with the 48-hour ack / 30-day resolution SLA + National Consumer Helpline escalation path). India's CP (E-Commerce) Rules 2020 + IT Rules 2021 + DPDP Act 2023 all converge on this exact disclosure shape.

### Previous sessions

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
**Status:** IN_PROGRESS — split into four sub-branches. **5A merged-pending** (typecheck + lint clean; verification gate in [PENDING.md](./PENDING.md)). **5B / 5C / 5D not started.**
**Relevant SRS:** §6.7, §6.10, §11

#### 5A — SEO infrastructure + Compliance pages
- [x] **SEO**: sitemap.xml index + split sitemaps (sitemap-products, sitemap-categories, sitemap-pages), robots.txt blocking /admin /account /checkout /cart /api + auth-token-bearing pages + parametric `?sort=` / `?page=`, canonical URLs already on Home / PLP / PDP / search, Organization + WebSite JSON-LD on Home, OG/Twitter Card meta inherited from root layout. Layout-level `metadata.robots = { index: false, follow: false }` on `/(auth)`, `/account/*`, `/admin/*`.
- [x] **Compliance pages**: Privacy / Terms / Returns / Shipping / Cancellation / Cookies / Contact (with Grievance Officer per CP (E-Commerce) Rules 2020 + IT Rules 2021 + DPDP Act 2023). All RSC, indexable, with canonical metadata, last-updated date, shared `<LegalArticle>` wrapper. Footer dropped the dead `/about` link and renamed the column "Legal" (Privacy / Terms / Cookies / Cancellation) so every link resolves.

#### 5B — Email programme + cart abandonment (NOT STARTED)
- [ ] React Email templates: welcome, order shipped, order delivered, refund processed (the order-placed and password-reset templates already shipped in Sprint 4 and Sprint 2 respectively).
- [ ] Cart abandonment recovery emails (1h / 24h / 72h triggers via QStash + Resend).
- [ ] Wire shipped / delivered / refund email sends into the admin status-transition handler + Shiprocket webhook.

#### 5C — Shiprocket integration (NOT STARTED)
- [ ] Rate quote (`/api/shipping/rates`), label/AWB create on order CONFIRMED → PROCESSING transition, tracking webhook updating OrderEvents, pickup scheduling for returns. Replaces the Phase-1 flat-tier shipping rates with a real per-pincode quote. Also lands `StockMovement` audit-row writes on order placement / cancel (deferred from Sprint 4) since the warehouse becomes a real entity here.

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
| 2026-05-08 | **`StockMovement` audit deferred to Sprint 5** | The model requires a `warehouseId` and Phase-1 doesn't seed warehouses. Direct `ProductVariant.stock` decrement is correct; the audit row joins the inventory pipeline alongside Shiprocket. |

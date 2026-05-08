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
**Sprint:** Sprint 1 — Catalog (Home, PLP, PDP)
**Status:** CODE COMPLETE — pending DB/env wiring + visual QA before merge

### Done this session

- **Shadcn/UI primitives** — hand-written New York-style components in [components/ui](./components/ui/): `button`, `card`, `badge`, `skeleton`, `input`, `label`, `separator`, `sheet`, `dropdown-menu`, `accordion`, `checkbox`, `radio-group`. Radix peer deps installed (`@radix-ui/react-{slot,dialog,dropdown-menu,label,separator,accordion,checkbox,radio-group,tooltip,select}`).
- **Money helpers** — [lib/money.ts](./lib/money.ts) with `toPaise`/`fromPaise`/`formatINR`/`formatINRWithPaise`/`formatNumberIN`/`discountPct`/`discountAmount`. Indian numbering grouping via `Intl.NumberFormat('en-IN')`. Accepts `Decimal | number | string` via duck-typed `toString`/`toNumber` (avoids the unstable `@prisma/client/runtime/library` import path).
- **Cloudinary loader** — [lib/cloudinary.ts](./lib/cloudinary.ts) `cloudinaryLoader` for `next/image` (`f_auto,q_auto,w_*,c_limit`); plus `cloudinaryUrl` for OG images / structured data. Hardened against bare public IDs, full Cloudinary URLs, and arbitrary HTTPS placeholders.
- **SEO helpers** — [lib/utils/seo.ts](./lib/utils/seo.ts) builds `Product`, `BreadcrumbList`, `ItemList`, `Organization` JSON-LD. Wired on Home (Org + ItemList), PLP (BreadcrumbList), PDP (Product + BreadcrumbList).
- **Slug helper** — [lib/utils/slug.ts](./lib/utils/slug.ts) NFKD-normalised, 80-char-bounded slug builder for admin forms.
- **`safe()` helper** — [lib/utils/safe.ts](./lib/utils/safe.ts) shared try/fallback wrapper used by every RSC page so the public catalog renders empty-state UI instead of HTTP 500 when the DB is unreachable.
- **Zod validators** — [lib/validators/](./lib/validators/) `common` (cuid, slug, pincode, gstin, phone, paise, page/perPage), `category`, `brand`, `product` (with `superRefine` invariant checks: only one default variant, only one primary image, price ≤ MRP per variant), `search` (filters + suggest).
- **Catalog services** — [lib/services/catalog.ts](./lib/services/catalog.ts) `getCategoryTree` / `getCategoryBySlug` / `getCategoryBreadcrumb` / `getCategoryDescendantIds` / `listProducts` / `getBrandFacets` / `getProductBySlug` / `getRelatedProducts` / `getTrendingProducts` / `getFeaturedCategories` / `getActiveBrands` / `searchProducts` / `searchSuggest` / `getBrandBySlug`. Home/category-tree/brand strip wrapped in `unstable_cache` with 300/600s revalidate and tagged for invalidation. Selections defined as `satisfies Prisma.ProductSelect` so generated Prisma types pass through cleanly.
- **Phase 1 search** — pg_trgm-only (no tsvector yet). [prisma/migrations/manual/_search.sql](./prisma/migrations/manual/_search.sql) creates `pg_trgm` extension + GIN trigram indexes on `Product.name`, `Brand.name`, plus a `LOWER(shortDesc)` btree. `searchProducts` / `searchSuggest` use `prisma.$queryRaw` with `Prisma.sql` parameterised templates. Covers ~5k SKUs at p95 < 500ms; graduates to Algolia in Phase 2 per SRS Appendix D.
- **API routes** — `GET /api/search` (with `?mode=suggest`), `GET /api/products` (PLP filters), `GET /api/products/[id]` (cuid OR slug). All inputs Zod-validated before any business logic.
- **Shop layout** — [app/(shop)/layout.tsx](./app/(shop)/layout.tsx) wraps every shop route with [Header](./components/shop/header.tsx) (sticky, backdrop-blur, logo, primary nav from category tree, desktop search, account/cart icons), [Footer](./components/shop/footer.tsx) (3-column links + brand promise), and [MobileBottomNav](./components/shop/mobile-bottom-nav.tsx) (5-up Home/Categories/Search/Cart/Account, safe-area aware). [MobileMenu](./components/shop/mobile-menu.tsx) is a left-slide Sheet showing the full category tree on mobile.
- **Catalog UI components** — [ProductCard](./components/shop/product-card.tsx) (responsive square image, brand kicker, name clamp, price + MRP strikethrough + discount badge + sold-out badge), [ProductGrid](./components/shop/product-grid.tsx), [Breadcrumbs](./components/shop/breadcrumbs.tsx) (semantic `nav`+`ol`, last item is `aria-current`), [Pagination](./components/shop/pagination.tsx) (windowed, prev/next, ellipsis), [SortMenu](./components/shop/sort-menu.tsx) (DropdownMenu, useTransition, URL-driven), [FilterSidebar](./components/shop/filters/filter-sidebar.tsx) (in-stock toggle, price range, brand checkboxes with counts; URL-driven, useTransition), [MobileFilterSheet](./components/shop/filters/mobile-filter-sheet.tsx) (left-slide Sheet wrapping the same FilterSidebar). PDP-specific: [ProductGallery](./components/shop/product-gallery.tsx) (thumb rail flips between row/col layout, click-to-swap main image, priority on hero), [VariantSelector](./components/shop/variant-selector.tsx) (groups variants by attribute axes — color/storage/RAM/etc., disables out-of-stock pills), [PdpActions](./components/shop/pdp-actions.tsx) (price + MRP + discount + stock state + add-to-cart + buy-now + save-to-wishlist), [PincodeCheck](./components/shop/pincode-check.tsx) (calls `https://api.postalpincode.in` for Phase 1 — TODO swaps to internal `/api/serviceability` in Sprint 4), [SpecsAccordion](./components/shop/specs-accordion.tsx) (multi-open accordion grouped by spec group), [StickyCta](./components/shop/sticky-cta.tsx) (mobile-only sticky band above the bottom nav).
- **Public pages**:
  - **Home** ([app/(shop)/page.tsx](./app/(shop)/page.tsx)) — RSC, `revalidate = 300`. Hero (text + placeholder media), 8 featured categories, trending products grid, brand strip. Org + ItemList JSON-LD.
  - **All categories** ([app/(shop)/category/page.tsx](./app/(shop)/category/page.tsx)) — RSC, `revalidate = 600`. Tree + breadcrumb.
  - **Category PLP** ([app/(shop)/category/\[...slug\]/page.tsx](./app/(shop)/category/[...slug]/page.tsx)) — RSC, `revalidate = 300`. Catch-all slug, walks category breadcrumb, scopes products to category + descendants, filter sidebar (desktop sticky, mobile sheet), sort menu, paginated grid. BreadcrumbList JSON-LD. Per-category brand facets.
  - **PDP** ([app/(shop)/products/\[slug\]/page.tsx](./app/(shop)/products/[slug]/page.tsx)) — RSC, `revalidate = 3600`. Gallery + variant selector + add-to-cart + pincode + warranty + box contents + description + specs accordion + related strip. Sticky mobile CTA. Product + BreadcrumbList JSON-LD with `availability` derived from the default variant's stock.
  - **Search** ([app/(shop)/search/page.tsx](./app/(shop)/search/page.tsx)) — `dynamic = 'force-dynamic'`. `?q=...` runs `searchProducts` (pg_trgm + ILIKE). `robots: { index: false }`. Empty-query state, no-results state, results grid.
- **Loading / not-found** — [app/(shop)/loading.tsx](./app/(shop)/loading.tsx) (8-tile grid skeleton), [app/(shop)/products/\[slug\]/loading.tsx](./app/(shop)/products/[slug]/loading.tsx) (PDP skeleton), [app/(shop)/products/\[slug\]/not-found.tsx](./app/(shop)/products/[slug]/not-found.tsx), [app/(shop)/category/\[...slug\]/not-found.tsx](./app/(shop)/category/[...slug]/not-found.tsx).
- **Admin scaffolding** (basic, read-only) — [app/(admin)/admin/layout.tsx](./app/(admin)/admin/layout.tsx) (sidebar nav + content), updated [dashboard](./app/(admin)/admin/dashboard/page.tsx) with live counts (products/categories/brands/orders/customers), and read-only tables for [products](./app/(admin)/admin/products/page.tsx), [categories](./app/(admin)/admin/categories/page.tsx), [brands](./app/(admin)/admin/brands/page.tsx). Full CRUD UI deferred to Sprint 1 polish.
- **Seed data** — [prisma/seed.ts](./prisma/seed.ts) idempotent upserts: 6 categories (smartphones / laptops / audio / wearables / smart-home / gaming), 6 brands (Apple, Samsung, Sony, OnePlus, Boat, Dell), 8 products with variants/specs and a placeholder image. Wired via `pnpm db:seed` (`tsx prisma/seed.ts`) and `prisma.config.ts` (`migrations.seed`). `tsx` added as dev dep.

### Verification

| Command | Result |
|---|---|
| `pnpm typecheck` (`tsc --noEmit`) | ✅ exit 0, zero errors |
| `pnpm lint` (`biome lint .`) | ✅ exit 0, zero errors (2 nursery `noArrayIndexKey` warnings on intentionally-static skeleton/pagination keys — accepted) |
| `pnpm prisma validate` | ✅ schema unchanged from Sprint 0; still valid |
| `pnpm dev` | ⏸️ not booted this session — no `.env.local` yet. Pages use `safe()` wrappers so they should render empty-state without DB; visual QA pending DB connect |

### Up next — to take Sprint 1 from code-complete to merged

1. Create `.env.local` from `.env.example` and fill in `DATABASE_URL` + `DIRECT_URL` (Neon free tier).
2. `git init` + `pnpm prepare` if not already done, so Husky activates.
3. `pnpm prisma migrate dev --name init` — first migration against the schema.
4. `psql "$DIRECT_URL" -f prisma/migrations/manual/_search.sql` — adds pg_trgm + indexes used by search.
5. `pnpm db:seed` — populates the 6 categories / 6 brands / 8 products from the seed.
6. `pnpm dev` — visually QA Home / `/category/smartphones` / `/products/iphone-15-pro` / `/search?q=iphone` end-to-end on mobile + desktop.
7. Lighthouse mobile pass: Perf ≥ 85, A11y ≥ 95, SEO ≥ 95 on Home / PLP / PDP.
8. Tick off the remaining Sprint 1 acceptance bullets below, flip the sprint to DONE, open the PR per the per-sprint workflow at the top of this file.

**Sprint 1 polish backlog** (deferred from this session, still inside Sprint 1):
- Admin product/category/brand **create/edit forms** (server actions + RHF + Zod). Read-only tables landed; mutations did not.
- POST/PATCH/DELETE `/api/admin/{products,categories,brands}` routes (Zod validators are written, server actions can reuse them).
- `app/sitemap.ts` + `app/robots.ts` (Sprint 5 also touches these — earlier is fine).
- Search suggest in the header (debounced fetch to `/api/search?mode=suggest`).
- Hero image asset (currently a CSS gradient placeholder).
- Cloudinary credentials on Vercel preview.

### Blockers

- DB not yet provisioned locally. Public catalog pages all degrade gracefully via `safe()` so the app boots without a DB, but real visual + Lighthouse verification is blocked on Neon connection.
- MSG91 (DLT) and Razorpay (KYC) flows still need to be started — not on Sprint 1's critical path but Sprint 2 (OTP) and Sprint 4 (checkout) will block on them.

### Decisions made this session

- **Search starts at pg_trgm** (no generated tsvector column in Phase 1). Reason: schema already shipped, generated columns require extra migration discipline, and trigram alone covers typo-tolerant prefix/substring search up to ~5k SKUs cleanly. Graduate to tsvector or Algolia when p95 > 500ms.
- **Manual SQL bootstrap for pg_trgm** (`prisma/migrations/manual/_search.sql`) rather than `previewFeatures = ["postgresqlExtensions"]`. Lower coupling to Prisma's preview feature lifecycle. The script is idempotent (`CREATE EXTENSION IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`) so re-runs are safe.
- **Accent colour: deferred (slate neutral only).** SRS leaves accent "TBD per brand kit." Sprint 1 ships entirely on the slate palette + semantic colours (success/warning/destructive/info) — no chromatic accent decoration. Pick the accent during Sprint 1 polish once a logo/wordmark exists.
- **Pincode lookup hits India Post directly from the client.** Reason: Phase 1 has no `/api/serviceability` yet (Sprint 4). India Post's endpoint is public, doesn't need an API key, and CORS-allows browsers. Marked `TODO(integration)` in `pincode-check.tsx`.
- **Money helpers stop importing `Decimal`** from `@prisma/client/runtime/library`. The path moved between Prisma 6 and 7 betas and we hit a TS module-resolution failure. Helpers now accept any `{ toString(): string; toNumber?(): number }` — Prisma's Decimal already satisfies that, plus plain numbers and strings. Future Decimal arithmetic that genuinely needs the class can `import { Prisma } from '@prisma/client'` and use `Prisma.Decimal`.
- **Validator `superRefine` invariants extracted** (`productInvariants` helper). Zod 4's `_def.schema` API is gone, so we can't `partial()` on a refined schema. Splitting the core object schema from the refinement lets us produce both `createProductSchema` (full + refined) and `updateProductSchema` (partial + refined skip when relevant fields absent) cleanly.
- **Pages wrapped in a shared `safe()` fallback** so the public site degrades to empty-state UI instead of HTTP 500 when the DB is unreachable. Kept narrow — only catches read paths and only at the page boundary; service code still throws.

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
**Status:** IN_PROGRESS — code complete, awaiting DB wiring + visual QA + Lighthouse pass
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
**Status:** NOT_STARTED
**Relevant SRS:** §6.1, §6.11

- [ ] Email + password registration (bcrypt, complexity rules) with email verification (Resend)
- [ ] Login (email/password + Google OAuth) — wire up the Credentials provider already scaffolded in `lib/auth.ts`
- [ ] Forgot password (15-min token)
- [ ] Account dashboard shell: profile, addresses, orders (placeholder), security
- [ ] Address CRUD (label, default flag, pincode autocomplete via India Post API)
- [ ] Rate limiting on login + OTP (Upstash Redis sliding window: 5/min login, 3/min OTP)
- [ ] Session list + revoke (Phase 1 minimum: list active, revoke all)

**Acceptance:** User can sign up, verify email, log in via password or Google, manage addresses, see empty orders list.

---

### Sprint 3 — Cart
**Status:** NOT_STARTED
**Relevant SRS:** §6.4.1, §6.5.4 (pricing engine basics)

- [ ] Guest cart: HTTP-only cookie session id → DB-backed Cart (Cart, CartItem)
- [ ] Logged-in cart with merge-on-login
- [ ] Mini-cart drawer (Zustand UI flag, Shadcn Sheet)
- [ ] Cart page with quantity update, remove, save-for-later (Phase 2 actually moves), free-shipping progress
- [ ] Server-side pricing engine (HSN-driven GST, inter/intra-state, paise integers everywhere)
- [ ] `/api/cart` `POST` / `GET` / `PATCH` / `DELETE` with Zod validation
- [ ] Stock validation on add/update with optimistic locking (variant `version`)

**Acceptance:** Guest and logged-in users can build a cart that survives reload, login merges correctly, totals match server-side recompute exactly.

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

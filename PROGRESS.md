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
**Sprint:** Sprint 0 — Bootstrap (Phase 1 foundation)
**Status:** DONE — handed back to user for review

### Done this session

- Read [docs/SRS.md](./docs/SRS.md) and [SETUP_GUIDE.md](./SETUP_GUIDE.md) end-to-end.
- Verified all locked versions on npm (Next 16.2.6, React 19.2.6, TS 6.0.3, Tailwind 4.2.4, Prisma 7.8.0, Zustand 5.0.13, TanStack Query 5.100.9, RHF 7.75.0, Zod ^4.4.3, Auth.js v5 = `next-auth@5.0.0-beta.31`).
- Wrote [CLAUDE.md](./CLAUDE.md): mission, locked stack, architectural rules, design system, folder structure, DO-NOT list, working rules.
- Wrote [PROGRESS.md](./PROGRESS.md): sprint tracker + decisions log.
- Authored `package.json` pinned to the SRS versions; added `lint-staged`, `husky`, `dotenv`, `pg`, `@prisma/adapter-pg`, `@types/pg` after Prisma 7 schema-config split surfaced.
- TypeScript strict mode in `tsconfig.json` (with `noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax`); `paths: { "@/*": ["./*"] }`. (TS 6 deprecates `baseUrl`, so it was removed.) Next.js 16 auto-added `.next/dev/types/**/*.ts` to `include` and switched `jsx` to `react-jsx` on first dev boot — both expected.
- Biome 2.4.14 configured (`biome.json`) — single tool for lint + format + import sort. Custom rules for `noConsole` (allow warn/error/info), `useExhaustiveDependencies`, `useSortedClasses` (Tailwind class sorting), and `useImportType`. CSS files excluded from Biome's CSS parser since Tailwind 4 syntax (`@theme`, `@custom-variant`) isn't supported by the current parser.
- Tailwind 4 with CSS-first config (`app/globals.css` uses `@import "tailwindcss"` + `@theme inline { ... }`). `postcss.config.mjs` registers `@tailwindcss/postcss`. Shadcn/UI baseline: `components.json` (New York style, slate base, RSC), `lib/utils.ts` exports `cn`, `tw-animate-css` imported.
- Folder structure per SRS §5.3 (route groups: `(shop)`, `(auth)`, `(account)`, `(admin)`; api: `auth/[...nextauth]`, `products/[id]`, `cart`, `checkout`, `orders`, `webhooks/razorpay`, `webhooks/shipping`).
- Minimal app shell: `app/layout.tsx` (Geist + Geist Mono via `next/font`, restrained metadata, viewport, theme color), `app/(shop)/page.tsx` (clean home placeholder), `app/error.tsx`, `app/not-found.tsx`, placeholder pages for `(auth)/login`, `(account)/account/orders`, `(admin)/admin/dashboard`. `app/api/auth/[...nextauth]/route.ts` re-exports Auth.js handlers.
- **Prisma 7 full schema** in `prisma/schema.prisma` covering every entity in SRS §7 (User, Account, Session, VerificationToken, Address, Category, Brand, Product, ProductCategory, ProductVariant, ProductImage, ProductSpec, ProductAttribute, RelatedProduct, Warehouse, StockMovement, Cart, CartItem, Wishlist, WishlistItem, Order, OrderItem, OrderAddress, OrderEvent, Shipment, Payment, Refund, Return, ReturnItem, Review, ReviewMedia, ReviewVote, QnA, Coupon, CouponUsage, Banner, LoyaltyTransaction, Notification, SearchLog, AuditLog, Setting). All money fields are `Decimal(12,2)`. Soft-delete `deletedAt` on Order/Product/User. Optimistic-concurrency `version` on `ProductVariant`. Razorpay `gatewayPaymentId` is uniquely indexed for idempotent webhook handling.
- Prisma 7 config split: `prisma.config.ts` holds connection URLs (uses `DIRECT_URL` for migrate); `lib/db.ts` builds `PrismaClient` with `@prisma/adapter-pg` (singleton-cached on `globalThis` outside production).
- Auth.js v5 wired (`lib/auth.ts`): JWT sessions (30d), Prisma adapter, Google OAuth, Credentials (Zod-validated email/password with bcrypt verify, role/id propagated to session). `app/api/auth/[...nextauth]/route.ts` re-exports `GET`/`POST`. `proxy.ts` (Next.js 16's renamed middleware file) gates `/admin`, `/account`, `/checkout` and redirects to `/login?callbackUrl=...` for unauthenticated requests.
- Husky pre-commit hook (`.husky/pre-commit`) runs `pnpm lint-staged` → `biome check --write` over staged files; `prisma format` over `prisma/schema.prisma`. (Note: `husky install` was skipped because `.git` doesn't exist yet — `prepare` script tolerates this with `|| true`. Will activate once `git init` runs.)
- `.nvmrc` = 22, `.env.example` enumerates every variable from SETUP_GUIDE Step 5 + SRS §13 (Razorpay, Resend, Cloudinary, MSG91, Upstash, Sentry, PostHog, Turnstile, Shiprocket, GA4/GTM, Clarity, India Post pincode, Algolia stub for Phase 2). `.gitignore` covers Next/Prisma/Vercel/IDE artifacts. `.editorconfig` standardizes whitespace. `.vscode/{extensions,settings}.json` recommend Biome + Prisma + Tailwind plugins and disable ESLint default.
- Moved `SRS.md` → `docs/SRS.md`. CLAUDE.md, PROGRESS.md, SETUP_GUIDE.md, MASTER_PROMPT.md remain at the repo root.

### Verification

| Command | Result |
|---|---|
| `npx prisma validate` | ✅ "The schema at prisma\\schema.prisma is valid 🚀" |
| `pnpm typecheck` (`tsc --noEmit`) | ✅ exit 0, zero errors |
| `pnpm lint` (`biome lint .`) | ✅ exit 0, zero errors (warnings auto-fixed via `biome check --write`) |
| `pnpm dev` | ✅ Next.js 16.2.6 (Turbopack) ready on http://localhost:3000; `GET /` → HTTP 200 (23 KB) |

### Up next

**Sprint 1 — Catalog (Home, PLP, PDP).** Acceptance criteria already enumerated below. Before starting:
1. Make sure `.env.local` exists locally (copy from `.env.example`) with at least `DATABASE_URL` + `DIRECT_URL` filled in (Neon free tier is enough).
2. Run `git init` + `pnpm prepare` once, so Husky activates.
3. Run `pnpm prisma migrate dev --name init` to create the first migration against your Neon `local`/`dev` branch.

### Blockers

- None for the bootstrap.
- For Sprint 1 we'll need Cloudinary credentials in `.env.local` (free tier). MSG91 (DLT) and Razorpay (KYC) take 1 week and 1–3 days respectively — start those flows now in parallel; they're not on the critical path until Sprint 2 (auth OTP) and Sprint 4 (checkout).

### Decisions made this session

All captured in §Decisions log below — adds three new entries since the file was first created:
- **Linter = Biome** (over ESLint + Prettier).
- **Auth.js v5 = `next-auth@5.0.0-beta.31`** pinned exactly.
- **Prisma 7 driver-adapter pattern**: `prisma.config.ts` + `@prisma/adapter-pg` (using plain `pg`); switch to `@prisma/adapter-neon` later if Vercel cold-starts demand it.
- **TS 6**: removed deprecated `baseUrl`; `paths` resolves relative to the `tsconfig.json` location instead.
- **Next.js 16**: use `proxy.ts` not `middleware.ts` (Next.js 16 deprecation).
- **Biome CSS parsing disabled** — Tailwind 4 directives like `@theme`, `@custom-variant` aren't recognized by the current Biome CSS parser; we lint TS/JS/JSON only.
- **`@types/bcryptjs` removed** — bcryptjs ships its own types since v3.

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
**Status:** NOT_STARTED
**Relevant SRS:** §6.2, §6.3 (Phase-1 Postgres search), §10, §11

- [ ] Install Shadcn/UI components needed for Sprint 1 (`pnpm dlx shadcn@latest add button card input label sheet dropdown-menu skeleton badge separator`)
- [ ] Category and Brand admin CRUD (basic — full UI later)
- [ ] Product admin CRUD (title, slug, brand, description, MRP, selling price, GST %, HSN, country of origin, BEE rating, hazmat flags, status, images, specs, variants)
- [ ] Public **Home** page — hero, category tiles, deal-of-day strip, trending, brand strip, newsletter (RSC, ISR 5min)
- [ ] Public **Category PLP** — `/category/[...slug]`, faceted filters via search params, sort, pagination, breadcrumbs (RSC + ISR)
- [ ] Public **PDP** — `/products/[slug]`, gallery, variant selector, pincode check, price breakdown, Add to Cart / Buy Now, sticky mobile CTA, specs accordion, related strip, JSON-LD Product+Offer (RSC + ISR 1hr, on-demand revalidate on price/stock change)
- [ ] Postgres-based search via `pg_trgm` + `tsvector` + `/api/search`
- [ ] `next/image` + Cloudinary loader for all product imagery
- [ ] Mobile bottom nav (Home/Categories/Search/Cart/Account)
- [ ] Skeletons + designed empty/error states
- [ ] Lighthouse: Perf ≥ 85 mobile, A11y ≥ 95, SEO ≥ 95 on Home, PLP, PDP

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

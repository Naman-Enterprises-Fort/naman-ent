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
**Sprint:** Sprint 2 — Auth + Account
**Status:** CODE COMPLETE — pending DB migration + Resend/Upstash creds + visual QA before merge

### Done this session

- **Schema additions** — [prisma/schema.prisma](./prisma/schema.prisma) adds `User.tokenVersion` (revoke-all support), `UserLoginEvent` (sign-in audit driving "active sessions" UI; enum `LOGIN | LOGOUT | REVOKE_ALL`), and `PasswordResetToken` (15-min one-shot tokens, SHA-256 hashed at rest). Email-verification reuses Auth.js's standard `VerificationToken` table with a `verify:<email>` identifier prefix.
- **Upstash + Resend wrappers** — [lib/redis.ts](./lib/redis.ts) provides per-flow sliding-window limiters (`loginLimiter` 5/min, `registerLimiter` 5/h, `otpLimiter` 3/min, `passwordResetLimiter` 3/h, `verifyEmailLimiter` 5/h). Falls back to a permissive no-op when `UPSTASH_REDIS_REST_*` is unset (local dev). [lib/resend.ts](./lib/resend.ts) wraps the Resend SDK with a dev fallback that logs the rendered plain-text email to stdout when `RESEND_API_KEY` is missing.
- **Auth session helpers** — [lib/services/auth.ts](./lib/services/auth.ts) exposes `getSession` / `requireSession` / `requireFreshSession` (compares JWT `tokenVersion` to DB) / `requireRole(...UserRole[])` / `recordLoginEvent` / `revokeAllSessions`. Throws a typed `AuthError` (`401` / `403`) that route handlers convert to JSON error responses. Defuses the lib/auth ↔ lib/services/auth import cycle by lazy-loading from `events.signIn`.
- **Token issuance helpers** — [lib/services/auth-tokens.ts](./lib/services/auth-tokens.ts) issues + consumes verify-email tokens (24h, hashed SHA-256 in `VerificationToken.token`) and password-reset tokens (15min, hashed in `PasswordResetToken.tokenHash`). Random 32-byte secrets are emailed; only the hash hits the DB.
- **Address service** — [lib/services/addresses.ts](./lib/services/addresses.ts) `listAddresses` / `getAddress` / `createAddress` / `updateAddress` / `deleteAddress` / `setDefaultAddress`. Single-default-per-user invariant enforced inside a Prisma transaction (clears old default before flipping new). Deleting a default auto-promotes the next-most-recent address.
- **NextAuth wiring** — [lib/auth.ts](./lib/auth.ts) updated: `tokenVersion` propagated through the JWT and Session callbacks; `update` trigger re-pulls fresh `tokenVersion` and `role` from DB; `events.signIn` records a `UserLoginEvent` with provider + IP + UA via `headers()` from `next/headers`. Credentials provider now also rejects deleted users (in addition to blocked).
- **Zod validators** — [lib/validators/auth.ts](./lib/validators/auth.ts) (`registerSchema`, `loginSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `changePasswordSchema`, `verifyEmailSchema`, `resendVerificationSchema`, `profileSchema`; `passwordSchema` requires ≥8 chars + letter + digit per NIST 800-63B) and [lib/validators/account.ts](./lib/validators/account.ts) (`createAddressSchema`, `updateAddressSchema`).
- **Email templates** — [emails/_layout.tsx](./emails/_layout.tsx) (shared brand-consistent shell), [verify-email.tsx](./emails/verify-email.tsx), [password-reset.tsx](./emails/password-reset.tsx), [welcome.tsx](./emails/welcome.tsx). Inline-styled (email-client-safe), dark-mode-aware via slate palette, Geist-style sans-serif fallback.
- **Auth API routes** — `POST /api/auth/register` (rate-limited, hashes with bcrypt rounds=12, creates verify-email token, sends email; rejects ANY existing email — even OAuth-only — to prevent takeover via password-set), `GET /api/auth/verify-email?token=...` (consumes token, marks `emailVerified`, sends welcome email, redirects to `/verify-email?status=success|expired|invalid`), `POST /api/auth/resend-verification` (rate-limited, account-enumeration-safe), `POST /api/auth/forgot-password` (rate-limited, account-enumeration-safe, issues 15-min token), `POST /api/auth/reset-password` (consumes token, bumps tokenVersion → kills all other devices, marks email verified — proof of inbox control).
- **Account API routes** — `PATCH /api/account/profile` (name + phone; auto-clears phoneVerified on change; rejects phones already linked to another account), `GET /api/account/sessions` (last 20 LOGIN events for active-sessions UI), `POST /api/account/sessions/revoke` (bumps tokenVersion + writes REVOKE_ALL audit row), `POST /api/account/password` (re-auths via current password, hashes new, bumps tokenVersion), `GET/POST /api/account/addresses`, `PATCH/DELETE/PUT /api/account/addresses/[id]` (PUT sets default).
- **Auth pages** — [app/(auth)/layout.tsx](./app/(auth)/layout.tsx) (centered card on slate-50, redirects to /account if already signed in), [/login](./app/(auth)/login/page.tsx) (LoginForm with credentials + Google OAuth + "verified" success banner), [/register](./app/(auth)/register/page.tsx) (RegisterForm with terms checkbox + post-submit "check inbox" success state), [/forgot-password](./app/(auth)/forgot-password/page.tsx), [/reset-password](./app/(auth)/reset-password/page.tsx) (server reads `?token=`, redirects to /forgot-password if missing), [/verify-email](./app/(auth)/verify-email/page.tsx) (renders success/expired/invalid/pending states; resend form on the failure paths). Shared [AuthCard](./components/auth/auth-card.tsx) + `FormError` / `FormSuccess` / `FieldError` primitives.
- **Account dashboard** — [layout](./app/(account)/account/layout.tsx) wraps every account route with the shop Header/Footer/MobileBottomNav and a 2-column grid (sidebar + content). [Sidebar](./components/account/account-sidebar.tsx) is the only client island: `usePathname()` for active highlighting; horizontal-scroll pill nav on mobile, vertical column on desktop, with sign-out button at the bottom. Pages: [/account](./app/(account)/account/page.tsx) overview (greeting, email-verify nudge, 4 quick-action cards), [/account/profile](./app/(account)/account/profile/page.tsx), [/account/security](./app/(account)/account/security/page.tsx) (change-password form gated on having a password set + active sessions list with sign-out-everywhere), [/account/addresses](./app/(account)/account/addresses/page.tsx) (list with default/edit/remove + inline add+edit forms), [/account/orders](./app/(account)/account/orders/page.tsx) (Sprint-4-aware empty state).
- **Address form** — [components/account/address-form.tsx](./components/account/address-form.tsx) integrates India Post pincode autocomplete: when 6 valid digits land in the field it calls `https://api.postalpincode.in/pincode/<PIN>` and auto-fills city + state; spinner during the lookup; `AbortController` on dependent re-runs.
- **Header account dropdown** — [components/shop/account-menu.tsx](./components/shop/account-menu.tsx) is a client island that switches between a "sign in" icon link (signed-out) and a Radix DropdownMenu showing the user's name/email + links to overview/orders/addresses/security and a destructive sign-out item (signed-in). [Header](./components/shop/header.tsx) is now async: pulls the session via `auth()` once and passes the projected user prop to the dropdown.

### Verification

| Command | Result |
|---|---|
| `pnpm typecheck` (`tsc --noEmit`) | ✅ exit 0, zero errors |
| `pnpm lint` (`biome lint .`) | ✅ exit 0, zero new warnings (the 2 pre-existing nursery `noArrayIndexKey` warnings on Sprint-1 breadcrumbs/pagination remain accepted) |
| `pnpm prisma format` + `prisma validate` + `prisma generate` | ✅ schema valid, client regenerated |
| `pnpm dev` | ⏸️ not booted — local Neon + AUTH_SECRET still unprovisioned (Sprint 1 carry-over). Auth flows have dev-mode fallbacks (`lib/redis.ts` no-op, `lib/resend.ts` console-log) so the dev server should boot without Upstash/Resend creds. |

### Up next — to take Sprint 2 from code-complete to merged

1. **Add a migration** — `pnpm prisma migrate dev --name sprint-2-auth` to land `tokenVersion`, `UserLoginEvent`, `UserLoginEventKind`, `PasswordResetToken`. Sprint 1's verification is also pending — same `pnpm prisma migrate dev --name init` once `.env.local` is filled.
2. **`pnpm dev` smoke** — register a new account → check stdout for the `[email:dev]` verify link → click it → land on `/verify-email?status=success` → sign in → verify the account dropdown, profile edit, address create with pincode autofill (e.g. 110001 → New Delhi / Delhi), security page change-password + sessions list + revoke-all.
3. **`pnpm build`** — first production-build pass for Sprint 2; some auth routes use `runtime = 'nodejs'` (bcrypt + crypto), confirm they survive build.
4. **(Optional) Provision Resend test sender + Upstash REST creds** so the email actually sends and rate-limit gates engage. Both are SRS §13 services and have free tiers; not strictly required for Sprint 2 acceptance to pass locally (dev fallbacks are sufficient).
5. Tick the Sprint 2 acceptance bullets below, flip status to `DONE`, open the PR per the per-sprint workflow at the top of this file.

**Sprint 2 polish backlog** (deferred, out of Sprint 2's critical path):
- **Phone + OTP signup** (SRS §6.1.1) — blocked on MSG91 DLT registration (≈ 1 week lead time). The `otpLimiter` is already wired so the route can drop in once the SDK is provisioned.
- **2FA setup** (SRS §6.11 "Security: 2FA setup") — Phase-2 polish, not in Sprint 2 acceptance bullets.
- **Login history vs active-sessions distinction** — Phase 1 collapses both into the same `UserLoginEvent` audit table (which is enough to satisfy "list active, revoke all"). True per-session revoke would require minting a per-session `jti` claim and a denylist; deferred until checkout-grade stakes warrant it.
- **Real Resend sender + DKIM/SPF setup** on the production domain.
- **Cloudflare Turnstile** on `/register` and `/forgot-password` (env vars are in place) — Phase 2 conversion polish.
- **Session refresh on the current device after `tokenVersion` bump** — currently the change-password and revoke-all flows force a full sign-out via `next-auth/react`'s `signOut()`. A smoother flow would call `useSession().update()` to refresh the JWT in place; deferred for UX iteration.

### Blockers carried over from Sprint 1

- DB still not provisioned locally; same Neon block as Sprint 1.
- MSG91 DLT and Razorpay KYC — same as Sprint 1's blocker note.

### Decisions made this session

- **JWT strategy + `User.tokenVersion`** for "log out everywhere." Every JWT carries a `tokenVersion` claim; bumping `User.tokenVersion` invalidates every minted JWT on its next call into `requireFreshSession()` (the helper used by every account/checkout route handler and server action). Catalog reads stay stateless. This is the standard pattern when you want JWT speed *and* a kill switch.
- **Email verification on top of Auth.js's `VerificationToken` table** with a `verify:<email>` identifier prefix and SHA-256-hashed token. Avoids adding another model when a perfectly-good standard one exists. Reset-password gets its own model (`PasswordResetToken`) because the lifecycle is different (15min, single-use, has `usedAt`).
- **Account-enumeration safety on every public auth surface.** `/forgot-password`, `/resend-verification`, and even `/register` either return identical responses regardless of account existence or — for register — refuse any pre-existing email so an OAuth-only account can't have a password set on it without inbox proof.
- **Always reject register if email exists, including OAuth-only accounts.** Letting a guest set a password on a Google-only account would be account takeover; legitimate owners use forgot-password (which proves inbox control) to set their first password instead.
- **Reset-password also marks `emailVerified`.** Receiving the reset email already proves inbox control; making the user click *another* verify link adds friction with no extra security.
- **Phase-1 rate-limit gate is permissive** when Upstash creds aren't set. Document the gate as "soft" in `lib/redis.ts` so the production deployment checklist surfaces it (Sprint 5 polish). Local dev avoids needing a Redis sidecar.
- **Resend dev fallback logs to stdout** rather than failing closed. Keeps the auth flows usable end-to-end during development without a Resend sandbox subscription. Production must have `RESEND_API_KEY` set.
- **Single-default-address invariant inside a Prisma transaction.** Setting one address as default flips off any prior default in the same transaction. Deleting the current default auto-promotes the next-most-recent address. Avoids a "no defaults exist" footgun at checkout.
- **India Post pincode autocomplete on the address form** matches the Sprint 1 PDP-pincode pattern: hits the public endpoint client-side. Same `TODO(integration)` swap to `/api/serviceability` in Sprint 4.
- **Account dashboard sidebar is the only client island**; pages are RSC. Active-route highlighting needs `usePathname()` so the sidebar must be a client component, but the layout, pages, and data-fetching all stay server-side.

### Previous sessions

- **Sprint 1 — Catalog (Home, PLP, PDP)** shipped Sprint 1's RSC catalog (Home + PLP + PDP + Search), pg_trgm-based search, Cloudinary loader, money helpers, SEO JSON-LD, Shadcn primitives, mobile bottom nav, and read-only admin tables. See commit [`62e2f50`](https://github.com/anthropics/) and the Decisions Log below for the architectural choices that landed.

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
**Status:** IN_PROGRESS — code complete, awaiting DB migration + dev-server smoke before PR
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

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
**Sprint:** Sprint 4 — Checkout + Razorpay + Order Placement
**Status:** CODE COMPLETE — typecheck + lint clean; verification (DB migration, dev-server smoke, ₹1 Razorpay test transaction, build) tracked in [PENDING.md](./PENDING.md)

### Done this session

- **Razorpay HTTP client + signature helpers** — [lib/razorpay.ts](./lib/razorpay.ts) is a thin wrapper over Razorpay's REST API using `fetch` + `node:crypto` (no SDK dependency). Exposes `createRazorpayOrder` / `fetchRazorpayPayment` / `createRazorpayRefund` and the two HMAC-SHA256 verifies (`verifyPaymentSignature` over `${order_id}|${payment_id}` for the post-modal handler, `verifyWebhookSignature` over the raw request body for the webhook). Auto-capture is the Phase-1 default (`payment_capture: 1`). Falls open with `RazorpayError(503)` when keys are missing.
- **Pricing engine — Sprint 4 extensions** — [lib/services/pricing.ts](./lib/services/pricing.ts) now supports `shippingMethod` (STANDARD / EXPRESS / SAME_DAY) and `paymentMethod` options. STANDARD keeps the Sprint-3 free-above-₹999 / flat-₹49 rule; EXPRESS is flat ₹99, SAME_DAY ₹199. COD adds a ₹49 convenience fee automatically. The constants + helpers (`shippingPaiseFor`, `codFeeFor`) live in a non-`server-only` [lib/pricing-shared.ts](./lib/pricing-shared.ts) so the checkout page can render the same numbers client-side without leaking Prisma into the browser bundle.
- **Pincode serviceability** — [lib/services/serviceability.ts](./lib/services/serviceability.ts) wraps the public India Post endpoint to resolve city/state and tags metro pincodes (`110*/400*/560*/700*/600*/500*`) as same-day-eligible. Fails open: India Post outage returns `serviceable: true` with `city: null, state: null` so manual address entry still works. Exposed at [`/api/serviceability?pincode=...`](./app/api/serviceability/route.ts).
- **Order placement service** — [lib/services/orders.ts](./lib/services/orders.ts) `placeOrderForCheckout` runs entirely inside one `prisma.$transaction`: re-loads the cart with fresh prices, validates each line is purchasable, resolves saved-id-or-inline addresses into snapshots, recomputes totals server-side (CLAUDE.md §3.12 — never trust the client), decrements stock with the optimistic-lock UPDATE Sprint 3 pre-wired (`WHERE id = ? AND version = ?`, bumping `version`), and writes Order + OrderItems (with the productSnapshot Json freezing brand/sku/name/attributes/hsn/gstRate/image/mrpPaise) + OrderAddresses (BILLING + SHIPPING snapshots, even when billing == shipping) + the initial `PENDING` (and `CONFIRMED` for COD) OrderEvents + a Payment row keyed by `gateway`. Order numbers mint as `NMN20260508-ABC123` via `nanoid`. COD clears the cart in-TX; online clears it after `/api/orders/verify`.
- **Payments service** — [lib/services/payments.ts](./lib/services/payments.ts) `startCheckoutSession` is the single entry from `/api/checkout/session`. For COD it returns `{ redirect: '/checkout/success?...' }` directly; for online it places the order in `PENDING`, calls `createRazorpayOrder` (rolling back the local order with `safeRollbackPlacedOrder` on Razorpay failures so stock is restored), attaches the Razorpay `order_id` to the Payment row, and returns the `{ keyId, orderId, amount, currency, name, prefill, notes }` shape the Razorpay Web Checkout iframe needs. `verifyAndCapturePayment` runs the HMAC verify, fetches the live payment from Razorpay for a final amount-recheck (SRS §12.2), calls the idempotent `confirmOnlinePayment` (which short-circuits if the webhook already promoted the order), then clears the cart and fires the order-placed email.
- **Webhook handler** — [lib/services/webhooks.ts](./lib/services/webhooks.ts) verifies the raw-body HMAC (no JSON.parse before verify), then dispatches `payment.captured` / `payment.authorized` / `order.paid` / `payment.failed` / `refund.created` / `refund.processed` / `refund.failed`. Idempotency is enforced by `Payment.gatewayPaymentId @unique` and `Refund.gatewayRefundId @unique` — replaying the same event is a no-op. Failure paths (payment.failed) cancel the order + restore stock when the order is still PENDING. Refund handler aggregates processed refunds vs the payment amount to flip between `PARTIALLY_REFUNDED` and `REFUNDED`. Always returns 2xx within Razorpay's 5s window. Wired at [`/api/webhooks/razorpay`](./app/api/webhooks/razorpay/route.ts).
- **API routes** — `/api/checkout/session` (POST), `/api/orders/verify` (POST), `/api/orders` (GET list), `/api/orders/[orderNumber]` (GET detail), `/api/orders/[orderNumber]/cancel` (POST), `/api/admin/orders` (GET admin list), `/api/admin/orders/[id]/transition` (POST status transitions), `/api/serviceability` (GET), `/api/webhooks/razorpay` (POST). Every handler validates input via Zod ([lib/validators/checkout.ts](./lib/validators/checkout.ts), [lib/validators/order.ts](./lib/validators/order.ts)). Error mapping: `EMPTY_CART` / `AMOUNT_MISMATCH` → 400; `OUT_OF_STOCK` / `STOCK_CONFLICT` / `NOT_CANCELLABLE` / `INVALID_TRANSITION` → 409; `NOT_FOUND` / `ADDRESS_NOT_FOUND` → 404; Razorpay outage → 503.
- **Checkout page** — [app/(shop)/checkout/page.tsx](./app/(shop)/checkout/page.tsx) is RSC: redirects to `/cart` if empty, fetches saved addresses (when signed in), and hands a `<CheckoutPageClient />` ([components/shop/checkout/checkout-page.tsx](./components/shop/checkout/checkout-page.tsx)) the cart + addresses + signed-in flag + a `razorpayConfigured` boolean. The client renders four numbered sections (Contact / Delivery address / Shipping / Payment) plus a sticky "Review your order" sidebar that previews the total locally so shipping- and COD-driven changes feel instant. Saved-address radio cards or an inline address form (with the same India Post pincode autofill the account form uses, but routed through `/api/serviceability` so it shares cache). Same-day shipping option is auto-disabled outside metro pincodes. Place Order POSTs `/api/checkout/session`; for COD the server response carries `redirect`; for online the page opens the Razorpay Web Checkout iframe via [lib/hooks/use-razorpay.ts](./lib/hooks/use-razorpay.ts) (lazy-loads `https://checkout.razorpay.com/v1/checkout.js`), then on success POSTs `/api/orders/verify` and routes to `/checkout/success?orderNumber=...`.
- **Order confirmation page** — [app/(shop)/checkout/success/page.tsx](./app/(shop)/checkout/success/page.tsx) is RSC, looks up the order by `orderNumber` (no auth check — anyone with the URL can see; the random suffix is the auth token for guest checkout). Shows item list, totals, shipping address, COD vs paid framing, and a "View order details" button that links to `/account/orders/...` for signed-in users or to login for guests. `robots: index: false` (SRS §11).
- **Customer order pages** — [app/(account)/account/orders/page.tsx](./app/(account)/account/orders/page.tsx) replaces the Sprint-2 placeholder with a real list (10 per page, status badges, totals, item-thumbnail rail). [app/(account)/account/orders/[orderNumber]/page.tsx](./app/(account)/account/orders/[orderNumber]/page.tsx) shows the full timeline (OrderEvents in vertical-rail layout), itemised totals, both addresses, payment summary, and a [CancelOrderButton](./components/account/cancel-order-button.tsx) that POSTs `/api/orders/[orderNumber]/cancel` while the status is in `{PENDING, CONFIRMED, PROCESSING}`. [OrderStatusBadge](./components/account/order-status-badge.tsx) is shared with the admin pages.
- **Admin order pages** — [app/(admin)/admin/orders/page.tsx](./app/(admin)/admin/orders/page.tsx) is a paginated table (status filter chips for PENDING / CONFIRMED / PROCESSING / SHIPPED / DELIVERED / CANCELLED). [app/(admin)/admin/orders/[id]/page.tsx](./app/(admin)/admin/orders/[id]/page.tsx) renders item rows + totals + addresses + timeline alongside an [AdminOrderTransitionPanel](./components/admin/admin-order-transition.tsx) that gates the next allowed status moves via `nextAdminStatuses(current)` (SRS §6.6.1 — PENDING → CONFIRMED / CANCELLED, CONFIRMED → PROCESSING / CANCELLED, etc.). The transition POST takes an internal note that lands on the new OrderEvent. Auth-gated to `ORDER_MANAGER` / `SUPER_ADMIN` (and read-only for `CUSTOMER_SUPPORT`).
- **Order-placed email** — [emails/order-placed.tsx](./emails/order-placed.tsx) is a React Email template that summarises order number, item count, total, COD vs paid framing, and the shipping address; rendered through the same `_layout.tsx` shell as Sprint 2's auth emails. [lib/services/order-email.ts](./lib/services/order-email.ts) wraps it as `sendOrderPlacedEmail(orderNumber)` — best-effort, never throws (a Resend outage shouldn't 500 a checkout). Wired into the COD branch of `startCheckoutSession` and the success branch of `verifyAndCapturePayment`. Dev fallback: `[email:dev] →` log to stdout when `RESEND_API_KEY` is unset (Sprint 2 plumbing).
- **Proxy update** — [proxy.ts](./proxy.ts) drops `/checkout/*` from the auth gate so guest checkout (SRS §6.5.1) reaches the page without bouncing through `/login`. `/admin/*` and `/account/*` stay gated.

### Verification

| Command | Result |
|---|---|
| `pnpm typecheck` (`tsc --noEmit`) | ✅ exit 0, zero errors |
| `pnpm lint` (`biome lint .`) | ✅ exit 0, zero new warnings (the 2 pre-existing nursery `noArrayIndexKey` warnings on Sprint-1 breadcrumbs/pagination remain accepted) |
| `pnpm prisma validate` | ✅ schema valid (no Sprint-4 schema changes — Order / OrderItem / OrderAddress / OrderEvent / Payment / Refund were already in the Sprint-0 schema) |
| `pnpm dev` | ⏸️ not booted — local Neon + AUTH_SECRET + Razorpay test keys still unprovisioned (Sprint 1 carry-over). Catalog + cart fall back to empty states; checkout requires a DB to render. |

### Up next — to take Sprint 4 from code-complete to merged

1. **Migration** — `pnpm prisma migrate dev --name init` (or rolled-up sprint migration) once `.env.local` is wired. No Sprint-4 schema additions, but Sprint 1 + 2 + 3 + 4 all ride on the same first migration.
2. **Razorpay test keys** — fill `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` in `.env.local` from the Razorpay test-mode dashboard. Webhook URL on the Razorpay dashboard points at `https://<staging>/api/webhooks/razorpay`; for local, expose via ngrok or trigger via `curl` with a hand-signed body.
3. **`pnpm dev` smoke** — log in, add a few items, hit Checkout. End-to-end tests:
   - **COD path**: pick COD → Place order → land on `/checkout/success` → `[email:dev] →` log shows the confirmation email → `/account/orders` lists the new order → `/account/orders/<num>` shows the timeline (PENDING → CONFIRMED on placement, COD note) → cancel from the customer page → stock is restored on the variant.
   - **Online path**: pick UPI → Razorpay test modal opens → use test card `4111 1111 1111 1111` (CVV 123, any future expiry) → success → `/checkout/success` → email log → order shows CONFIRMED + payment CAPTURED + a Razorpay payment id.
   - **Webhook idempotency**: hand-craft a `payment.captured` POST against `/api/webhooks/razorpay` with the live HMAC and replay it twice; the second call is a no-op (Payment.gatewayPaymentId unique).
4. **₹1 Razorpay test transaction** in the Razorpay sandbox to validate the auto-capture + signature verify wiring end-to-end.
5. **Admin smoke** — sign in as `SUPER_ADMIN`, walk an order through CONFIRMED → PROCESSING → SHIPPED → OUT_FOR_DELIVERY → DELIVERED via [/admin/orders/[id]](./app/(admin)/admin/orders/[id]/page.tsx). Confirm OrderEvents accrete with timestamps + the internal note.
6. **`pnpm build`** — first production build for Sprint 4; checkout / orders / webhook routes pin `runtime = 'nodejs'` (Prisma + node:crypto for HMAC). Confirm all routes survive the build.

**Sprint 4 polish backlog** (deferred, out of Sprint 4's critical path):
- **Razorpay Magic Checkout** (SRS §6.5.3) — Phase-2 1-click checkout for ~2× faster conversion. Web Checkout Standard ships in Sprint 4.
- **Coupon engine** (SRS §6.9) — Phase 2; the order schema reserves `discountTotal` so wiring is additive.
- **Loyalty point redemption + GST invoice mode polish** — partially supported (the `isGstInvoice` + `gstin` fields already land on the order); the printable invoice PDF is Sprint 5+.
- **Order cleanup cron for abandoned PENDING orders** — Phase 1 doesn't run a cron, so an online order whose Razorpay modal is closed leaves an Order in `PENDING` with stock decremented. Sprint 5's QStash schedule should mark them FAILED + restore stock after 30 minutes (Razorpay webhook `payment.failed` handles this when it fires; the cron is a backstop).
- **Reschedule delivery + return flow** (SRS §6.6.2) — Phase 2.
- **Bulk admin actions** (mark shipped, generate invoices, export CSV — SRS §6.6.3) — Phase 2; Sprint 4 ships the per-order transition only.
- **`StockMovement` audit row on order placement and cancel** — currently we only adjust `ProductVariant.stock` since `StockMovement` requires a `warehouseId` and the Phase-1 seed doesn't provision a warehouse. Sprint 5 (Shiprocket integration) is the natural moment to wire this.
- **Guest checkout polish** — guest checkout works, but the success page is the only place a guest can ever reach the order details page. A "track my order with email + order number" lookup form is Phase 2.
- **`x-razorpay-event-id` dedup** — the webhook handler is idempotent via the `gatewayPaymentId` / `gatewayRefundId` unique constraints (so replay of the same event is a no-op). A separate `WebhookEvent` audit log keyed by Razorpay's `x-razorpay-event-id` would make the trail explicit; deferred to Sprint 5.

### Blockers carried over from Sprint 1 / Sprint 2 / Sprint 3

- DB still not provisioned locally; same Neon block as Sprint 1 / 2 / 3.
- Razorpay KYC kicked off but live keys not yet provisioned. Sprint 4 verification uses test-mode keys.
- MSG91 DLT for SMS / WhatsApp — same as prior sprint blocker notes; Sprint 5 dependency.

### Decisions made this session

- **Razorpay HTTP client = `fetch` + `node:crypto`, no SDK.** Phase 1 only needs four calls (create order / fetch payment / create refund / verify signatures). The Razorpay REST API is stable, our wrappers are <200 lines, and skipping the SDK keeps the bundle lean. Revisit if we end up reimplementing SDK-level features (order pagination, settlements export — both Sprint 5+).
- **Auto-capture is the Phase-1 default** (`payment_capture: 1`). Manual capture is reserved for Sprint 5 polish (verify-before-charge for COD-style auth-only flows). Sprint 4 ships the simple, idempotent path.
- **HMAC-SHA256 over the raw body for the webhook**, before any `JSON.parse`. The route handler reads `req.text()` first and only parses inside the verifier success branch; corrupted JSON post-verify still returns `invalid_signature` so an attacker can't induce 500s. `node:crypto.timingSafeEqual` is used to dodge timing attacks on the comparison.
- **Idempotency lives on the database, not in code.** `Payment.gatewayPaymentId @unique` and `Refund.gatewayRefundId @unique` make duplicate webhook deliveries cheap to handle: the upsert short-circuits when the row already matches the incoming state, and the next `payment.captured` for the same payment id is a no-op. Same idea for the `/api/orders/verify` path — `confirmOnlinePayment` short-circuits if the webhook already promoted the order to CONFIRMED.
- **Stock decrement happens at order placement**, not at cart-add (Sprint 3 prep). The `UPDATE product_variant SET stock = stock - q, version = version + 1 WHERE id = ? AND version = ?` pattern returns 0 rows when a concurrent transaction has touched the variant; Sprint 4 throws `STOCK_CONFLICT` and bails (no retry — the customer sees the inline error and refreshes). This is consistent with what Indian e-commerce competitors do.
- **Order placement is a single `prisma.$transaction`** that recomputes prices server-side, validates stock, decrements variants, writes Order + items + addresses + initial events + payment row, and (for COD) clears the cart. Razorpay's create-order is *not* inside the TX — it's an external HTTP call we don't want holding a Postgres transaction open. If Razorpay returns a 5xx, `safeRollbackPlacedOrder` runs separately to restore stock and mark the order CANCELLED so the customer can retry.
- **Server-side amount recheck at verify time.** `verifyAndCapturePayment` calls `fetchRazorpayPayment(payment_id)` and asserts `payment.amount === order.total` in paise before flipping `paymentStatus → CAPTURED`. The signature alone proves the payment happened; the amount check guards against an attacker substituting a different (lower) Razorpay order id. SRS §12.2 hard requirement.
- **Order numbers = `NMN<YYYYMMDD>-<6-char-nanoid>`** with the nanoid alphabet excluding I/O/0/1 for legibility. 32^6 = ~1B combinations per day, with the unique constraint as the hard ceiling. Format intentionally reads like a ticket number on emails / invoices.
- **`OrderItem.productSnapshot` freezes the catalog state at placement** — name, slug, sku, variant attributes, hsn, gstRate, brand, image, mrpPaise. Even if the product is deleted, the order pages still render with the right thumbnail and name. The snapshot is the only thing the customer pages and admin tables read; they never re-join Product on render.
- **Payment.gateway = 'COD'** is its own enum value (not a "Razorpay COD" mode). It represents "no gateway involved — a courier collects cash on delivery." The Order.status is CONFIRMED immediately at placement; payment_status flips to CAPTURED when delivered (Sprint 5 wires the courier-side OTP confirmation).
- **Address resolution = saved-id-or-inline-snapshot.** Logged-in users pick a saved Address by id; the order resolves it inside the placement TX so a concurrent edit can't race. Guests (and "use a new address") send the address inline. Either way, the OrderAddress row is a snapshot — editing the source Address later doesn't rewrite history.
- **Billing snapshot is always written, even when `billingSameAsShipping`** is set. It's a small duplication (1 extra row) but means downstream code (invoice render, refund processing, CRM export) never has to special-case the boolean.
- **Phase-1 shipping rates are flat tiers** (Standard ₹49 / free above ₹999, Express ₹99, Same-day ₹199 — metro-only). SRS §6.7's per-pincode rate engine + Shiprocket lands in Sprint 5; the constants are exported from `lib/pricing-shared.ts` so Sprint 5 can swap them out without touching call sites.
- **COD convenience fee = ₹49 per order**, derived automatically from `paymentMethod === 'COD'` in the pricing engine. SRS §6.5.4 mentions "configurable per pincode tier" — Phase 2 polish.
- **Same-day delivery is gated to metro pincodes** (`110*/400*/560*/700*/600*/500*` — Delhi, Mumbai, Bengaluru, Kolkata, Chennai, Hyderabad). The checkout page disables the radio outside these tiers. The list lives in `lib/services/serviceability.ts` and `components/shop/checkout/checkout-page.tsx` and should converge to one source in Sprint 5.
- **Pricing constants live in `lib/pricing-shared.ts`, not `lib/services/pricing.ts`.** The full engine stays `'server-only'` (it imports `Prisma.Decimal`), but the four constants + `shippingPaiseFor` / `codFeeFor` need to render on the client checkout page. Splitting them into a non-`server-only` shim was the cleanest way to share without leaking Prisma into the browser bundle.
- **Guest checkout is allowed** — `proxy.ts` no longer redirects unauthenticated `/checkout/*` to `/login`. The success page handles signed-out viewers by routing the "view order" CTA through `/login`. Per SRS §6.5.1.
- **The Razorpay Web Checkout `<script>` is lazy-loaded** via `lib/hooks/use-razorpay.ts` rather than being emitted at the layout level. Cart and PDP visitors don't need the iframe loader; only `/checkout` does. The hook fetches once per page mount and resolves on subsequent calls.
- **Admin status transitions are gated** by an explicit `nextAdminStatuses(current)` map: PENDING → CONFIRMED / CANCELLED, CONFIRMED → PROCESSING / CANCELLED, PROCESSING → SHIPPED / CANCELLED, SHIPPED → OUT_FOR_DELIVERY, OUT_FOR_DELIVERY → DELIVERED. Customer cancel is a separate code path (only PENDING / CONFIRMED / PROCESSING). RETURN_REQUESTED → RETURN_PICKED_UP → REFUNDED is on the map but the customer-side return UI is Phase-2.
- **Order email send is best-effort + idempotent at the application layer** (every send rebuilds the email; Resend dedupe is its problem). The function never throws, so a Resend outage doesn't fail the order placement. Cart abandonment / shipping notifications are Sprint 5 work.

### Previous sessions

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
| 2026-05-08 | **`StockMovement` audit deferred to Sprint 5** | The model requires a `warehouseId` and Phase-1 doesn't seed warehouses. Direct `ProductVariant.stock` decrement is correct; the audit row joins the inventory pipeline alongside Shiprocket. |

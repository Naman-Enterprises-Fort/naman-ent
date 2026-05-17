# Manual Testing Guide

Complete functional + UX test pass for the Naman Electronics demo. Run before any client demo or release.

**Estimated time:** 90–120 minutes for a full run · 15 minutes for the smoke test only.

---

## 1. Pre-test setup

Before you start, get the environment to a known-good state.

### 1.1 Local environment

```bash
# 1. Docker postgres up
docker compose up -d

# 2. Confirm DB healthy
docker inspect --format '{{.State.Health.Status}}' naman-postgres   # → healthy

# 3. Fresh seed (idempotent — re-archives any prior testing rows)
pnpm prisma migrate dev --name init   # only on a fresh DB; safe to skip if already migrated
pnpm db:seed                          # 18 categories, 18 brands, 65 products

# 4. Test users (idempotent)
pnpm tsx scripts/create-test-user.ts
#   → test@naman.dev   / TestUser2026!    (CUSTOMER)
#   → admin@naman.dev  / AdminUser2026!   (SUPER_ADMIN)

# 5. Production-grade smoke server (recommended over `pnpm dev` for testing)
pnpm build && pnpm start
# OR `pnpm dev` if you want HMR — but `dev` (Turbopack) can stall mid-route
```

### 1.2 Browser setup

- **Primary browser:** Chrome (latest)
- **Secondary:** Firefox + Safari (or Edge on Windows)
- **Mobile:** Chrome DevTools mobile emulation (iPhone 13, Pixel 7, iPad Mini) + at least one real device if possible
- **Clear state** between major test sections: `Ctrl+Shift+Delete` → "Cookies and site data" → "localhost" → Clear
- **Open DevTools** (`F12`) → Console tab visible at all times — watch for red errors

### 1.3 Test data reset between runs

Reset the test order + cart between full runs:

```sql
-- Run in psql or any DB tool
DELETE FROM "OrderEvent";
DELETE FROM "OrderItem";
DELETE FROM "OrderAddress";
DELETE FROM "Payment";
DELETE FROM "Order";
DELETE FROM "CartItem";
DELETE FROM "Cart";
-- Optional: reset stock if you've placed many test orders
UPDATE "ProductVariant" SET stock = stock + 10 WHERE stock < 50;
```

---

## 2. Smoke test (15 minutes — for "is the demo alive?")

Use this when you have 15 minutes before a client call. **Every step must pass** or do not demo.

| # | Step | Expected |
|---|---|---|
| S1 | Visit `http://localhost:3000` | Home renders: header + hero + categories grid (real photos) + Trending strip (varied product photos with discount chips + INR prices) + Top brands strip (real logos) + footer |
| S2 | Click any header nav category (e.g., Ink Cartridges) | PLP loads with product grid, brand filter sidebar with counts, sort dropdown, breadcrumbs |
| S3 | Click any product | PDP loads with product image, title, brand, price, In-stock, Add to cart, Buy now, PIN check, warranty, In-the-box, Overview, Specifications, You-may-also-like |
| S4 | Add to cart | Mini-cart drawer slides in showing the new line + totals |
| S5 | Header cart icon → /cart | Cart page renders with free-shipping bar + line + order summary + Proceed to checkout |
| S6 | Login as `test@naman.dev / TestUser2026!` | Lands on `/account` with "Hi, Test" + Quick actions |
| S7 | Proceed to checkout → fill form → place COD order | Order success page shows order number + confirmation |
| S8 | DevTools console (entire session) | Zero red errors (warnings OK) |

If all 8 pass → ✅ safe to demo. If any fail → fix before showing client.

---

## 3. Functional test cases (full pass)

Each test case has an ID like `TC-CAT-01`. Mark Pass / Fail / Blocked in your tracker.

### 3.1 Catalog — Home page

| ID | Steps | Expected | P/F |
|---|---|---|---|
| TC-HOME-01 | Visit `/` (unauthenticated, fresh browser) | Hero, 8 category tiles, Trending row, Top brands, Footer all render. No console errors. |  |
| TC-HOME-02 | Click "Shop ink cartridges" CTA | Navigates to `/category/ink-cartridges` |  |
| TC-HOME-03 | Click "Browse toner" CTA | Navigates to `/category/toner-cartridges` |  |
| TC-HOME-04 | Each of 8 category tile clicks | Each lands on the correct `/category/<slug>` |  |
| TC-HOME-05 | Click "See all" next to Shop by category | Navigates to `/category` showing all 18 cats |  |
| TC-HOME-06 | Each Trending product card click | Lands on the correct `/products/<slug>` |  |
| TC-HOME-07 | Click any Top brand card | Navigates to `/search?brand=<slug>` and shows filtered products |  |
| TC-HOME-08 | Hover any category tile | Photo scales subtly (1.05x), no layout jump |  |
| TC-HOME-09 | View-source on Home | `<title>`, `<meta name="description">`, `<link rel="canonical">`, OpenGraph tags, 3 JSON-LD blocks (Organization, WebSite, ItemList) all present |  |
| TC-HOME-10 | Header search bar | Placeholder reads "Search ink, toner, cartridges, printers..." (not truncated). Click types — search suggest dropdown appears after 150ms typing |  |
| TC-HOME-11 | Cart icon (unauthenticated) | Badge shows 0 or no badge for fresh session |  |
| TC-HOME-12 | Account icon (unauthenticated) | Shows arrow-right icon; clicking goes to `/login` |  |

### 3.2 Catalog — Category PLP

Test on at least 3 categories: `/category/ink-cartridges`, `/category/toner-cartridges`, `/category/inkjet-printers`.

| ID | Steps | Expected | P/F |
|---|---|---|---|
| TC-PLP-01 | Visit `/category/ink-cartridges` | Breadcrumbs (Home > Categories > Ink Cartridges), title, product count (19 products), filter sidebar, sort dropdown, product grid |  |
| TC-PLP-02 | Brand filter — tick "HP" | Grid filters to 6 HP products only. URL updates with `?brand=hp`. Count updates. |  |
| TC-PLP-03 | Brand filter — tick "HP" + "Canon" | Grid shows union (HP OR Canon). URL has both `?brand=hp&brand=canon` |  |
| TC-PLP-04 | Brand filter — untick all | All products return |  |
| TC-PLP-05 | Price range — Min ₹500 Max ₹2000 → Apply | Grid filters to products in that range. URL updates |  |
| TC-PLP-06 | In stock only checkbox | Out-of-stock items hide (none currently exist, but checkbox should work) |  |
| TC-PLP-07 | Sort dropdown — Price low → high | Products re-order by price ascending |  |
| TC-PLP-08 | Sort dropdown — Newest | Products re-order by createdAt desc |  |
| TC-PLP-09 | Sort + Filter combined | Both apply (filter narrows, sort orders within) |  |
| TC-PLP-10 | Click "Clear all" link in filter sidebar | All filters reset, full grid returns |  |
| TC-PLP-11 | Product card hover | Image scales subtly, name stays readable |  |
| TC-PLP-12 | Visit category with 0 active products (any unused cat) | Empty state shows "No products in this category" with helpful copy |  |
| TC-PLP-13 | URL with bad slug — `/category/non-existent` | Branded 404 page renders |  |
| TC-PLP-14 | Filter sidebar collapses on mobile (DevTools 390px width) | Filters become a drawer/sheet accessible via a button |  |

### 3.3 Catalog — Product PDP

Test on at least 5 products spanning categories.

| ID | Steps | Expected | P/F |
|---|---|---|---|
| TC-PDP-01 | Visit `/products/hp-67-black-original` | Breadcrumbs, product image, brand label, title, short desc, price + MRP + discount chip + "Inclusive of all taxes" |  |
| TC-PDP-02 | In-stock indicator | Shows "In stock" in green (or appropriate state) |  |
| TC-PDP-03 | Click "Add to cart" | Mini-cart drawer opens with the new line, qty 1, brief flash highlight |  |
| TC-PDP-04 | Re-click "Add to cart" same product | Drawer opens, qty increments to 2 (not new line) |  |
| TC-PDP-05 | Click "Buy now" | Adds + redirects straight to /checkout (auth required if not signed in → /login) |  |
| TC-PDP-06 | PIN code: enter "400001" → Check | Shows "Delivery to Mumbai by [date]" + same-day eligibility (if metro) |  |
| TC-PDP-07 | PIN code: enter "123456" (non-existent) | Shows fallback or "Pincode not serviceable" message |  |
| TC-PDP-08 | Click "Save to wishlist" (signed-in) | Currently links to /account/wishlist placeholder page (Phase 2) |  |
| TC-PDP-09 | Specs accordion: click each section | Yield / Compatibility / Color sections expand showing key-value pairs |  |
| TC-PDP-10 | Scroll to "You may also like" | At least 4 related products from same category, all clickable |  |
| TC-PDP-11 | View-source on PDP | Product + BreadcrumbList JSON-LD present in head |  |
| TC-PDP-12 | Try product with multiple variants (e.g., USB cable `/products/usb-printer-cable-15m`) | Variant selector (or attribute chips) visible; selecting different variant updates price + SKU |  |
| TC-PDP-13 | Mobile width (390px) | Image gallery stacks, price + CTAs visible, sticky "Add to cart" bar at bottom |  |
| TC-PDP-14 | Bad slug — `/products/non-existent` | Branded 404 page |  |

### 3.4 Search

| ID | Steps | Expected | P/F |
|---|---|---|---|
| TC-SRCH-01 | `/search?q=hp` | "Results for hp", count (e.g., 27 products found), grid with HP products |  |
| TC-SRCH-02 | `/search?q=Epson` | Case-insensitive match — Epson products returned |  |
| TC-SRCH-03 | `/search?q=ink` | Multi-result fuzzy match across categories |  |
| TC-SRCH-04 | `/search?q=xyzzy` (no match) | "No products match" empty state with Ink Cartridges / Toner Cartridges / Ink Bottles / All categories CTA buttons |  |
| TC-SRCH-05 | `/search?q=` (empty) | "Search the catalog" placeholder card with example queries (HP 67 Black, Epson 003, Brother TN-2280) |  |
| TC-SRCH-06 | Search via header search bar | Typing + Enter navigates to `/search?q=...` |  |
| TC-SRCH-07 | Header search suggest (desktop) | Type "hp" → wait 200ms → dropdown shows up to 5 product suggestions with image + name + price |  |
| TC-SRCH-08 | Search suggest keyboard nav | Arrow Down highlights options, Enter selects, Esc closes |  |
| TC-SRCH-09 | Search with very long query (200 chars) | Truncates gracefully, no crash |  |
| TC-SRCH-10 | Search with special chars — `q=<script>` | Encoded properly, no XSS |  |

### 3.5 Cart

| ID | Steps | Expected | P/F |
|---|---|---|---|
| TC-CART-01 | Visit `/cart` with empty cart | "Your cart is empty" empty state with "Start shopping" CTA |  |
| TC-CART-02 | Add 1 product from PDP → visit `/cart` | Line shows product image, brand, name, variant, price, MRP strikethrough, qty stepper (1), Save for later, Remove. Order summary on right |  |
| TC-CART-03 | Increment qty via + button | Line total updates immediately, totals re-render, no full reload |  |
| TC-CART-04 | Decrement qty to 0 via – | Line auto-removes (or shows confirm) |  |
| TC-CART-05 | Click Remove | Line vanishes; if cart now empty, shows empty state |  |
| TC-CART-06 | Click "Save for later" | Line moves to "Saved for later" section, excluded from totals |  |
| TC-CART-07 | Click "Move to cart" on saved item | Returns to active section, counts in totals again |  |
| TC-CART-08 | Cart total under ₹999 | Free shipping bar shows "Add ₹X for free shipping" (orange progress) |  |
| TC-CART-09 | Cart total ≥ ₹999 | Free shipping bar shows green "You qualify for free shipping" |  |
| TC-CART-10 | Subtotal vs Total math | GST is backed-out: `subtotal + GST = subtotal of items` (verify on a 28% HSN item) |  |
| TC-CART-11 | Add 2 of same product | Single line with qty 2, line total = unit price × 2 |  |
| TC-CART-12 | Try qty 999 | Capped at variant stock (e.g., 48 for HP 67); shows "Only X available" |  |
| TC-CART-13 | Refresh page mid-edit | Cart state persists (DB-backed) |  |
| TC-CART-14 | Sign out → sign back in | Cart preserved (cookie → user merge) |  |
| TC-CART-15 | Sign in with items in guest cart + items already in user cart | Merge: quantities sum where same variant exists, additions otherwise |  |

### 3.6 Auth — Registration

| ID | Steps | Expected | P/F |
|---|---|---|---|
| TC-AUTH-01 | Visit `/register` | Form: Full name, Email, Password (with hint), Confirm password, Terms checkbox, Turnstile widget (or notice) |  |
| TC-AUTH-02 | Submit empty form | All-required validation errors inline |  |
| TC-AUTH-03 | Email format invalid | Inline error |  |
| TC-AUTH-04 | Password < 8 chars | Inline error "At least 8 characters" |  |
| TC-AUTH-05 | Password without digit | Inline error |  |
| TC-AUTH-06 | Confirm password mismatch | Inline error |  |
| TC-AUTH-07 | Terms unchecked | Form blocked from submission |  |
| TC-AUTH-08 | Valid form submit (TURNSTILE_SECRET_KEY unset) | Redirect to `/verify-email?email=...`. Check server stdout for `[email:dev] →` verification link |  |
| TC-AUTH-09 | Click stdout verification link | Lands on `/verify-email?status=success` |  |
| TC-AUTH-10 | Try register existing email | Same generic conflict response (no account enumeration) |  |
| TC-AUTH-11 | Try register email used by Google-only account | Same generic conflict |  |

### 3.7 Auth — Login + Password reset

| ID | Steps | Expected | P/F |
|---|---|---|---|
| TC-LOGIN-01 | `/login` form rendering | Email, Password, Forgot password link, Sign in button, "or" divider, Continue with Google, Create account link |  |
| TC-LOGIN-02 | Correct credentials | Redirect to `/account` |  |
| TC-LOGIN-03 | Wrong password | Generic error, no detail leakage |  |
| TC-LOGIN-04 | Wrong email format | Inline error |  |
| TC-LOGIN-05 | 5 wrong attempts in a row | Account lockout for 10 min (only locks on existing-user wrong-password). Test by checking 6th attempt also fails even with correct password |  |
| TC-LOGIN-06 | Login + "remember me" (if present) | Session cookie persists across browser restart |  |
| TC-LOGIN-07 | `/forgot-password` form | Email field + submit |  |
| TC-LOGIN-08 | Submit valid email | Generic success message regardless of whether email exists |  |
| TC-LOGIN-09 | Use stdout reset link | Lands on `/reset-password?token=...` |  |
| TC-LOGIN-10 | Reset password, set new | Lands on `/login` with success banner. Old password no longer works. New works. |  |
| TC-LOGIN-11 | Try expired reset link (wait 15 min) | "Link expired" error |  |
| TC-LOGIN-12 | Try used reset link twice | Second use rejected |  |

### 3.8 Account dashboard

| ID | Steps | Expected | P/F |
|---|---|---|---|
| TC-ACC-01 | `/account` (signed in) | "Hi, [Name]" + Quick actions cards (Profile, Orders, Addresses, Security) |  |
| TC-ACC-02 | `/account/profile` | Form pre-filled with name, email, phone, image |  |
| TC-ACC-03 | Edit name → save | Updates immediately, persists on refresh |  |
| TC-ACC-04 | `/account/addresses` (empty) | "No saved addresses yet" + "Add an address" button |  |
| TC-ACC-05 | Add address: fill form with PIN 110001 | City "New Delhi" + State "Delhi" auto-fill (India Post lookup) |  |
| TC-ACC-06 | Save address, then add another | Both listed; one marked Default |  |
| TC-ACC-07 | Mark second as default | First loses default badge, second gains it |  |
| TC-ACC-08 | Delete default address | Next-most-recent address auto-promotes to default |  |
| TC-ACC-09 | `/account/security` | Change password form + active sessions list + "Sign out everywhere" button |  |
| TC-ACC-10 | Change password (correct current) | Success message. Try login with new password — works |  |
| TC-ACC-11 | Sign out everywhere | All sessions invalidated; force-redirect to /login |  |
| TC-ACC-12 | `/account/orders` (empty) | "No orders yet" + "Start shopping" CTA |  |
| TC-ACC-13 | `/account/wishlist` | Placeholder "Wishlist is coming in Phase 2" page |  |
| TC-ACC-14 | `/account/returns` | Placeholder with mailto support link |  |
| TC-ACC-15 | `/account/reviews` | Placeholder page |  |

### 3.9 Checkout (COD path — no Razorpay needed)

| ID | Steps | Expected | P/F |
|---|---|---|---|
| TC-CO-01 | Cart with 1+ items → "Proceed to checkout" | `/checkout` page with 4-section accordion: Contact / Address / Shipping / Payment + Review sidebar |  |
| TC-CO-02 | Contact email pre-filled if signed in | Email read-only or pre-filled |  |
| TC-CO-03 | Enter mobile 9876543210 | Validates 10-digit Indian format |  |
| TC-CO-04 | Mobile 5 digits | Inline error |  |
| TC-CO-05 | Saved addresses (if any) | Radio cards to pick from |  |
| TC-CO-06 | New address: PIN 400001 | City Mumbai + State Maharashtra auto-fill |  |
| TC-CO-07 | New address: PIN 110001 | New Delhi + Delhi auto-fill |  |
| TC-CO-08 | New address: invalid PIN "00000" | Validation error |  |
| TC-CO-09 | Shipping method radios | Standard (Free if cart ≥ ₹999, else ₹49), Express ₹99, Same-day ₹199 (metro only) |  |
| TC-CO-10 | Same-day for non-metro PIN | Greyed out / disabled with note |  |
| TC-CO-11 | Payment method (Razorpay not configured) | Banner: "Online payments not configured. Choose COD." COD auto-selected |  |
| TC-CO-12 | COD selected → totals | Subtotal + Shipping + GST + COD fee (₹49) = Total. CGST/SGST split if intra-state Maharashtra, IGST otherwise |  |
| TC-CO-13 | Click "Place order" | Redirect to `/checkout/success?orderNumber=NMN...` |  |
| TC-CO-14 | Success page | Order number, Pay amount on delivery, Confirmation email card, Processing card, Delivery card with address, Order summary |  |
| TC-CO-15 | Stock decrements | Visit the product PDP — stock count went down by qty ordered |  |
| TC-CO-16 | Server stdout | `[email:dev] →` order placed email logged |  |

### 3.10 Checkout (Razorpay test — if test keys wired)

Requires `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_WEBHOOK_SECRET` in `.env.local`.

| ID | Steps | Expected | P/F |
|---|---|---|---|
| TC-RZP-01 | Checkout with test keys | Payment section shows UPI / Cards / Wallets / Net Banking / EMI options |  |
| TC-RZP-02 | Pick UPI → Place order | Razorpay modal opens (iframe from checkout.razorpay.com) |  |
| TC-RZP-03 | Enter test card 4111 1111 1111 1111, CVV 123, future expiry, OTP 1234 | Modal closes on success → success page |  |
| TC-RZP-04 | Order in DB | Status CONFIRMED, payment CAPTURED, gatewayPaymentId set |  |
| TC-RZP-05 | Close Razorpay modal mid-payment | Cart stays intact, order in PENDING state (will auto-cancel via cron) |  |
| TC-RZP-06 | Wrong test card | Razorpay modal shows error, order not placed |  |

### 3.11 Customer order management

| ID | Steps | Expected | P/F |
|---|---|---|---|
| TC-ORD-01 | `/account/orders` after placing | Table with order number, date, status badge, total, "View" link |  |
| TC-ORD-02 | Click View → order detail | Timeline (Pending → Confirmed), Items, Shipping/Billing addresses, Payment status, Cancel button (PENDING/CONFIRMED/PROCESSING states) |  |
| TC-ORD-03 | Click "Cancel order" | Confirmation dialog → order CANCELLED + stock restored |  |
| TC-ORD-04 | Order in SHIPPED state | Cancel button disabled or hidden |  |
| TC-ORD-05 | Order in DELIVERED state | Shows "Re-order" button (Phase 2 — verify behavior) |  |
| TC-ORD-06 | Direct URL to other user's order | 404 or "Not found" (no IDOR vulnerability) |  |
| TC-ORD-07 | Track shipment | If Shiprocket wired + shipment exists, shows tracking link + courier + AWB |  |

### 3.12 Admin

Login as `admin@naman.dev / AdminUser2026!` (SUPER_ADMIN). Test as different roles by changing `User.role` in DB.

| ID | Steps | Expected | P/F |
|---|---|---|---|
| TC-ADM-01 | `/admin` direct URL | Redirects to `/admin/dashboard` |  |
| TC-ADM-02 | `/admin/dashboard` | 5 KPI tiles: Products (active count), Categories 18, Brands 18, Orders, Customers |  |
| TC-ADM-03 | `/admin/products` | Table of all active products with name, brand, SKU, price, stock, variants, status, View link, "+ New product" button |  |
| TC-ADM-04 | "+ New product" | Form: name, slug (auto), brand, categories (multi), description, short desc, HSN, warranty, box contents, variants (SKU/MRP/price/stock/attributes), images (URLs), specs (group/key/value) |  |
| TC-ADM-05 | Submit valid new product | Redirects to /admin/products/[id]/edit. Visible on public catalog after revalidate |  |
| TC-ADM-06 | Submit duplicate slug | Server-side validation error |  |
| TC-ADM-07 | Edit existing product | Changes save, public catalog updates on next revalidate (or hard reload) |  |
| TC-ADM-08 | Archive product | Status: ARCHIVED + deletedAt set. Disappears from public catalog. Still in admin list (filtered) |  |
| TC-ADM-09 | Edit variant: change SKU | New SKU shown |  |
| TC-ADM-10 | Delete variant referenced by cart/order | "VARIANT_IN_USE" error (409) |  |
| TC-ADM-11 | `/admin/categories` | Tree view with parents + children, drag/active toggles |  |
| TC-ADM-12 | Create new category | Form: name, slug, parent, image URL, sort order |  |
| TC-ADM-13 | Create category with circular parent | Validation rejects |  |
| TC-ADM-14 | `/admin/brands` + create new | Works |  |
| TC-ADM-15 | `/admin/orders` | List with status filter chips |  |
| TC-ADM-16 | Click any order → admin detail | Status panel + Items + Addresses + Payment + Timeline |  |
| TC-ADM-17 | "Mark processing" on a CONFIRMED order | Status → PROCESSING, timeline appends |  |
| TC-ADM-18 | "Mark shipped" → "Mark out for delivery" → "Mark delivered" | Each transition works |  |
| TC-ADM-19 | Try invalid transition (e.g., DELIVERED → PROCESSING) | 409 INVALID_TRANSITION |  |
| TC-ADM-20 | `/admin/customers` | Searchable table of users with role/status badges |  |
| TC-ADM-21 | Search by email | Filters table |  |
| TC-ADM-22 | `/admin/coupons` | Phase-2 preview page |  |
| TC-ADM-23 | `/admin/reports` | Sprint-5 preview page |  |
| TC-ADM-24 | Login as CUSTOMER (test@naman.dev) → /admin direct | Redirect to /account or /login (no access) |  |

### 3.13 Static + Legal pages

| ID | Steps | Expected | P/F |
|---|---|---|---|
| TC-STAT-01 | `/privacy` | Renders with breadcrumbs, last-updated date, sections (Scope, Information we collect, ...). DPDP Act 2023 mention |  |
| TC-STAT-02 | `/terms` | Renders cleanly |  |
| TC-STAT-03 | `/returns` | Returns policy with windows + process |  |
| TC-STAT-04 | `/shipping` | Shipping policy with rates + delivery times |  |
| TC-STAT-05 | `/cancellation` | Cancellation policy |  |
| TC-STAT-06 | `/cookies` | Cookies policy |  |
| TC-STAT-07 | `/contact` | Contact form + Grievance Officer disclosure card (48hr ack / 30-day resolution SLA) |  |
| TC-STAT-08 | `/sitemap.xml` | Valid XML sitemap index pointing to 3 sub-sitemaps |  |
| TC-STAT-09 | `/sitemap-products.xml` | All active products with lastmod |  |
| TC-STAT-10 | `/robots.txt` | Allow-all + disallow /admin /account /checkout /cart /api + sitemap pointer |  |
| TC-STAT-11 | `/random-url-not-real` | Branded 404 page with search, "Back to home", "Browse all categories", suggestion list |  |

---

## 4. Negative / edge case tests

| ID | Test | Expected | P/F |
|---|---|---|---|
| TC-NEG-01 | Visit `/checkout` without items in cart | Redirect to /cart with "empty cart" message |  |
| TC-NEG-02 | POST `/api/cart/items` with invalid JSON | 400 with Zod error |  |
| TC-NEG-03 | POST `/api/orders/verify` without HMAC | 400 invalid_signature |  |
| TC-NEG-04 | Try to access `/account/orders/<other-user-order>` | 404 (no IDOR) |  |
| TC-NEG-05 | Disable JS in browser → browse catalog | Pages still render (RSC); cart/checkout degrades but pages don't break |  |
| TC-NEG-06 | Browse without cookies | Catalog works; cart can't be created |  |
| TC-NEG-07 | DB connection severed mid-request (stop docker) | Public pages show "empty grid" / safe fallback (per `safe()` wrapper); writes 500 |  |
| TC-NEG-08 | Restart DB → public pages recover on refresh | Yes |  |
| TC-NEG-09 | Rapid click "Add to cart" 10x | Either debounced or each is processed serially; no double-charge |  |
| TC-NEG-10 | Rapid "Place order" double-click | Single order created (idempotent on cart hash or button disabled after click) |  |
| TC-NEG-11 | Browser back button after order placed | Doesn't re-place order |  |
| TC-NEG-12 | Try SQL injection in search: `q=' OR 1=1--` | Encoded as plain string, no error, treated as search term |  |
| TC-NEG-13 | Try XSS in registration name: `<script>alert(1)</script>` | Escaped on display, no execution |  |
| TC-NEG-14 | Upload to image input via paste — non-image URL | Validation error |  |
| TC-NEG-15 | Place order with stock = 1 from two browsers simultaneously | One succeeds, the other fails with STOCK_CONFLICT (optimistic-lock) |  |

---

## 5. Cross-browser + responsive

For each browser, run smoke test (§2) + spot-check checkout.

| Browser/Device | Smoke | Checkout | Cart | Notes |
|---|---|---|---|---|
| Chrome desktop 1440px | | | | |
| Firefox desktop 1440px | | | | |
| Safari desktop (if Mac) | | | | |
| Edge desktop | | | | |
| Chrome DevTools — iPhone 13 (390×844) | | | | Sticky add-to-cart on PDP, bottom nav |
| Chrome DevTools — Pixel 7 (412×915) | | | | |
| Chrome DevTools — iPad Mini (768×1024) | | | | |
| Real iPhone (if available) | | | | |
| Real Android (if available) | | | | |

**Mobile-specific checks:**
- Bottom nav (Home / Categories / Search / Cart / Account) visible + sticky
- Hamburger menu opens (top-left)
- Sticky "Add to cart" CTA on PDP
- Header search collapses to icon (mobile shows separate sub-row)
- Tap targets ≥ 44×44 px
- No horizontal scrolling

---

## 6. Performance + Lighthouse

Per SRS §9. Run from incognito with `pnpm start` (production build).

| Page | Target Perf | Target A11y | Target SEO | Actual |
|---|---|---|---|---|
| `/` (Home) | ≥ 85 mobile | ≥ 95 | ≥ 95 | |
| `/category/ink-cartridges` (PLP) | ≥ 85 | ≥ 95 | ≥ 95 | |
| `/products/hp-67-black-original` (PDP) | ≥ 85 | ≥ 95 | ≥ 95 | |
| `/search?q=hp` | - | ≥ 95 | N/A | |
| `/cart` | - | ≥ 95 | N/A | |
| `/checkout` | - | ≥ 95 | N/A | |

```bash
# Optional Lighthouse CLI
pnpm dlx lighthouse http://localhost:3000 --view --preset=desktop
pnpm dlx lighthouse http://localhost:3000 --view --form-factor=mobile
```

---

## 7. Accessibility (WCAG 2.2 AA)

| Check | Method | Pass |
|---|---|---|
| Keyboard nav — Tab through entire page | Tab key, no mouse | All interactive elements reachable, visible focus ring |
| Skip-to-content link | Tab once on page load | Visible "Skip to main content" link |
| Forms — labels associated with inputs | DevTools Accessibility tab | Every input has `<label>` or `aria-label` |
| Forms — errors announced | Screen reader test | Errors have `aria-live` or are linked via `aria-describedby` |
| Alt text on images | View-source | `<img alt="">` (decorative) or `alt="..."` (meaningful) |
| Color contrast | Chrome DevTools color picker | All body text ≥ 4.5:1, large text ≥ 3:1 |
| Headings logical | DevTools Accessibility → Headings | h1 → h2 → h3, no skips |
| Reduced motion | `prefers-reduced-motion: reduce` toggle | Animations disabled or simplified |
| Screen reader spot-check | NVDA (Windows) or VoiceOver (Mac) on PDP + Cart | Page structure announces correctly |

---

## 8. Bug report template

When a test fails, capture:

```
### Bug: [short title]

**Test case:** TC-XXX-NN
**Severity:** crit / bug / polish / a11y
**Browser:** Chrome 127 / Firefox 128 / Safari 17 / Edge 127
**Viewport:** 1440×900 / 390×844 / etc.
**Steps to reproduce:**
1.
2.
3.

**Expected:**

**Actual:**

**Screenshot:** [attach]

**Console errors:** [paste from DevTools]
**Network errors:** [paste from DevTools]

**Related:** [git commit if known]
```

---

## 9. Pre-demo checklist

Run 30 minutes before any client demo:

- [ ] `docker compose up -d` — postgres running
- [ ] `pnpm db:seed` — fresh catalog (resets any test orders)
- [ ] DB reset SQL from §1.3 — clean orders + carts
- [ ] `pnpm tsx scripts/create-test-user.ts` — test users restored
- [ ] `pnpm build && pnpm start` — production server (not dev)
- [ ] Smoke test §2 (15 min) — every step green
- [ ] Pre-fill checkout test address in your test account so demo doesn't show empty form
- [ ] Browser cache cleared, no auto-fill noise
- [ ] DevTools closed during demo (unless showing performance)
- [ ] Stable internet for Unsplash images + SimpleIcons logos
- [ ] Backup: have screenshots of the golden path ready in case live fails

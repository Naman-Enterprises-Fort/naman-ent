# CLAUDE.md — Project Memory

> **This is the permanent memory for the project. Future sessions MUST read this file, [PROGRESS.md](./PROGRESS.md), and the relevant SRS section in [docs/SRS.md](./docs/SRS.md) before writing any code.**

---

## 1. Mission

A modern, mobile-first, SEO-dominant electronics e-commerce platform for the Indian market — competing with Croma, Reliance Digital, Amazon Electronics, and Flipkart on usability while staying lean, fast, and revenue-efficient. Built on Next.js 16 App Router with React Server Components by default, Razorpay-only payments, and a Phase-1 monthly fixed cost of ~₹1,770 (everything on free tiers except Vercel Pro). Phases 1–5 span MVP → conversion/trust → scale/multi-vendor → expansion → international.

The single source of truth is [docs/SRS.md](./docs/SRS.md). When in doubt, the SRS wins over prior assumptions.

---

## 2. Locked Tech Stack — Exact Versions (DO NOT CHANGE WITHOUT APPROVAL)

These versions are pinned in `package.json` exactly as listed. They come from SRS §4 and were verified against the npm registry at bootstrap. Never bump a major or minor without the user's approval.

### Frontend
| Package | Version | Notes |
|---------|---------|-------|
| `next` | **16.2.6** | App Router only. RSC by default. |
| `react` | **19.2.6** | Server Components first. |
| `react-dom` | **19.2.6** | Match React. |
| `typescript` | **6.0.3** | Strict mode. |
| `tailwindcss` | **4.2.4** | CSS-first config via `@theme`, no `tailwind.config.js`. |
| `@tailwindcss/postcss` | latest 4.x | PostCSS plugin for Tailwind 4. |
| `zustand` | **5.0.13** | Client state only (cart UI flags, drawers). |
| `@tanstack/react-query` | **5.100.9** | Server state, caching, mutations. |
| `react-hook-form` | **7.75.0** | Forms. Pair with Zod resolver. |
| `framer-motion` | latest | Subtle motion only. |
| `lucide-react` | latest | Icons (16 / 20 / 24px sizes). |
| `next-themes` | latest | Light/dark with parity from day one. |
| `embla-carousel-react` | latest | Carousels. |

### Backend
| Package | Version | Notes |
|---------|---------|-------|
| `prisma` / `@prisma/client` | **7.8.0** | Schema lives in `/prisma/schema.prisma`. Connection URLs live in `/prisma.config.ts` (Prisma 7 split). |
| `@prisma/adapter-pg` | **7.8.0** | Required driver-adapter. The `PrismaClient` constructor takes `{ adapter: new PrismaPg({ connectionString }) }`. Switch to `@prisma/adapter-neon` later if Vercel cold-start latency demands the HTTP driver. |
| `pg` / `@types/pg` | **^8.20.0** | Backing driver for `@prisma/adapter-pg`. |
| `dotenv` | **^17.x** | Loaded by `prisma.config.ts` to read `DATABASE_URL` / `DIRECT_URL` at migrate time. |
| `next-auth` | **5.0.0-beta.31** | Auth.js v5 (still in beta channel as of bootstrap). |
| `@auth/prisma-adapter` | latest 2.x | Prisma adapter for Auth.js. |
| `zod` | **4.x** (^4.4.x) | Runtime validation on every API input. No exceptions. |
| `bcryptjs` | latest (^3.x) | Password hashing. Ships its own types — do NOT install `@types/bcryptjs`. |
| `jose` | latest | JWT signing/verification. |
| `nanoid` | latest | Order numbers, slugs. |
| `date-fns` | latest | Date math. |
| `sharp` | latest | Image processing on the server. |

### Tooling
| Tool | Choice | Why |
|------|--------|-----|
| Linter + formatter | **Biome** | Single tool replaces ESLint + Prettier. Faster (Rust). Matches the lean Phase-1 ethos. |
| Pre-commit | **Husky + lint-staged** | Run Biome + tsc on staged files. |
| Tests | **Vitest** (unit/component), **Playwright** (E2E) | Per SRS §16. |
| Node | **22 LTS** | Locked via `.nvmrc`. |
| Package manager | **pnpm** | Per SETUP_GUIDE. |

> **If the user installed Biome won't fit a future need (e.g. a missing rule), revisit by adding ESLint *alongside* Biome rather than ripping Biome out. Document any deviation here.**

---

## 3. Non-Negotiable Architectural Rules

These rules are absolute. Violations are bugs.

1. **App Router only.** Never write `pages/` router code. Never `getServerSideProps` or `getStaticProps`. Never reach for `_app.tsx` or `_document.tsx` patterns.
2. **Server Components by default.** Add `'use client'` only when a component genuinely needs interactivity (event handlers, hooks, browser APIs, refs to DOM). Reach for RSC first.
3. **Zod validation on every API input.** Every `route.ts` handler validates `request.json()`, query params, and route params with a Zod schema *before* any business logic. No exceptions.
4. **Razorpay is the ONLY payment gateway.** Never reach for Stripe, PayPal, Adyen, or any other gateway. International expansion is Phase 5+ and out of scope.
5. **No card data ever touches our servers.** Razorpay's hosted iframe handles all card input. PCI DSS scope = SAQ-A.
6. **Webhook signatures verified with HMAC-SHA256 on the *raw* request body.** Never trust unsigned or pre-parsed webhook bodies.
7. **Idempotency on every payment confirmation.** Razorpay `payment_id` stored with a unique constraint to prevent double-processing.
8. **Mobile-first responsive on every component, every page.** Sticky add-to-cart on PDP, bottom nav, drawer filters.
9. **Accessibility (WCAG 2.2 AA) is a hard requirement.** Keyboard nav, visible focus states, ARIA where needed, alt text on every image, semantic HTML, color contrast ≥ 4.5:1, reduced-motion support.
10. **All product images use `next/image`.** Never bare `<img>`. AVIF/WebP via Cloudinary loader, responsive sizes, lazy below the fold.
11. **TypeScript strict mode is non-negotiable.** No `any` without an inline `// justification: ...` comment. No `// @ts-ignore`. Use `// @ts-expect-error` with a reason if absolutely required.
12. **Money is `Decimal(12,2)` in Prisma and integer paise on the wire.** Never floats. Never `number` for money in business logic.
13. **Cart state lives in DB + HTTP-only cookie session id.** Never `localStorage` / `sessionStorage` for cart, auth, or anything sensitive.
14. **Auth uses Auth.js v5 sessions + secure cookies.** Sessions are JWT-rotating; sensitive actions force re-auth.
15. **Conventional Commits.** `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`, `perf:`. Atomic commits — one logical change per commit.
16. **Branch protection.** `main` is production; `develop` is staging; feature branches are `feature/*`, `fix/*`, `chore/*`. PRs only into `develop` and `main`.

---

## 4. Design System Principles

The bar is "big-company clean" — Linear, Vercel's dashboard, Stripe's checkout, Apple's product pages, Croma's polish for India context. Refined, restrained, generous with whitespace, never flashy.

### Palette
- One **neutral** scale: **slate** (default). Extend to `slate-50 → slate-950`.
- One **accent** color (TBD per brand kit — pick a single hue, use 1–2 shades total). No gradients unless intentional.
- Semantic: `success` (emerald-600), `warning` (amber-500), `error` (red-600), `info` (sky-600). Use only for state, never decoration.
- No more than **3 weights** of any color in a single view.

### Typography
- Variable font: **Geist** or **Inter** (preload, `font-display: swap`).
- Tight tracking on headings (`-0.02em`), comfortable body line-height (≥ 1.6).
- Fluid scale: prefer `clamp()`-based sizes for `h1`/`h2`. Body fixed at 15–16px.

### Spacing
- Tailwind 4px base scale strictly. Use `space-y-*` and `gap-*`, not margin stacking.
- Generous whitespace. Pages should breathe. If it feels cramped, it is.

### Motion
- 150–250ms ease-out for most transitions. Never bouncy unless explicitly playful.
- Framer Motion **only** when motion adds clarity (drawer open/close, list reorder, page transitions). Never for decoration.
- Respect `prefers-reduced-motion`.

### Borders + shadows
- Hairline 1px borders: `border-slate-200` (light), `border-slate-800` (dark).
- Shadows soft and sparse: `shadow-sm` for cards, `shadow-md` only for floating UI (popovers, dropdowns). Never stack shadows.
- `rounded-lg` (8px) for cards, `rounded-md` (6px) for inputs/buttons, `rounded-xl` for hero modules.

### Icons
- **Lucide React** only. Sizes: 16 / 20 / 24px. Never mix sizes within one row.
- Stroke width 2 (default). Match neutral text color.

### States — designed, not default
- **Skeletons** for every async UI. Never show empty layout shifts.
- **Empty states**: icon + helpful copy + CTA. Never "No data."
- **Error states**: icon + apologetic copy + recovery action. Never crash to white.
- **Loading**: subtle, never spinning-rectangles-of-shame.
- **Forms**: labels above inputs, helper text below, inline errors with icons, disabled and loading states explicit.
- **Buttons**: clear hierarchy — `primary` (filled accent), `secondary` (outline neutral), `ghost` (text only), `destructive` (filled red). Disabled and loading states.

### When a design choice feels generic or "AI-default"
Stop. Ask: *what would Linear ship? What would Stripe ship?* Then ship that.

---

## 5. Folder Structure (per SRS §5.3)

```
/app
  /(shop)
    /page.tsx                    # Home
    /products/[slug]/page.tsx    # PDP
    /category/[...slug]/page.tsx # PLP (nested categories)
    /search/page.tsx
    /cart/page.tsx
    /checkout/page.tsx
    /checkout/success/page.tsx
  /(auth)
    /login/page.tsx
    /register/page.tsx
    /forgot-password/page.tsx
  /(account)
    /account
      /orders/page.tsx
      /addresses/page.tsx
      /wishlist/page.tsx
      /reviews/page.tsx
      /returns/page.tsx
  /(admin)
    /admin
      /dashboard/page.tsx
      /products/page.tsx
      /orders/page.tsx
      /customers/page.tsx
      /coupons/page.tsx
      /reports/page.tsx
  /api
    /auth/[...nextauth]/route.ts
    /products/route.ts
    /products/[id]/route.ts
    /cart/route.ts
    /checkout/route.ts
    /orders/route.ts
    /webhooks/razorpay/route.ts
    /webhooks/shipping/route.ts
/components
  /ui                            # Shadcn primitives
  /shop                          # Product cards, filters, pdp pieces
  /admin
  /shared
/lib
  /db.ts                         # Prisma client singleton
  /auth.ts                       # NextAuth config
  /redis.ts
  /razorpay.ts
  /cloudinary.ts
  /resend.ts
  /algolia.ts                    # (Phase 2)
  /validators                    # Zod schemas (one file per domain)
  /services                      # Business logic (cart, pricing, orders, ...)
  /utils
/prisma
  /schema.prisma
  /migrations
  /seed.ts
/prisma.config.ts                # Prisma 7 — connection URLs + migrate config
/proxy.ts                        # Next.js 16 renamed `middleware.ts` → `proxy.ts`
/types
/emails                          # React Email templates
/docs
  /SRS.md
```

> Never invent a top-level folder without updating this section.

---

## 6. DO NOT — Deprecated patterns to never use

- ❌ `create-react-app`, Vite, Pages Router, `getServerSideProps`, `getStaticProps`. App Router only.
- ❌ Redux, MobX, Recoil, Jotai, Valtio. Zustand for client state, TanStack Query for server state.
- ❌ CSS-in-JS (`styled-components`, `emotion`, `stitches`, `vanilla-extract`). Tailwind only.
- ❌ Any payment gateway other than Razorpay (no Stripe, no PayPal, no Razorpay-clones).
- ❌ Storing cards, CVVs, or card data anywhere on our infrastructure. Razorpay iframe only.
- ❌ `localStorage` / `sessionStorage` for cart, auth, tokens, or anything sensitive. HTTP-only cookies + DB only.
- ❌ Skipping Zod validation on API inputs.
- ❌ Prisma raw queries with concatenated user input. Use parameterized `$queryRaw` if raw is unavoidable, never string-concat.
- ❌ Floats for money. `Decimal` in Prisma, integer paise on the wire.
- ❌ `any` type without a written `// justification: ...` comment.
- ❌ Bare `<img>` tags. `next/image` always.
- ❌ Committing secrets. Ever. `.env.local` for local, Vercel env vars for deployments.
- ❌ Adding any third-party integration not in SRS §13 without asking the user first.
- ❌ Phase 2/3/4/5 work creeping into Phase 1. Reviews, wishlist, coupons, loyalty are Phase 2. Multi-vendor is Phase 3. Stay focused.
- ❌ `console.log` in production code paths. Use a logger (Sentry breadcrumbs).
- ❌ `dangerouslySetInnerHTML` without sanitizing via DOMPurify.
- ❌ `--no-verify` on commits. If a hook fails, fix the underlying issue.

---

## 7. Working Rules (every session, every file)

1. **Read [CLAUDE.md](./CLAUDE.md), [PROGRESS.md](./PROGRESS.md), and the SRS section relevant to the current sprint** before writing any code each session.
2. **Update [PROGRESS.md](./PROGRESS.md) at the END of every session.** Update the "Last session summary" at the top — what was done, what's next, blockers, decisions.
3. **Never invent libraries, services, or versions** that aren't in the SRS. Ask first.
4. **Razorpay is the ONLY payment gateway.** Never reach for Stripe.
5. **App Router only.** Never write `pages/` router code.
6. **RSC by default.** `'use client'` only when interactivity demands it.
7. **Zod on every API input.** Every handler. No exceptions.
8. **Money: `Decimal` in Prisma, integer paise on the wire.** Never floats.
9. **Mobile-first responsive in every component, always.**
10. **Accessibility WCAG 2.2 AA hard requirement** — keyboard, focus, ARIA, alt text, landmarks.
11. **`next/image` for all product images.** Never bare `<img>`.
12. **TypeScript strict.** No bare `any`.
13. **Atomic Conventional Commits.** One logical change per commit.

### When stuck
- SRS ambiguous → ask the user, don't guess.
- Service account not yet provisioned → stub the integration with `TODO(integration):` markers and continue.
- Sprint too large for one session → split into sub-sprints in PROGRESS.md and continue from where you stopped.

---

## 8. Pointers

- **Spec**: [docs/SRS.md](./docs/SRS.md) — the single source of truth.
- **Sprint tracker**: [PROGRESS.md](./PROGRESS.md) — current state, decisions log.
- **Setup**: [SETUP_GUIDE.md](./SETUP_GUIDE.md) — local → Vercel preview → staging → production topology.

# PENDING.md — Open work-in-progress checklist

> Lightweight tracker for items that are *known incomplete* and intentionally deferred. **Not a substitute for PROGRESS.md** — sprint state and decisions still live there. This file exists so we don't lose track of polish items between sessions. Delete entries when done; delete the whole file when the list is empty.

---

## Sprint 1 — finish the round-trip before merging

The branch `feature/sprint-1-catalog` is pushed and code-complete (12 atomic commits, typecheck + lint + husky pre-commit clean). It is **not** mergeable yet — three classes of work remain:

### A. Verification (blocks `IN_PROGRESS → DONE`)

These can only run after Neon credentials exist locally.

- [ ] Copy `.env.example` → `.env.local`; fill `DATABASE_URL` (pooled) + `DIRECT_URL` (direct) from Neon free tier.
- [ ] `pnpm prisma migrate dev --name init` — first migration against the dev DB.
- [ ] `psql "$DIRECT_URL" -f prisma/migrations/manual/_search.sql` — installs `pg_trgm` + GIN trigram indexes used by `searchProducts` / `searchSuggest`.
- [ ] `pnpm db:seed` — populates 6 categories / 6 brands / 8 products.
- [ ] `pnpm dev` — visual QA on **mobile + desktop** viewports:
  - `/` (Home) — hero, featured categories, trending grid, brands strip
  - `/category` (all-categories index)
  - `/category/smartphones` (PLP — filters, sort, pagination, breadcrumbs)
  - `/products/iphone-15-pro` (PDP — gallery, variant selector, pincode, sticky CTA on mobile, JSON-LD in source)
  - `/search?q=iphone` (search results)
  - `/admin/dashboard`, `/admin/products`, `/admin/categories`, `/admin/brands` (read-only tables)
- [ ] `pnpm build` — production build must succeed end-to-end.
- [ ] Lighthouse mobile (Chrome devtools or `pnpm dlx lighthouse`) on Home / PLP / PDP — Perf ≥ 85, A11y ≥ 95, SEO ≥ 95.
- [ ] Tick the remaining bullets in [PROGRESS.md](./PROGRESS.md) Sprint 1 section, flip status `IN_PROGRESS → DONE`, append a "Sprint 1 — DONE" row to the decisions log if anything new came up during QA.
- [ ] Open the PR: `gh pr create --base develop --head feature/sprint-1-catalog --title "Sprint 1: Catalog (Home, PLP, PDP)"`. Squash-merge after review per the per-sprint workflow at the top of PROGRESS.md.

### B. Sprint 1 polish (still inside Sprint 1's scope, can land before or after PR)

The original Sprint 1 acceptance includes admin CRUD; this session shipped read-only tables only. These can be a follow-on PR into the same `feature/sprint-1-catalog` branch (preferred) or a separate `feature/sprint-1-catalog-admin` task branch.

- [ ] **Admin product create/edit form** — server action + `react-hook-form` + `createProductSchema`/`updateProductSchema` (already in [lib/validators/product.ts](./lib/validators/product.ts)). Variant editor (rows for SKU / MRP / price / stock / attributes), image picker (Cloudinary upload widget), specs editor, category multi-select, brand picker.
- [ ] **Admin category create/edit form** — name, slug (auto-generated via [lib/utils/slug.ts](./lib/utils/slug.ts)), parent picker, position, image, SEO fields. Reuses `createCategorySchema` / `updateCategorySchema`.
- [ ] **Admin brand create/edit form** — name, slug, logo, SEO fields. Reuses `createBrandSchema` / `updateBrandSchema`.
- [ ] **POST/PATCH/DELETE `/api/admin/products`**, **`/api/admin/categories`**, **`/api/admin/brands`** — backed by the same Zod schemas. Auth gate: `proxy.ts` already redirects unauthenticated users away from `/admin`; route handlers should additionally check `session.user.role` is one of `CATALOG_MANAGER` / `SUPER_ADMIN`.
- [ ] **On-demand revalidation** — when admin mutations land, call `revalidateTag('catalog:product')` / `revalidateTag('catalog:category')` / `revalidateTag('catalog:brand')` (tags already declared in [lib/services/catalog.ts](./lib/services/catalog.ts)) so PDPs and PLPs pick up changes without waiting for the ISR window.
- [ ] **`app/sitemap.ts` + `app/robots.ts`** — Sprint 5 also touches these but landing them earlier costs nothing. Sitemap should split into `sitemap-products.xml` + `sitemap-categories.xml`. Robots blocks `/admin`, `/account`, `/checkout`.
- [ ] **Header search suggest** — debounced (~150 ms) client-side fetch to `/api/search?mode=suggest` (route already exists), render under the header search input as a dropdown.
- [ ] **Hero image asset** — Home currently uses a CSS gradient placeholder. Either commission a hero illustration, or use a Cloudinary upload + the existing `cloudinaryUrl()` helper.
- [ ] **Cloudinary creds on Vercel preview** — once a Cloudinary cloud is provisioned, set `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` + the API key/secret in Vercel preview env vars so seeded placeholder URLs resolve.

### C. Operational follow-ups (outside Sprint 1, but worth flagging)

- [ ] MSG91 DLT registration kicked off (≈ 1 week lead time) — blocks Sprint 2 OTP login.
- [ ] Razorpay KYC kicked off (1–3 days) — blocks Sprint 4 checkout.
- [ ] Branch-protection rules on `develop` and `main` (require passing CI + 1 review). CI itself ships in Sprint 5.

---

## Conventions for this file

- One section per sprint or per task; delete sections when fully closed out.
- Each item is a checkbox with a single self-contained sentence — when an item needs more than that, it belongs in a code TODO with a `TODO(sprint-N):` prefix, or in the relevant SRS section.
- Don't move items between PENDING.md and PROGRESS.md mechanically — PROGRESS.md tracks sprint *state*, this file tracks *open polish*.

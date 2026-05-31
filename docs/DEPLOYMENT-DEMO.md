# Free-Tier Demo Deployment Guide

Get the Naman Enterprises demo live on a public URL **with zero ongoing cost**, so you can share a link with a client.

**Total time:** 45–60 minutes for first deploy · 5 minutes for subsequent re-deploys.

**Free-tier stack:**
| Layer | Provider | Free-tier limits |
|---|---|---|
| Hosting + Edge | **Vercel Hobby** | 100 GB bandwidth/mo, 100 GB-hr serverless, unlimited deployments, custom subdomain |
| Postgres | **Neon Free** | 3 GB storage, 1 always-on branch, 10 branches, autosuspend |
| Redis (optional) | **Upstash Redis Free** | 10,000 commands/day, 256 MB |
| Email (optional) | **Resend Free** | 3,000 emails/mo, 100/day |
| Payments | **Razorpay Test Mode** | Unlimited test transactions, no real money |
| Images | **Unsplash + SimpleIcons** | Free CDN, no auth needed |

**Total cost:** ₹0 / $0 per month.

---

## Part 1 — Prerequisites

Before starting, make sure you have:

- A **GitHub account** with the `naman-ent` repo pushed (the project is at `https://github.com/prakash47/naman-ent`)
- A **Google or GitHub account** for signing into Vercel + Neon
- A **payment-free Razorpay account** (test mode only) if you want to demo the payment modal — sign up at [dashboard.razorpay.com](https://dashboard.razorpay.com/signup), no KYC needed for test mode

You do **not** need:
- Domain name (Vercel gives you `*.vercel.app` free)
- Credit card
- Production Razorpay KYC
- Shiprocket / Resend / Cloudinary (optional, demo works without)

---

## Part 2 — Set up Neon Postgres (10 min)

1. **Sign up** at [neon.tech](https://neon.tech) — pick "Continue with GitHub"
2. **Create project:**
   - Name: `naman-ent-demo`
   - Region: `Asia Pacific (Singapore)` for low India latency
   - Postgres version: `16` (matches our docker-compose)
3. **On the project dashboard**, you'll see two connection strings:
   - **Pooled connection** (for app runtime) → use as `DATABASE_URL`
   - **Direct connection** (for migrations) → use as `DIRECT_URL`

   Both look like `postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`. Copy both to a scratch pad.

4. **Install pg_trgm extension** (needed for our search):
   - Click "SQL Editor" in the Neon sidebar
   - Paste + run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   ```

5. **Run migrations + seed locally pointing at Neon:**
   ```bash
   # Temporarily switch your .env.local to Neon URLs
   DATABASE_URL="postgresql://...pooled..."
   DIRECT_URL="postgresql://...direct..."

   pnpm prisma migrate deploy        # applies the 1 existing migration
   pnpm db:seed                      # seeds 18 cats + 18 brands + 65 products
   pnpm tsx scripts/create-test-user.ts   # optional: pre-seed demo users
   ```
   Output should read `Seeded 18 categories, 18 brands, 65 products`.

6. **Restore your local `.env.local` to localhost** if you also want to keep dev working locally. Vercel will use the Neon URLs via its own env vars.

---

## Part 3 — Razorpay test keys (5 min, optional but recommended for demo)

Razorpay's test mode is free, no KYC, no real money. You can show the full payment modal end-to-end with test cards.

1. Sign up at [dashboard.razorpay.com/signup](https://dashboard.razorpay.com/signup) — only email + phone needed
2. After login, **switch the toggle at top-left to "Test Mode"** (orange badge)
3. Go to **Settings → API Keys → Generate Test Key**
4. Copy both **Key ID** (`rzp_test_xxx`) and **Key Secret**
5. Go to **Settings → Webhooks → Add New Webhook**:
   - URL: `https://<your-vercel-url>/api/webhooks/razorpay` (fill after Vercel deploy)
   - Events: tick `payment.captured`, `payment.failed`, `order.paid`, `refund.created`, `refund.processed`
   - Secret: generate a random 32-char string, save as `RAZORPAY_WEBHOOK_SECRET`

**Test cards** (use during demo):
| Card | CVV | Expiry | OTP | Result |
|---|---|---|---|---|
| `4111 1111 1111 1111` | 123 | Any future | 1234 | Success |
| `4012 0010 3838 4014` | 123 | Any future | – | Failure |

---

## Part 4 — Set up Resend (5 min, optional)

Without Resend, all transactional emails (welcome, order placed, etc.) log to server stdout instead of sending. For a demo this is fine — the order placement still succeeds. But if you want emails actually delivered:

1. Sign up at [resend.com](https://resend.com) with GitHub
2. **Domain setup:**
   - For a quick demo: skip domain verification, use the default `onboarding@resend.dev` sender (works for testing, limited to 100/day)
   - For real demo to client: add a domain + verify SPF/DKIM (Resend dashboard walks you through)
3. **API Keys → Create API Key**, name it `naman-ent-demo`, copy the key

You'll add `RESEND_API_KEY` to Vercel later. Without this, emails just log — not a blocker.

---

## Part 5 — Set up Upstash Redis (5 min, optional)

Without Redis, rate limiting + account lockout silently degrade (permissive no-op). For a demo, skip unless you need to show those features. To set up:

1. Sign up at [console.upstash.com](https://console.upstash.com) with GitHub
2. **Create Redis database:**
   - Name: `naman-ent-demo`
   - Type: `Regional`
   - Region: Closest to your Vercel region (e.g., `ap-south-1` Mumbai for Singapore Vercel)
   - TLS: Enabled
3. **Click your DB → "REST API" tab**
4. Copy `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`

---

## Part 6 — Deploy to Vercel (10 min)

1. **Sign up** at [vercel.com](https://vercel.com) — pick "Continue with GitHub"
2. **Import project:**
   - Click "Add New... → Project"
   - Select your `naman-ent` GitHub repo (authorize Vercel to read it)
   - Vercel auto-detects Next.js
3. **Configure project:**
   - **Framework Preset:** Next.js
   - **Root Directory:** `./` (default)
   - **Build Command:** `pnpm build` (default, picks up from package.json)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `pnpm install --frozen-lockfile`
   - **Node.js Version:** `22.x`

4. **Environment Variables** (click "Environment Variables" before deploying):

   **Required:**
   ```
   DATABASE_URL              = postgresql://...neon-pooled...
   DIRECT_URL                = postgresql://...neon-direct...
   AUTH_SECRET               = <generate via `openssl rand -base64 32`>
   NEXTAUTH_SECRET           = <same as AUTH_SECRET — Auth.js v5 reads both>
   NEXT_PUBLIC_APP_URL       = https://<your-vercel-url>.vercel.app
   NEXT_PUBLIC_STORE_NAME    = Naman Enterprises
   ```

   **Optional (skip for minimal demo):**
   ```
   # Razorpay test mode
   RAZORPAY_KEY_ID           = rzp_test_xxx
   RAZORPAY_KEY_SECRET       = xxx
   NEXT_PUBLIC_RAZORPAY_KEY_ID = rzp_test_xxx   # exposed to client iframe
   RAZORPAY_WEBHOOK_SECRET   = <your 32-char string>

   # Resend
   RESEND_API_KEY            = re_xxx
   RESEND_FROM_EMAIL         = onboarding@resend.dev   # or your verified sender

   # Upstash Redis
   UPSTASH_REDIS_REST_URL    = https://....upstash.io
   UPSTASH_REDIS_REST_TOKEN  = xxx

   # Compliance / contact (otherwise legal pages show "[TODO: register]")
   STORE_LEGAL_NAME          = Naman Enterprises Pvt Ltd
   STORE_REGISTERED_ADDRESS  = ...
   STORE_GSTIN               = 27ABCDE1234F1Z5
   SUPPORT_EMAIL             = support@your-domain.com
   SUPPORT_PHONE             = +91 98765 43210
   GRIEVANCE_OFFICER_NAME    = Your Name
   GRIEVANCE_OFFICER_EMAIL   = grievance@your-domain.com
   GRIEVANCE_OFFICER_DESIGNATION = Grievance Officer
   ```

   **For each var:** tick "Production", "Preview", and "Development" checkboxes so it applies to every env.

5. **Click "Deploy"** — first build takes ~3-5 minutes.

6. **Once green:**
   - Vercel gives you a URL like `https://naman-ent-xxx.vercel.app`
   - Click it — Home page should load with the full catalog

---

## Part 7 — Post-deploy steps (5 min)

### 7.1 Update Razorpay webhook URL

If you set up Razorpay (Part 3), go back and update the webhook URL with the real Vercel URL:
- `https://<your-vercel-url>.vercel.app/api/webhooks/razorpay`

### 7.2 Verify Vercel URL in env

```
NEXT_PUBLIC_APP_URL = https://<exact-vercel-url>.vercel.app
```
This is used in OpenGraph tags, JSON-LD canonical URLs, sitemap.xml, and email links. If wrong, social shares + SEO break.

After updating, **redeploy** to pick up the new var:
- Vercel dashboard → Deployments → click `...` on latest → "Redeploy"

### 7.3 Smoke test live URL

Run the smoke test from [MANUAL-TESTING.md §2](./MANUAL-TESTING.md#2-smoke-test) against the Vercel URL instead of localhost.

### 7.4 Pre-seed demo content

Vercel doesn't auto-run the seed. Re-run it locally pointing at Neon if you ever wipe/rebuild:
```bash
DATABASE_URL=postgresql://... pnpm db:seed
DATABASE_URL=postgresql://... pnpm tsx scripts/create-test-user.ts
```

---

## Part 8 — Share with client

Your demo is at `https://<your-vercel-url>.vercel.app`.

**Demo credentials to share (or pre-load before screen-share):**
```
Customer test user:
  Email:    test@naman.dev
  Password: TestUser2026!

Admin user:
  Email:    admin@naman.dev
  Password: AdminUser2026!

Razorpay test card (for payment modal demo):
  Card:    4111 1111 1111 1111
  CVV:     123
  Expiry:  any future date (12/30)
  OTP:     1234
```

**Sample demo URL paths:**
- Home: `/`
- Category: `/category/ink-cartridges`
- Product: `/products/hp-67-black-original`
- Search: `/search?q=hp`
- Cart: `/cart`
- Sign in: `/login`
- Account: `/account` (after login)
- Admin: `/admin/dashboard` (after admin login)
- Order detail: `/account/orders/NMN20260516-HE7V9H` (after test order placed)

---

## Part 9 — Common issues + fixes

### "Build failed: prisma generate" on Vercel
Vercel runs `prisma generate` via the `postinstall` hook in package.json. If it fails, check:
- `DATABASE_URL` is set in Vercel env vars (not just `.env.local`)
- Postgres driver: we use `@prisma/adapter-pg` — make sure `pg` is in dependencies, not devDependencies

### "Page not found" on /admin
Sign in as admin first (`admin@naman.dev`). Customer accounts redirect away from admin routes.

### Cart icon shows wrong count
Hard reload (`Ctrl+Shift+R`) — Next.js may be serving stale RSC cache.

### "Online payments not configured"
You haven't set the four `RAZORPAY_*` env vars. Either set them (Part 3) or just use COD path — both demo well.

### Emails not sending
Check `RESEND_API_KEY` is set. Without it, look at Vercel function logs — you'll see `[email:dev] →` log entries with the email content.

### Database connection timeouts
Neon free tier autosuspends inactive databases. First request after idle takes ~3 seconds (cold start). Subsequent requests are fast.

### Vercel build timeout
Free tier has 45-min build limit. If you hit it, check `pnpm install` cache + your Next.js bundle size.

### Lost the Vercel URL
Vercel dashboard → Project → Settings → Domains. Or check the deployments list.

---

## Part 10 — Going beyond demo (when you're ready)

This guide gets you a **demo-quality** deploy. For production-quality you'll also need:

| Need | Where |
|---|---|
| Custom domain | Vercel → Settings → Domains → add your `printerstore.com` |
| Production Razorpay (real money) | Complete Razorpay KYC (1-3 days), swap test keys for live keys |
| Production email sender | Verify your domain on Resend, swap `from` to `noreply@yourdomain.com` |
| Real shipping | Provision Shiprocket sandbox → live, fill `SHIPROCKET_*` env vars |
| CI / autodeploy on push | Already automatic via Vercel ↔ GitHub. Add GitHub Actions for typecheck + lint per Sprint 5D |
| Error tracking | Sentry (free tier 5K events/mo) — Sprint 5D |
| Analytics | PostHog or Vercel Analytics (free tier) — Sprint 5D |
| Better DB tier | Neon paid plan from $19/mo when you exceed 3 GB |
| Faster Vercel | Pro plan $20/user/mo when you need more bandwidth or analytics |

For now, the free tier gives you **a real, shareable URL** for client demos with the full catalog browsing, cart, checkout (COD + Razorpay test), account management, and admin all working.

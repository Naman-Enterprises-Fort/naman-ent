# Setup Guide — Local Dev → Vercel Staging → Production

This guide takes you from "empty laptop" to "live store on a real domain." Follow it once for setup, then your day-to-day workflow is just `git push` and Vercel handles the rest.

---

## Part 1 — Prerequisites (One-Time)

### Tools to install on your machine

| Tool | Why | How |
|------|-----|-----|
| **Node.js 22 LTS** | Runtime for Next.js 16 | Install via [nvm](https://github.com/nvm-sh/nvm): `nvm install 22 && nvm use 22` |
| **pnpm** | Faster, disk-efficient package manager | `npm install -g pnpm` |
| **Git** | Source control | Pre-installed on macOS/Linux; for Windows: [git-scm.com](https://git-scm.com) |
| **GitHub CLI** (optional but recommended) | Easy repo creation, PR management | `brew install gh` (macOS) or [cli.github.com](https://cli.github.com) |
| **Claude Code** | The AI pair-programmer | Follow the install instructions at [claude.com/claude-code](https://claude.com/claude-code) |
| **VS Code** (recommended) | Editor with great Next.js + Prisma support | [code.visualstudio.com](https://code.visualstudio.com) |
| **VS Code extensions** | Tailwind IntelliSense, Prisma, Biome/ESLint, Error Lens | Install from VS Code marketplace |

Check each is installed:
```bash
node --version    # should print v22.x.x
pnpm --version
git --version
gh --version      # optional
```

---

## Part 2 — Account Setup (One-Time, ~30 minutes)

You'll need accounts on these services. All start on free tiers.

### 1. GitHub
- Sign up at [github.com](https://github.com) if you don't have an account.
- Create an empty repository for the project (private). Don't initialize with README — Claude Code will create everything.
- Note the SSH or HTTPS clone URL.

### 2. Vercel
- Sign up at [vercel.com](https://vercel.com) using your GitHub account (so they're linked).
- For Phase 1, **upgrade to the Pro plan** ($20/month). The free Hobby plan is not allowed for commercial use — see the SRS Appendix D for the reasoning.
- Don't create a project yet. We'll do that after the first push.

### 3. Neon (Postgres)
- Sign up at [neon.tech](https://neon.tech).
- Create a new project. Region: pick the one closest to your Vercel region (for India: AWS Asia Pacific Singapore or Mumbai).
- Neon gives you two database branches by default: `main` and `dev`. We'll use:
  - **`main` branch** = production database
  - **`dev` branch** = local development database (or create a new one called `local`)
  - **`staging` branch** = create one called `staging` for the Vercel staging environment
- For each branch, copy the **connection string** (it looks like `postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require`). You'll need three: local, staging, production.

### 4. Razorpay
- Sign up at [razorpay.com](https://razorpay.com). KYC takes 1–3 days; start this immediately.
- Once approved, go to **Dashboard → Settings → API Keys**.
- Generate **Test Mode** keys first: `Key ID` and `Key Secret`. Use these for local + staging.
- Once you're ready for real transactions, generate **Live Mode** keys for production. Keep them tightly secured.
- Set up the webhook in **Dashboard → Settings → Webhooks**: URL `https://your-staging-domain.vercel.app/api/webhooks/razorpay` (you'll add the production webhook later). Generate a webhook secret and save it.
- Subscribe to webhook events: `payment.captured`, `payment.failed`, `payment.authorized`, `order.paid`, `refund.created`, `refund.processed`, `refund.failed`.

### 5. Resend (Email)
- Sign up at [resend.com](https://resend.com).
- Add and verify your sending domain (e.g., `mail.yourstore.com`). DNS records (SPF, DKIM) take ~30 min to propagate.
- Generate an API key. Save it.
- Free tier: 3,000 emails/month, 100/day. Plenty for Phase 1.

### 6. Cloudinary (Media)
- Sign up at [cloudinary.com](https://cloudinary.com).
- From your dashboard, copy: **Cloud Name**, **API Key**, **API Secret**.
- Free tier: 25 credits/month (~25GB storage + 25GB bandwidth).

### 7. MSG91 (SMS / WhatsApp — India)
- Sign up at [msg91.com](https://msg91.com).
- Complete DLT registration (Indian regulatory requirement, takes ~1 week — start early).
- Once approved, get your **Auth Key** and create a Sender ID and an OTP template.
- Free testing credits available; production usage is ~₹0.20 per SMS.

### 8. Upstash Redis (Optional in Phase 1)
- Sign up at [upstash.com](https://upstash.com).
- Create a Redis database. Region close to Vercel.
- Copy the REST URL and REST Token.
- Free tier: 10K commands/day, 256 MB.

### 9. Sentry (Error Tracking)
- Sign up at [sentry.io](https://sentry.io).
- Create a new project: platform Next.js.
- Copy the DSN. Save it.

### 10. PostHog (Product Analytics)
- Sign up at [posthog.com](https://posthog.com), choose Cloud (US or EU).
- Copy the Project API Key.

### 11. Cloudflare (DNS + Turnstile)
- Sign up at [cloudflare.com](https://cloudflare.com).
- Add your domain to Cloudflare (point your registrar's nameservers at Cloudflare). This gives you free DNS, free CDN passthrough, free DDoS protection.
- Go to **Turnstile** in the dashboard, add a site, get the **Site Key** and **Secret Key**. Use this for bot protection on signup/login/checkout.

### 12. Domain Registrar
- Buy a domain. Recommended: **Cloudflare Registrar** (at-cost pricing, no markup) or **Namecheap**.
- A `.com` is ~₹800–1,000/year. A `.in` is ~₹600–800/year.

You don't need all of these working on day 1 of Claude Code — Razorpay KYC and MSG91 DLT take time. Start them now in parallel. Claude Code can stub the integrations and wire them up properly once your accounts are live.

---

## Part 3 — Initial Project Setup

### Step 1: Clone the empty repo

```bash
mkdir -p ~/projects
cd ~/projects
git clone git@github.com:<your-username>/<repo-name>.git electronics-store
cd electronics-store
```

### Step 2: Place the prep files

Copy these three files into the project root:
- `SRS.md` (the full SRS document — rename from `SRS-Electronics-Ecommerce-NextJS.md`)
- `MASTER_PROMPT.md` (the master prompt I gave you)
- `SETUP_GUIDE.md` (this file)

### Step 3: Open Claude Code

```bash
claude
```

### Step 4: Paste the bootstrap prompt

From `MASTER_PROMPT.md`, copy the big code block under **"BOOTSTRAP PROMPT — PASTE THIS INTO CLAUDE CODE"** and paste it into the Claude Code prompt. Hit enter.

Claude Code will now:
1. Read the SRS
2. Create `CLAUDE.md` and `PROGRESS.md` in the project root
3. Run `pnpm init`, install all dependencies at the locked versions, set up Tailwind, Shadcn, Prisma, Auth.js, and the folder structure
4. Move `SRS.md` into `/docs/`
5. Create `.env.example`
6. Verify the toolchain with `pnpm typecheck`, `pnpm lint`, `pnpm dev`
7. Stop and ask you to review

This first session typically takes 20–40 minutes depending on network speed.

### Step 5: Set up `.env.local`

Claude Code creates `.env.example` (with variable names but no values). Now copy it and fill in your real values:

```bash
cp .env.example .env.local
```

Edit `.env.local` with values from your account setup:

```bash
# === Database (Neon) ===
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/local?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-xxx.neon.tech/local?sslmode=require"

# === Auth.js ===
AUTH_SECRET="run: openssl rand -base64 32"
AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# === Razorpay (Test mode keys for local) ===
RAZORPAY_KEY_ID="rzp_test_xxxxxxxxx"
RAZORPAY_KEY_SECRET="..."
RAZORPAY_WEBHOOK_SECRET="..."
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_xxxxxxxxx"

# === Resend ===
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="orders@mail.yourstore.com"

# === Cloudinary ===
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="..."

# === MSG91 ===
MSG91_AUTH_KEY="..."
MSG91_SENDER_ID="..."
MSG91_OTP_TEMPLATE_ID="..."

# === Upstash Redis (optional in Phase 1) ===
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="..."

# === Sentry ===
SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx"
NEXT_PUBLIC_SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx"

# === PostHog ===
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"

# === Cloudflare Turnstile ===
NEXT_PUBLIC_TURNSTILE_SITE_KEY="..."
TURNSTILE_SECRET_KEY="..."

# === Shiprocket (set up after Phase 1 starts) ===
SHIPROCKET_EMAIL="..."
SHIPROCKET_PASSWORD="..."

# === App ===
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_STORE_NAME="Your Store Name"
```

### Step 6: Run database migrations

```bash
pnpm prisma migrate dev --name init
pnpm prisma db seed   # if Claude Code created a seed script
```

### Step 7: Start the dev server

```bash
pnpm dev
```

Open [localhost:3000](http://localhost:3000). You should see the bootstrap home page.

---

## Part 4 — Day-to-Day Local Development

### Standard daily workflow

```bash
# Start your day
git pull origin develop
pnpm install        # in case dependencies changed
pnpm prisma migrate dev   # apply any new migrations
pnpm dev

# Open Claude Code in another terminal
claude

# Tell Claude Code: "Continue from PROGRESS.md"
# Or: "Resume Sprint 3 — Cart"
```

### Useful commands

```bash
# Type-check
pnpm typecheck

# Lint
pnpm lint
pnpm lint:fix

# Format
pnpm format

# Run tests
pnpm test
pnpm test:watch
pnpm test:e2e

# Production build (catch issues before pushing)
pnpm build

# Prisma
pnpm prisma studio              # GUI for your DB
pnpm prisma migrate dev --name <name>
pnpm prisma migrate reset       # nuke + reseed local DB (careful)
pnpm prisma generate            # regenerate client after schema change
```

### Testing Razorpay locally

Razorpay webhooks need a public URL. For local testing, use **ngrok**:

```bash
brew install ngrok      # or download from ngrok.com
ngrok http 3000
```

You'll get a URL like `https://abcd-1234.ngrok-free.app`. In Razorpay Dashboard → Webhooks, temporarily add this URL pointing to `/api/webhooks/razorpay`. Switch back to your real staging URL when done testing.

---

## Part 5 — Vercel Deployment (Staging + Production)

### One-time Vercel project setup

#### Step 1: Connect GitHub repo to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Framework preset: Next.js (auto-detected)
4. Root directory: `./`
5. Build command: `pnpm build` (default)
6. **Don't deploy yet** — we need to configure environments first
7. Click "Deploy" but expect the first build to fail (env vars not set yet); we'll fix in next steps

#### Step 2: Set up branch deployment strategy

Vercel by default deploys:
- **Production:** `main` branch → `yourstore.com`
- **Preview:** every other branch → `<branch>-<project>.vercel.app` (auto preview URL per PR)

We want a third tier — staging — which uses the `develop` branch with its own database and environment variables.

In Vercel dashboard → Settings → Git:
- Set **Production branch** to `main`
- Preview deployments will automatically be created for all other branches

In your repo, set up branch protection:
```bash
# Locally
git checkout -b develop
git push -u origin develop

# In GitHub: Settings → Branches → Branch protection rules
# Protect `main`: require PR, require status checks, require approval
# Protect `develop`: require PR, require status checks
```

#### Step 3: Configure environment variables in Vercel

Go to **Vercel project → Settings → Environment Variables**. For each variable from your `.env.local`, add it three times (or use the Environment selector to pick which it applies to):

| Variable | Production | Preview | Development |
|----------|-----------|---------|-------------|
| `DATABASE_URL` | Neon `main` branch URL | Neon `staging` branch URL | (not used; local uses .env.local) |
| `RAZORPAY_KEY_ID` | Live key | Test key | (local uses .env.local) |
| `RAZORPAY_KEY_SECRET` | Live secret | Test secret | (local uses .env.local) |
| `AUTH_URL` | `https://yourstore.com` | `https://staging-yourstore.vercel.app` | (local uses .env.local) |
| `NEXT_PUBLIC_APP_URL` | `https://yourstore.com` | `https://staging-yourstore.vercel.app` | (local uses .env.local) |
| ... and so on for every other variable | | | |

**Important:** For staging/preview, use Razorpay **test mode** keys. For production, use **live mode** keys. Mixing these up is one of the most common (and most expensive) mistakes.

You can use Vercel's `vercel env pull` command to sync these into your `.env.local` if you want to mirror staging values locally — but be careful, you don't want to accidentally hit live data.

#### Step 4: First deploy

```bash
git checkout develop
git push origin develop
```

Vercel auto-builds and deploys. Watch the Vercel dashboard. Should succeed in ~2–4 minutes.

Visit the preview URL Vercel gives you — that's your staging environment.

#### Step 5: Run migrations on staging DB

Vercel doesn't run Prisma migrations automatically. Run them from your machine pointed at the staging DB:

```bash
DATABASE_URL="<neon-staging-branch-url>" pnpm prisma migrate deploy
```

Or — better — add this to your `package.json` build script so Vercel runs it on every deploy:

```json
{
  "scripts": {
    "build": "prisma migrate deploy && prisma generate && next build"
  }
}
```

Now every staging/production deploy automatically applies pending migrations before building. Make sure your migrations are backward-compatible.

### Going to production

Once staging is stable and you've manually tested the critical flows:

```bash
# From develop, open a PR to main
gh pr create --base main --head develop --title "Release: <version> — <summary>"

# Review the PR, get approvals, merge it
# Vercel auto-deploys main to production
```

Don't forget:
1. Add your production domain in Vercel → Settings → Domains
2. Update DNS at Cloudflare to point at Vercel (Vercel gives you the exact CNAME values)
3. Wait for SSL provisioning (~60 seconds, automatic)
4. Update Razorpay webhook URL to production: `https://yourstore.com/api/webhooks/razorpay`
5. Update `AUTH_URL` and OAuth redirect URIs in Google Cloud Console to match your production domain
6. Switch Razorpay to **Live mode** in your Vercel production env vars
7. Test a real ₹1 transaction to verify end-to-end before announcing the launch

---

## Part 6 — Ongoing Operations

### Monitoring you should check daily (or set up alerts for)

- **Vercel Analytics** — Core Web Vitals, traffic, function errors
- **Sentry** — error rate, new error types
- **Razorpay Dashboard** — failed payments, refunds, settlement status
- **PostHog** — funnel drop-off, session replays of error sessions
- **Neon Dashboard** — DB size, slow queries
- **Resend Dashboard** — email delivery rate, bounce rate

### Backup strategy

- **Neon:** Point-in-time recovery is automatic on free tier (7 days retention). Upgrade to Launch tier ($19/mo) when you cross 0.4 GB DB size or want longer retention.
- **Cloudinary:** Built-in redundancy. No action needed.
- **Code:** GitHub is your backup. Make sure your local clone isn't your only copy.

### Scaling triggers

Your CLAUDE.md and SRS Appendix D list these. The short version: don't preemptively upgrade anything. Watch the dashboards, upgrade when an actual metric crosses a threshold.

---

## Part 7 — Common Issues & Fixes

### "Module not found" after `pnpm install`
```bash
rm -rf node_modules .next
pnpm install
pnpm dev
```

### Prisma client out of sync
```bash
pnpm prisma generate
pnpm dev
```

### Vercel build fails with "DATABASE_URL not found"
Environment variable missing or scoped to wrong environment. Check Vercel → Settings → Environment Variables, confirm the variable exists for the environment that's building (Production/Preview).

### Razorpay webhook signature verification fails
- Make sure you're using the **raw request body** (not parsed JSON) for HMAC.
- Confirm the webhook secret in Razorpay Dashboard matches `RAZORPAY_WEBHOOK_SECRET` in env.
- Check the webhook URL is exactly correct (no trailing slash, https not http).

### "Hydration mismatch" error
- Usually caused by a Client Component rendering different content on server vs client (often dates, random IDs, or `window` access in render).
- Fix: move dynamic content into `useEffect`, or use `dynamic(() => ..., { ssr: false })`.

### Neon connection limits hit
Free tier autoscales but has limits. If you see connection errors:
- Use Prisma connection pooling: in your `DATABASE_URL`, use the **pooled** connection string (Neon gives you both).
- Or upgrade to Launch tier ($19/mo) for higher limits.

---

## Part 8 — Pre-Launch Checklist

Before you flip the switch and announce, verify each:

- [ ] Razorpay live mode keys in production env vars
- [ ] Razorpay live webhook URL configured and verified (test webhook from dashboard)
- [ ] Real ₹1 test transaction processes end-to-end (capture, refund)
- [ ] All transactional emails arrive correctly: order confirmation, OTP, password reset
- [ ] Order confirmation SMS works via MSG91
- [ ] Privacy Policy, Terms, Return Policy, Shipping Policy, Cancellation Policy pages all present and linked from footer
- [ ] Contact page has grievance officer details (mandatory under India CP Rules)
- [ ] GST number on every product, country of origin visible
- [ ] Sitemap submitted to Google Search Console
- [ ] Domain SSL active (https green padlock)
- [ ] Cloudflare proxy enabled (orange cloud)
- [ ] Sentry receiving events (intentionally trigger one to verify)
- [ ] Lighthouse scores: Performance ≥ 85 mobile, Accessibility ≥ 95, SEO ≥ 95 on PDP and PLP
- [ ] OG images and meta tags render correctly on Facebook/Twitter/WhatsApp shares (test with [opengraph.xyz](https://www.opengraph.xyz))
- [ ] Robots.txt blocks /admin, /account, /checkout
- [ ] At least 30 real products with images, full specs, and inventory loaded
- [ ] At least 1 product per visible category (no empty categories in nav)
- [ ] Pincode serviceability check works for major Indian metros
- [ ] Cart/checkout works on mobile Chrome and mobile Safari (real device test)
- [ ] Backup verified — restore a recent Neon snapshot to a test branch successfully

---

## Quick Reference Card

| Task | Command |
|------|---------|
| Start dev server | `pnpm dev` |
| Type-check | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Run tests | `pnpm test` |
| Production build | `pnpm build` |
| Open Prisma Studio | `pnpm prisma studio` |
| New migration | `pnpm prisma migrate dev --name <name>` |
| Apply migrations | `pnpm prisma migrate deploy` |
| Start Claude Code | `claude` |
| Deploy to staging | `git push origin develop` |
| Deploy to prod | merge PR `develop → main` |
| Tail Vercel logs | `vercel logs --follow` |
| Public URL for webhooks (local) | `ngrok http 3000` |

---

You're ready. Open the project, paste the bootstrap prompt, and let Claude Code build the foundation. Come back here whenever a deployment or environment question comes up.

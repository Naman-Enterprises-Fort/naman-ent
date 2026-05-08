# Master Prompt for Claude Code — Electronics E-Commerce Build

**Use this prompt to start your Claude Code project.** It bootstraps the project, creates the persistent memory files that Claude Code re-reads every session, and lays down the rules that govern every line of code written for this project.

---

## How to Use This File

### Step 1 — Prepare the project folder
Create an empty folder on your machine and place these three files at its root:
1. `SRS.md` — the SRS document I gave you earlier (rename `SRS-Electronics-Ecommerce-NextJS.md` to `SRS.md`)
2. `MASTER_PROMPT.md` — this file
3. `SETUP_GUIDE.md` — the setup guide

### Step 2 — Open the folder in Claude Code
```bash
cd path/to/your/project-folder
claude
```

### Step 3 — Paste the bootstrap prompt below
The big code block that says **"BOOTSTRAP PROMPT — PASTE THIS INTO CLAUDE CODE"** below is what you paste into Claude Code on your first session. It tells Claude Code to read the SRS, create a `CLAUDE.md` persistent memory file, and start building.

### Step 4 — Every later session, just say "continue"
Once `CLAUDE.md` and `PROGRESS.md` exist in the project root, Claude Code reads them automatically at the start of every new session. You don't need to re-paste the master prompt. Just open the project and say something like *"Continue from the last sprint"* or *"Resume Sprint 2 — Cart & Checkout."* Claude Code will pick up where it left off because the project memory is on disk, not in conversation history.

---

## Why This Approach Works (Context That Survives Forever)

Claude Code automatically reads `CLAUDE.md` from the project root at the start of every session. That file is your project's long-term memory. The master prompt below instructs Claude Code to:

1. Read the SRS document fully on first run
2. Create `CLAUDE.md` with all project rules, tech-stack pins, design principles, and architectural decisions baked in
3. Create `PROGRESS.md` to track which sprint you're on and what's done/in-progress/blocked
4. Update `PROGRESS.md` at the end of every working session

This means even if you close your laptop for two weeks and come back, Claude Code re-reads these files and resumes with full context. The "not forgetting" you asked for is a structural property of the file system, not a hope.

---

## BOOTSTRAP PROMPT — PASTE THIS INTO CLAUDE CODE

> Copy everything between the two `=====` lines below into Claude Code on your **first session only**. After that, the on-disk memory files take over.

```
================================================================================
PROJECT BOOTSTRAP — ELECTRONICS E-COMMERCE PLATFORM
================================================================================

You are the lead full-stack engineer on a production e-commerce build for
Indian electronics retail. The complete specification is in SRS.md at the
project root. Read it fully before writing any code.

This is a multi-month build that will span many sessions. Your absolute first
priority is establishing persistent project memory so context survives across
sessions, machine restarts, and weeks of gaps.

== YOUR FIRST SESSION TASKS (in this exact order) ==

1. Read SRS.md cover to cover. Take your time. The SRS is the single source
   of truth — when in doubt, the SRS wins over your prior assumptions.

2. Read SETUP_GUIDE.md so you understand the deployment topology
   (local → Vercel preview → Vercel staging → Vercel production).

3. Create CLAUDE.md at the project root. This file is your project's
   permanent memory. It must contain:

   - The project mission in 3 sentences
   - The locked tech stack with EXACT version pins from SRS section 4
     (Next.js 16.2.6, React 19.2.6, TypeScript 6.0.3, Tailwind 4.2.4,
      Zustand 5.0.13, TanStack Query 5.100.9, React Hook Form 7.75.0,
      Prisma 7.8.0, Auth.js 5.x, Zod 4.x)
   - The non-negotiable architectural rules (App Router only, RSC by default,
     Zod validation on every API input, Razorpay-only for payments, no Stripe,
     mobile-first, etc.)
   - The design system principles (clean Apple/Linear/Vercel/Stripe-tier UI,
     not flashy, generous whitespace, restrained color palette, refined motion)
   - The folder structure from SRS section 5.3
   - The "DO NOT" list (deprecated patterns to never use)
   - A pointer to SRS.md and PROGRESS.md
   - The instruction that future sessions must read CLAUDE.md, PROGRESS.md,
     and the relevant SRS section before writing any code

4. Create PROGRESS.md at the project root. This is the sprint tracker. It must
   contain:

   - The phase 1 sprint breakdown from SRS section 14
   - For each sprint: status (NOT_STARTED / IN_PROGRESS / DONE / BLOCKED),
     a checklist of acceptance criteria, and notes
   - A "Last session summary" section at the top that you update at the end
     of every working session with: what was done, what's next, any blockers,
     any decisions made that aren't in CLAUDE.md yet
   - A "Decisions log" section at the bottom for architectural choices made
     during the build (with date, decision, reason)

5. Initialize the project foundation:

   - npm/pnpm init with the locked versions from CLAUDE.md
   - Install Next.js 16.2.6, React 19.2.6, TypeScript 6.0.3 with strict mode
   - Set up Tailwind CSS 4.2.4
   - Set up Shadcn/UI (initialize with the New York style and a neutral base
     color — slate or zinc)
   - Set up Prisma 7.8.0 with the schema from SRS section 7
   - Set up Auth.js 5 (NextAuth) with email/password + Google OAuth
   - Configure Biome OR ESLint + Prettier (your call — pick one and document it)
   - Set up Husky + lint-staged for pre-commit hooks
   - Create the folder structure exactly as SRS section 5.3 specifies
   - Add a .nvmrc with the Node version you're targeting (Node 22 LTS)
   - Add .env.example with every variable name needed (no values)
   - Set up a /docs folder and move SRS.md there

6. Confirm the bootstrap by running:
   - `pnpm typecheck` (or `npm run typecheck`) — must pass
   - `pnpm lint` — must pass
   - `pnpm dev` — must start cleanly on localhost:3000
   - `npx prisma validate` — schema must be valid

7. End the session by updating PROGRESS.md with what was completed and what's
   next (Sprint 1 — Catalog). Then stop and ask me to review.

== WORKING RULES (apply to every session, every file) ==

- Read CLAUDE.md, PROGRESS.md, and the SRS section relevant to the current
  sprint before writing any code each session.
- Update PROGRESS.md at the END of every session — don't forget this.
- Never invent libraries, services, or versions that aren't in the SRS.
  If something is missing, ask me before adding it.
- Razorpay is the ONLY payment gateway. Never reach for Stripe.
- App Router only. Never write pages/ router code.
- Server Components by default. Use 'use client' ONLY when interactivity
  truly needs it (forms, hooks, browser APIs, event handlers).
- Every API route handler MUST validate inputs with Zod. No exceptions.
- Every money value uses Decimal in Prisma and number-as-paise on the wire.
  Never use floats for money.
- Mobile-first responsive in every component, always.
- Accessibility (WCAG 2.2 AA) is a hard requirement — keyboard nav, focus
  states, ARIA where needed, alt text on every image, proper landmarks.
- All product images use next/image. Never use bare <img> tags.
- TypeScript strict mode is non-negotiable. No 'any' without a written
  justification comment.
- Commit conventionally (feat:, fix:, chore:, refactor:, docs:, test:).
  Make small, atomic commits. One logical change per commit.

== UI/UX QUALITY BAR ==

The user wants a "big-company clean UI" — think Linear, Vercel's own dashboard,
Stripe's checkout, Apple's product pages, Croma's polish for India context.
This means:

- Restrained palette: one neutral scale (slate or zinc) + one accent.
  No gradients unless intentional. No more than 3 weights of any color.
- Typography: variable font (Geist, Inter, or similar) with a clear scale.
  Headings have tight tracking, body has comfortable line-height (1.6+).
- Spacing: use Tailwind's 4px base scale strictly. Generous whitespace.
  Don't cram. Pages should breathe.
- Motion: subtle and purposeful. 150–250ms ease-out for most things. Never
  bouncy or showy. Framer Motion only where animation adds clarity.
- Borders + shadows: hairline borders (1px slate-200 / slate-800), shadows
  used sparingly and softly. No drop-shadow stacks.
- Icons: Lucide React, 16/20/24px sizes, never mixed within one row.
- Skeleton loaders for every async UI. Never show empty layout shifts.
- Empty states are designed (illustration or icon + helpful copy + CTA),
  not just "No data."
- Error states are designed. Never crash to a white screen.
- Forms have clear labels above inputs, helper text below, inline errors
  with icons, disabled states, loading states.
- Buttons have clear hierarchy: primary, secondary, ghost, destructive.

If at any point a design decision feels generic or "AI-default," stop and
think: what would Linear ship here? What would Stripe ship?

== DO NOT ==

- Do not use create-react-app, Vite, pages router, getServerSideProps, or
  getStaticProps. App Router only.
- Do not introduce Redux, MobX, Recoil, Jotai, or any state library other
  than Zustand (for client state) and TanStack Query (for server state).
- Do not introduce CSS-in-JS (styled-components, emotion). Tailwind only.
- Do not introduce any payment gateway other than Razorpay.
- Do not store cards, CVVs, or any card data on our servers. Razorpay
  iframe handles all of it.
- Do not use localStorage or sessionStorage for cart, auth, or anything
  sensitive. Cart uses HTTP-only cookies + DB. Auth uses Auth.js sessions.
- Do not skip Zod validation on API inputs.
- Do not write Prisma raw queries unless absolutely necessary, and never
  with user input concatenated.
- Do not commit secrets. Ever. Use .env.local for local, Vercel env vars
  for deployments. .env.example is the only env file in git.
- Do not use floats for money.
- Do not use 'any' type without a justification comment.
- Do not create new third-party integrations not listed in SRS section 13
  without asking me first.
- Do not exceed Phase 1 scope. Reviews/wishlist/coupons/loyalty are
  Phase 2. Multi-vendor is Phase 3. Stay focused.

== WHEN STUCK ==

If the SRS is ambiguous, ask me. Don't guess.
If a service account isn't set up yet, stub the integration with clearly
marked TODOs and continue with the rest of the work.
If a sprint is too large for one session, split it into sub-sprints in
PROGRESS.md and continue from where you stopped next session.

Begin now with task 1: read SRS.md.
================================================================================
```

---

## What to Expect Across Sessions

### Session 1 — Foundation (the bootstrap above)
Reads SRS, creates CLAUDE.md and PROGRESS.md, initializes the project, sets up Prisma + Auth.js + Tailwind + Shadcn, installs all dependencies, gets `pnpm dev` running cleanly. **No business logic yet.** End state: a styled "Hello world" home page that proves the toolchain works.

### Session 2 — Auth + Database Seed
Implements the User, Session, Account models, the registration/login flows (email + password + Google OAuth), email verification via Resend, basic account dashboard skeleton. Seeds the database with categories, brands, and ~30 sample products covering 5–6 of the SRS categories.

### Session 3 — Catalog (Home + PLP)
Home page with hero, category tiles, featured products. Category PLP with faceted filters, sort, pagination. All using RSC with ISR. Mobile-first responsive.

### Session 4 — Product Detail Page
Full PDP per SRS section 6.2.3 — gallery, variants, specs, pincode check stub, sticky add-to-cart on mobile, breadcrumbs, structured data (JSON-LD).

### Session 5 — Cart
Cookie + DB-backed cart, mini-cart drawer, cart page, quantity updates, remove, free-shipping progress, suggestions strip. Zustand for the cart UI state.

### Session 6 — Checkout (Razorpay integration)
Single-page accordion checkout, address management, Razorpay order creation, webhook handler, signature verification, order finalization, order confirmation page, email confirmation.

### Session 7 — Orders + Customer Account
Orders list, order detail, tracking timeline (stub for Shiprocket initially), invoice PDF (server-side), cancel order flow. Account dashboard pages.

### Session 8 — Admin Panel (Catalog + Orders)
RBAC middleware, admin shell with sidebar, product CRUD with image upload via Cloudinary, category/brand management, order list with filters, order status updates.

### Session 9 — SEO + Polish
Metadata generation, JSON-LD on PDP and PLP, sitemap.xml, robots.txt, OG images, Lighthouse pass on all key pages, accessibility audit, final UI polish.

### Session 10 — Production Readiness
Sentry integration, rate limiting, error boundaries on every route segment, loading states, Vercel cron jobs for abandoned cart and other background tasks, Shiprocket integration completed, real Razorpay test transactions verified end-to-end.

After Session 10 you have a Phase 1 launch-ready store. Phase 2 (reviews, wishlist, coupons, advanced search) is the next 6 weeks.

---

## Tips for Working with Claude Code on a Project This Size

**One sprint per session.** Resist the urge to ask "build sessions 1–5 in one go." Claude Code can technically attempt it, but the quality drops sharply. One focused session = one focused outcome.

**Review every commit.** Use `git log --oneline` and read the diffs. Catch drift early. If something looks wrong (e.g., Stripe imports sneaking in, `any` types, CSS-in-JS), call it out and Claude Code will fix it.

**Run the app between sessions.** After each session, `pnpm dev`, click around, look at it on mobile (DevTools device toolbar). Catch UX regressions early — don't wait until session 10.

**Update CLAUDE.md when decisions change.** If you decide to use Resend's audience feature instead of building a separate marketing list, write that decision into CLAUDE.md. Otherwise the next session's Claude Code might reinvent the choice.

**If a session breaks something, revert with git.** Don't try to debug accumulated mistakes across sessions. `git reset --hard` to the last good commit, update PROGRESS.md to reflect what failed and why, and try again with a clearer instruction.

**Use `/clear` between unrelated tasks within a session.** It resets the conversation context so Claude Code has more room for the actual work. CLAUDE.md and PROGRESS.md are re-read after `/clear`, so nothing is lost.

---

## A Note on Honesty About Scope

This is a real 8-week build for one developer working with Claude Code productively. It is not a weekend project. The master prompt makes Claude Code an extremely capable pair-programmer, but it does not make complex problems trivial. Razorpay webhook signature verification, COD reconciliation, Cloudinary signed uploads, GST tax math, Shiprocket label generation, multi-step checkout state with proper rollback on payment failure — these will each take real focused work and testing. Plan accordingly.

The good news: the architecture in your SRS is sound. The tools are well-chosen. The cost in Phase 1 is genuinely low. If you commit one good session per workday, you can ship Phase 1 in 2 months.

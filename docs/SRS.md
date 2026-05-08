# Software Requirements Specification (SRS)
## Full-Stack Electronics E-Commerce Platform

**Document Version:** 1.1
**Date:** May 2026
**Project Type:** B2C Electronics E-Commerce Web Application
**Tech Stack:** Next.js 16 + React 19 + TypeScript 6 + Prisma 7 + Neon Postgres + Razorpay

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Project Overview](#2-project-overview)
3. [Stakeholders & User Roles](#3-stakeholders--user-roles)
4. [Technology Stack](#4-technology-stack)
5. [System Architecture](#5-system-architecture)
6. [Functional Requirements](#6-functional-requirements)
7. [Database Schema](#7-database-schema)
8. [API Specifications](#8-api-specifications)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [UI/UX Requirements](#10-uiux-requirements)
11. [SEO Strategy](#11-seo-strategy)
12. [Security Requirements](#12-security-requirements)
13. [Third-Party Integrations](#13-third-party-integrations)
14. [Development Roadmap](#14-development-roadmap)
15. [Deployment & DevOps](#15-deployment--devops)
16. [Testing Strategy](#16-testing-strategy)
17. [Risks & Mitigation](#17-risks--mitigation)
18. [Future Enhancements](#18-future-enhancements)

---

## 1. Introduction

### 1.1 Purpose
This document specifies the complete functional and non-functional requirements for a modern, full-stack e-commerce platform dedicated to selling electronic products. It serves as the single source of truth for design, development, testing, and deployment teams.

### 1.2 Scope
The platform is a fully responsive, SEO-optimized, server-rendered web application that enables customers to browse, compare, purchase, and review electronic products (mobiles, laptops, accessories, audio, wearables, smart home, gaming, cameras, TVs, appliances). It includes a complete admin/seller panel, integrated payments, order fulfillment workflows, and analytics.

### 1.3 Intended Audience
- Product Owner / Business Stakeholders
- Frontend Developers (Next.js / React)
- Backend Developers (Node.js / Prisma)
- DevOps Engineers
- QA / Test Engineers
- UI/UX Designers
- SEO Specialists

### 1.4 Definitions, Acronyms & Abbreviations
| Term | Definition |
|------|------------|
| SKU | Stock Keeping Unit |
| PDP | Product Detail Page |
| PLP | Product Listing Page |
| CMS | Content Management System |
| CDN | Content Delivery Network |
| SSR | Server-Side Rendering |
| ISR | Incremental Static Regeneration |
| ORM | Object-Relational Mapping |
| RBAC | Role-Based Access Control |
| KYC | Know Your Customer |
| OTP | One-Time Password |
| GMV | Gross Merchandise Value |
| AOV | Average Order Value |
| CAC | Customer Acquisition Cost |
| LTV | Lifetime Value |

---

## 2. Project Overview

### 2.1 Product Vision
Build a high-performance, mobile-first electronics marketplace that rivals platforms like Croma, Reliance Digital, Amazon Electronics, and Flipkart in usability while staying lean, fast, and SEO-dominant through Next.js's hybrid rendering capabilities.

### 2.2 Business Objectives
- Achieve sub-2-second LCP on PDPs across 3G networks
- Convert at industry benchmark (2.5%+ desktop, 1.5%+ mobile)
- Rank organically for long-tail electronics queries within 6 months
- Support multi-vendor onboarding from Phase 3 onward
- Process 10,000+ concurrent users at peak (festive sales)

### 2.3 Target Market
- **Primary:** Indian customers (Tier 1, 2, 3 cities) aged 18–55
- **Secondary:** SMB / B2B bulk buyers (Phase 4)
- **Languages:** English (Phase 1), Hindi + 3 regional (Phase 4)
- **Currency:** INR (primary), USD (Phase 5 international)

### 2.4 Product Categories Supported
1. Smartphones & Tablets
2. Laptops & Desktops
3. Audio (Headphones, Speakers, Soundbars)
4. Wearables (Smartwatches, Fitness Bands)
5. Smart Home (Lights, Cameras, Hubs, Robot Vacuums)
6. Gaming (Consoles, Accessories, Chairs)
7. Cameras & Drones
8. Televisions & Home Entertainment
9. Large & Small Appliances
10. Computer Peripherals & Accessories
11. Power & Charging (Power banks, Chargers, Cables)
12. Networking (Routers, Mesh systems)

---

## 3. Stakeholders & User Roles

### 3.1 User Roles & Permissions

| Role | Description | Key Capabilities |
|------|-------------|------------------|
| **Guest** | Unauthenticated visitor | Browse, search, add to cart (session), wishlist (after signup) |
| **Customer** | Registered buyer | All guest features + orders, reviews, addresses, payments, returns |
| **Premium Customer** | Loyalty tier member | Customer + early access, exclusive deals, free shipping |
| **Seller / Vendor** | Third-party seller (Phase 3) | Product listings, inventory, orders for own catalog, payouts |
| **Customer Support** | Helpdesk agent | View orders, issue refunds, manage tickets, RMA processing |
| **Catalog Manager** | Product team | Add/edit products, categories, attributes, media |
| **Marketing Manager** | Promotions team | Coupons, banners, campaigns, email broadcasts |
| **Order Manager** | Operations | Order status, shipping, returns, COD reconciliation |
| **Super Admin** | Platform owner | Full RBAC control, financial reports, user management |

### 3.2 RBAC Matrix
A granular permission system using role + permission tables. Each admin action is gated through middleware that validates `session.user.permissions` against the required scope (e.g., `products:write`, `orders:refund`, `users:delete`).

---

## 4. Technology Stack

> All packages are pinned at the **latest stable versions** as of project kickoff (May 2026). Versions below must be reconfirmed against the npm registry at `package.json` lock time.

### 4.1 Frontend
| Tool | Version (locked) | Purpose |
|------|------------------|---------|
| Next.js | **16.2.6** (App Router) | React framework, SSR/ISR/SSG/RSC |
| React | **19.2.6** | UI library with Server Components |
| TypeScript | **6.0.3** (strict mode) | Type safety |
| Tailwind CSS | **4.2.4** | Utility-first styling |
| Shadcn/UI | latest | Accessible component primitives (Radix-based) |
| Zustand | **5.0.13** | Client-side state (cart, UI flags) |
| TanStack Query | **5.100.9** | Server state, caching, mutations |
| React Hook Form | **7.75.0** | Form state management |
| Framer Motion | latest | Micro-interactions, page transitions |
| Lucide React | latest | Icon system |
| next-themes | latest | Dark/light mode |
| embla-carousel-react | latest | Product carousels, hero sliders |

### 4.2 Backend (Next.js Route Handlers)
| Tool | Version (locked) | Purpose |
|------|------------------|---------|
| Next.js App Router `route.ts` | **16.2.6** | Serverless API endpoints |
| Prisma ORM | **7.8.0** | Type-safe DB client + migrations |
| Auth.js (NextAuth) | **5.x** | Authentication, OAuth, sessions |
| Zod | **4.x** | Runtime validation schemas |
| bcrypt / bcryptjs | latest | Password hashing |
| jose | latest | JWT signing/verification |
| nanoid | latest | Short unique IDs (order numbers, slugs) |
| date-fns | latest | Date manipulation |
| sharp | latest | Image processing (server-side) |

### 4.3 Database & Cache
| Tool | Purpose |
|------|---------|
| **Neon Postgres** (Serverless Postgres) | Primary OLTP database |
| **Upstash Redis** | Session cache, rate limiting, cart fallback, hot product cache |
| **Prisma Accelerate** (optional) | Connection pooling for serverless |

### 4.4 Payments
| Tool | Purpose |
|------|---------|
| **Razorpay** (sole gateway) | UPI, Indian cards (Visa/Mastercard/Amex/RuPay), Net Banking, Wallets (Paytm/Amazon Pay/Mobikwik), EMI (card + cardless + no-cost), Pay Later (Simpl/LazyPay), COD reconciliation |
| **Razorpay Webhooks** | Payment events, refund events, settlement notifications |
| **Razorpay Route** (optional, Phase 3) | Multi-vendor split settlements |
| **GST calculation** | Internal pricing engine (HSN-code-based, state-aware CGST/SGST/IGST) |

### 4.5 Storage & Media
| Tool | Purpose |
|------|---------|
| **Cloudinary** | Product images, automatic optimization, transformations, video |
| **Vercel Blob** | User-generated content (review photos, return evidence) |

### 4.6 Email & Communications
| Tool | Purpose |
|------|---------|
| **Resend** | Transactional email (order, OTP, shipping, marketing) |
| **React Email** | Type-safe email templates |
| **MSG91 / Twilio** | SMS OTP, WhatsApp order updates (India) |

### 4.7 Search & Discovery
| Tool | Purpose |
|------|---------|
| **Algolia** or **Meilisearch (self-hosted)** | Instant search, typo tolerance, faceted filters |
| **Postgres `pg_trgm` + `tsvector`** | Fallback / Phase 1 lightweight search |

### 4.8 Analytics & Monitoring
| Tool | Purpose |
|------|---------|
| **Vercel Analytics** | Core Web Vitals, page-level metrics |
| **PostHog** | Product analytics, funnels, session replay, A/B tests |
| **Sentry** | Error tracking, performance monitoring |
| **Google Analytics 4** | Marketing attribution |
| **Google Tag Manager** | Tag management for pixels |
| **Microsoft Clarity** | Heatmaps, free session recordings |

### 4.9 DevOps
| Tool | Purpose |
|------|---------|
| **GitHub** | Source control |
| **Vercel** | Hosting, edge functions, preview deployments |
| **GitHub Actions** | CI: lint, typecheck, test, security scan |
| **Husky + lint-staged** | Pre-commit hooks |
| **Biome** or **ESLint + Prettier** | Code quality |
| **Vitest** | Unit tests |
| **Playwright** | E2E tests |

---

## 5. System Architecture

### 5.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  Next.js 16 (App Router) — RSC + Client Components           │
│  Tailwind + Shadcn UI, Zustand (cart), TanStack Query        │
└────────────────────────────┬─────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────┴─────────────────────────────────┐
│                    VERCEL EDGE NETWORK                       │
│  CDN, Middleware (auth/rate-limit/i18n), Image Optimization  │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────┴─────────────────────────────────┐
│              SERVERLESS API (route.ts handlers)              │
│  Auth.js │ Zod Validation │ Prisma │ Business Logic          │
└──┬─────────────┬─────────────┬─────────────┬─────────────────┘
   │             │             │             │
   ▼             ▼             ▼             ▼
┌──────┐   ┌─────────┐   ┌─────────┐   ┌──────────┐
│ Neon │   │ Upstash │   │Razorpay │   │Cloudinary│
│  PG  │   │  Redis  │   │ Payments│   │ /Resend/ │
└──────┘   └─────────┘   └─────────┘   │ Algolia  │
                                       └──────────┘
```

### 5.2 Rendering Strategy
| Page Type | Rendering | Cache Strategy |
|-----------|-----------|----------------|
| Home | ISR (revalidate 5 min) | Edge cached |
| Category PLP | ISR + dynamic params | Edge + per-filter SWR |
| Product PDP | ISR (revalidate 1 hr) + on-demand revalidate on stock/price change | Edge cached |
| Search | SSR (dynamic) | No cache |
| Cart / Checkout | CSR + RSC | No cache |
| Account / Orders | SSR (auth-gated) | No cache, private |
| Admin | CSR (auth-gated) | No cache |
| Blog / SEO Pages | SSG | Edge cached |

### 5.3 Folder Structure (App Router)
```
/app
  /(shop)
    /page.tsx                  # Home
    /products
      /[slug]/page.tsx         # PDP
    /category
      /[...slug]/page.tsx      # PLP (nested categories)
    /search/page.tsx
    /cart/page.tsx
    /checkout
      /page.tsx
      /success/page.tsx
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
    /webhooks
      /stripe/route.ts
      /razorpay/route.ts
      /shipping/route.ts
/components
  /ui                          # Shadcn components
  /shop                        # Product cards, filters, etc.
  /admin
  /shared
/lib
  /db.ts                       # Prisma client
  /auth.ts                     # NextAuth config
  /redis.ts
  /stripe.ts
  /cloudinary.ts
  /resend.ts
  /algolia.ts
  /validators                  # Zod schemas
  /services                    # Business logic
  /utils
/prisma
  /schema.prisma
  /migrations
/middleware.ts
/types
/emails                        # React Email templates
```

---

## 6. Functional Requirements

### 6.1 Authentication & User Management

#### 6.1.1 Registration
- Email + password signup (bcrypt hashed, min 8 chars, complexity rules)
- Phone + OTP signup (MSG91/Twilio for India)
- OAuth: Google, Apple, GitHub, Facebook
- Email verification mandatory before checkout
- Optional referral code field (auto-applies signup bonus)
- GDPR/DPDP-compliant consent checkboxes

#### 6.1.2 Login
- Email/phone + password
- Magic link login (via Resend)
- OTP-based login (phone)
- OAuth providers
- Remember-me via secure session cookie (HttpOnly, SameSite=Lax)
- Account lockout after 5 failed attempts (10-min cooldown), enforced via Upstash Redis

#### 6.1.3 Password Management
- Forgot password flow with time-limited token (15 min)
- Password change in account settings (re-auth required)
- Password strength meter
- Pwned password check (`Have I Been Pwned` API, optional)

#### 6.1.4 Session Management
- JWT (Auth.js) with rotating refresh tokens
- Logout from all devices option
- Active sessions list in account settings

---

### 6.2 Product Catalog

#### 6.2.1 Product Attributes
Each electronic product must support:
- **Basic:** Title, slug, brand, model number, SKU, MPN, GTIN/EAN/UPC
- **Pricing:** MRP, selling price, discount %, GST %, currency
- **Inventory:** Stock count, low-stock threshold, backorder allowed flag, warehouse location
- **Media:** Up to 15 images (with zoom), 5 videos, optional 360° spin, optional AR/3D model (USDZ/glTF)
- **Specifications:** Dynamic key-value pairs grouped by category (e.g., "Display", "Battery", "Camera" for phones)
- **Variants:** Color, storage, RAM, size — each with own SKU, price, stock, images
- **Compatibility:** Linked compatible products (e.g., laptop sleeve fits MacBook 14")
- **Bundles:** Frequently bought together / combo offers
- **Warranty:** Duration, type (manufacturer/seller/extended), warranty document URL
- **Box Contents:** What's included
- **Country of Origin** (mandatory in India)
- **HSN Code** (for GST)
- **Energy Rating** (BEE star rating for appliances)
- **Hazmat flags** (lithium battery shipping restrictions)

#### 6.2.2 Categories & Taxonomy
- Hierarchical categories (unlimited depth, e.g., Electronics > Mobiles > Smartphones > 5G > Under ₹20,000)
- Category-specific attribute templates
- Custom landing pages per category (CMS-driven hero, banners, featured products)
- Brand pages with dedicated SEO content

#### 6.2.3 Product Detail Page (PDP) Features
- Image gallery with pinch-zoom, thumbnail navigation, video tabs
- Variant selector (color swatches, storage chips)
- "Pincode delivery check" → ETA + COD availability
- Dynamic price breakdown (Price + GST + Shipping)
- "Buy Now" (skip cart) and "Add to Cart" CTAs
- Sticky add-to-cart bar on mobile scroll
- EMI calculator (no-cost EMI offers + bank-wise breakup)
- Bank offers panel (e.g., "10% off with HDFC")
- Exchange/trade-in offer block
- Specifications table (collapsible groups)
- Compare with similar products
- Frequently bought together
- Customer Q&A section (community-answered + verified)
- Reviews & ratings (with photo/video uploads, verified buyer badge)
- Recently viewed (Redis-backed, anonymous + logged-in)
- Stock status: "In stock", "Only X left", "Out of stock — notify me"
- Price drop alert subscription
- Share buttons (WhatsApp, copy link, native share)
- Structured data (JSON-LD: Product, Offer, AggregateRating)

#### 6.2.4 Product Listing Page (PLP)
- Faceted filters: brand, price range slider, ratings, discount %, availability, color, RAM/storage, screen size, refresh rate, battery, processor, etc. (category-driven)
- Sort options: Relevance, Popularity, Newest, Price ↑/↓, Discount, Rating
- Grid/list view toggle
- Quick view modal (preview without leaving PLP)
- Pagination (offset + cursor) with SEO-friendly URLs (`?page=2`)
- Infinite scroll variant (Phase 2)
- Breadcrumbs
- Active filter chips (removable)
- "Save filter as alert" — email when new matches arrive

---

### 6.3 Search & Discovery

- **Instant search** with debounced autosuggest (Algolia / Meilisearch)
- Typo tolerance, synonyms ("mobile" = "phone" = "smartphone")
- Search-as-you-type with product images, price, ratings in dropdown
- Recent searches & trending searches
- Voice search (Web Speech API, Phase 2)
- Image search ("upload pic, find similar", Phase 4)
- Search result page with full filter capabilities
- "Did you mean?" suggestions
- Zero-result page with category/brand recommendations
- Search analytics dashboard (top queries, zero-result queries, click-through)

---

### 6.4 Cart & Wishlist

#### 6.4.1 Cart
- Persistent cart: cookie-based for guests, DB-backed for logged-in (merge on login)
- Mini cart drawer (slide-out) accessible from any page
- Quantity update (with stock validation)
- Item removal, "Save for later"
- Coupon code application with real-time validation
- Auto-applied offers (best discount logic)
- Estimated total breakdown (subtotal, GST, shipping, discount, COD fee)
- Free shipping progress bar ("Add ₹X more for free shipping")
- Cross-sell strip ("People also bought")
- Stock alerts at cart-level
- Cart abandonment recovery (email after 1hr, 24hr, 72hr via Resend)

#### 6.4.2 Wishlist
- Multi-list support (Phase 2: "Birthday gift", "Office setup")
- Public/private wishlists
- Move-to-cart, share via link
- Price drop notifications on wishlist items
- Stock-back-in-alerts

---

### 6.5 Checkout & Payments

#### 6.5.1 Checkout Flow
**Single-page accordion checkout** (proven highest conversion):
1. **Contact** — email + phone (auto-fill if logged in)
2. **Address** — saved addresses dropdown OR new address form with pincode autocomplete (India Post API)
3. **Shipping method** — Standard, Express, Same-day (where eligible), Pickup
4. **Payment method** — UPI, Cards, Wallets, Net Banking, EMI, Pay Later, COD (all via Razorpay)
5. **Review & Place Order**

Features:
- Guest checkout (with optional account creation post-order)
- Address validation (pincode → city/state auto-fill)
- GST invoice option (business buyers, GSTIN field)
- Gift wrap & gift message (paid add-on)
- Order notes field
- Apply coupons / use loyalty points / use store credit
- **Razorpay Checkout (Standard or Custom)** — PCI-DSS compliant, hosted iframe, no card data touches our servers
- 3D Secure / OTP authentication for cards
- Webhook-driven order confirmation (idempotent, signature-verified)

#### 6.5.2 Payment Methods (All via Razorpay)
| Method | Notes |
|--------|-------|
| **UPI** | GPay, PhonePe, Paytm, BHIM, UPI Intent + Collect, UPI AutoPay (Phase 3 for subscriptions) |
| **Credit/Debit Cards** | Visa, Mastercard, Amex, RuPay, Diners |
| **Wallets** | Paytm, Amazon Pay, Mobikwik, Freecharge, Airtel Money |
| **Net Banking** | 50+ Indian banks |
| **EMI** | Card EMI (all major banks), No-cost EMI, Cardless EMI (ZestMoney, EarlySalary, Flexmoney) |
| **Pay Later** | Simpl, LazyPay (via Razorpay) |
| **Cash on Delivery** | Pincode-restricted, OTP-verified at delivery, COD convenience fee, COD limit per order |

> **Note:** International cards / multi-currency / Stripe integration are **out of scope for Phase 1–4**. International expansion (Phase 5+) will be re-evaluated at that time.

#### 6.5.3 Razorpay Integration Specifics
- **SDK:** Razorpay Web Checkout (iframe-based) for Phase 1; Razorpay Custom Checkout (Phase 2 for branded UX)
- **Order creation flow:** Server creates Razorpay `order_id` via `/api/checkout/session` → client opens Razorpay modal → on success, client posts signature back to `/api/orders/verify` → server verifies signature → order is finalized
- **Webhook events handled:** `payment.captured`, `payment.failed`, `payment.authorized`, `order.paid`, `refund.created`, `refund.processed`, `refund.failed`
- **Webhook signature verification** using HMAC-SHA256 with raw request body
- **Idempotency:** Each Razorpay `payment_id` recorded with unique constraint to prevent double-processing
- **Auto-capture** vs **manual capture** flag per order (manual capture used for COD-style verify-before-charge flows)
- **Refunds:** Full and partial via Razorpay Refunds API; status synced via webhook
- **Settlements:** Daily/weekly settlement reports pulled via Razorpay API for finance reconciliation
- **Razorpay Magic Checkout** (Phase 2) — 1-click checkout with saved addresses, ~2× faster conversion

#### 6.5.4 Pricing Engine
- Tax calculation per HSN code & state (intra-state CGST+SGST, inter-state IGST)
- Tiered pricing (B2B / bulk) — Phase 4
- Coupon stacking rules (single-use, multi-use, exclusive, combinable)
- Loyalty point redemption (1 point = ₹0.25, capped at 10% of order)
- Convenience fee for COD (configurable per pincode tier)
- Server-side amount verification on every payment confirmation (never trust client price)

---

### 6.6 Order Management

#### 6.6.1 Order Lifecycle
```
PENDING → CONFIRMED → PROCESSING → SHIPPED → OUT_FOR_DELIVERY → DELIVERED
                                                                ↓
                              CANCELLED ← (any pre-shipped)    RETURN_REQUESTED
                                                                ↓
                                                         RETURN_PICKED_UP
                                                                ↓
                                                            REFUNDED
```

#### 6.6.2 Customer-Facing Features
- Order summary email + SMS + WhatsApp on placement
- Real-time order tracking page (with timeline UI)
- Carrier tracking integration (Shiprocket, Delhivery, Bluedart APIs)
- Estimated delivery date (dynamic per pincode)
- Cancel order (until "Shipped" status)
- Reschedule delivery
- Download invoice (PDF, GST-compliant)
- Initiate return / replacement (within return window)
- Re-order (one-click add all items to cart)
- Rate & review post-delivery (auto-prompt 3 days after delivery)

#### 6.6.3 Admin Order Management
- Order list with advanced filters (status, date, amount, payment method, channel)
- Bulk actions (mark shipped, generate invoices, export CSV)
- Manual order creation (phone orders)
- Partial fulfillment (split shipments)
- Manual refund (full or partial)
- Notes & tags (internal)
- Order assignment to fulfillment staff
- Print packing slips, shipping labels, invoices in batch

---

### 6.7 Shipping & Logistics

- Multi-warehouse support (assign products to warehouse, route by proximity)
- Shipping rate engine (free above threshold, weight-based, zone-based)
- Carrier integration: **Shiprocket** (recommended aggregator for India), **Delhivery**, **Bluedart**, **Ecom Express**
- Auto-label generation, AWB tracking
- Pickup scheduling for returns
- COD verification webhook
- Hazmat / large appliance handling rules
- Pre-paid vs COD shipping logic
- Serviceability check by pincode at PDP, cart, checkout
- Delivery time estimation with ML (Phase 3)

---

### 6.8 Reviews & Ratings

- 5-star rating with sub-criteria (Value for money, Quality, Build, Battery — category-specific)
- Photo & video uploads (Vercel Blob / Cloudinary)
- "Verified Buyer" badge (only delivered orders)
- Helpful votes (upvote/downvote)
- Report review (abuse, fake)
- Admin moderation queue (pre-publish or post-publish moderation)
- Review reminder emails 3 days post-delivery
- Reward points for reviews with photos/videos
- Brand response capability (Phase 3)
- Review excerpts on PDP, full reviews on dedicated tab
- Aggregate rating breakdown (% 5-star, 4-star, etc.)
- Filter reviews by rating, with-media, verified, recency

---

### 6.9 Coupons, Offers & Promotions

#### 6.9.1 Coupon Types
- Percentage discount (e.g., 10% off)
- Flat discount (e.g., ₹500 off)
- Free shipping
- BOGO (buy one get one)
- Free gift with purchase
- Cashback to wallet

#### 6.9.2 Coupon Rules Engine
- Min order value
- Max discount cap
- Category/brand/product inclusions & exclusions
- User segment (new, returning, premium)
- First order only
- Usage limit (per user, total)
- Validity window (start–end datetime)
- Stackable / non-stackable flag
- Auto-apply best coupon

#### 6.9.3 Marketing Campaigns
- Flash sales (countdown timers)
- Deal of the day
- Festival landing pages (Diwali, Big Billion, etc.)
- Bank offer integration (HDFC, SBI, ICICI partner offers)
- Exchange offers (smartphone/laptop trade-in)
- Bundle deals (laptop + bag + mouse combo)
- Spin-the-wheel / scratch card gamification (Phase 3)

---

### 6.10 Notifications

| Channel | Triggers |
|---------|----------|
| **Email** (Resend) | Welcome, OTP, order confirmation, shipping update, delivery, abandoned cart, price drop, back-in-stock, review request, refund, password reset |
| **SMS** (MSG91) | OTP, order confirmation, OTP for COD delivery, delivery slot |
| **WhatsApp** (MSG91 / Twilio) | Order updates, abandoned cart (opt-in), promotional broadcasts |
| **Push (Web)** | Price drops, deal alerts, order updates (Phase 2 via OneSignal/FCM) |
| **In-app** | Account notifications center |

All transactional emails use **React Email** templates with brand consistency, dark-mode-aware, plain-text fallback.

---

### 6.11 User Account Dashboard

- **Profile:** Name, email, phone, gender, DOB, profile picture
- **Addresses:** CRUD, set default, label as Home/Office
- **Orders:** All orders, status, tracking, invoices, returns
- **Wishlist & Saved items**
- **Reviews:** My reviews, drafts
- **Returns & Refunds:** Active returns, history
- **Loyalty / Wallet:** Points balance, transaction history
- **Coupons:** Available, used, expired
- **Notifications preferences:** Channel-wise opt-in/out
- **Security:** Password change, 2FA setup, active sessions, login history
- **Linked accounts:** OAuth providers connected
- **Data privacy:** Download data (GDPR/DPDP), delete account

---

### 6.12 Admin Panel

#### 6.12.1 Dashboard
- KPI cards: Today's revenue, orders, AOV, conversion, sessions
- Real-time order feed
- Revenue trend (7d, 30d, 90d, custom)
- Top products, categories, brands
- Low-stock alerts
- Pending refunds, returns, escalations
- Funnel visualization (visit → PDP → cart → checkout → order)

#### 6.12.2 Catalog Management
- Product CRUD with rich-text editor (Tiptap)
- Bulk upload via CSV/Excel
- Bulk edit (price, stock, status)
- Image management with Cloudinary widget
- Category, brand, attribute management
- Inventory tracking, stock movements log
- Product approval workflow (for multi-vendor, Phase 3)

#### 6.12.3 Order Management
(See 6.6.3)

#### 6.12.4 Customer Management
- Customer list with filters (segment, LTV, last order, location)
- Customer profile (orders, addresses, reviews, support tickets)
- Manual customer creation
- Block/unblock customer
- Notes & tags

#### 6.12.5 Marketing
- Coupon CRUD
- Banner & promo CRUD (homepage hero, category banners)
- Email campaign builder (Phase 3)
- SEO meta editor per page
- Blog/CMS for content marketing

#### 6.12.6 Reports & Analytics
- Sales report (by product, category, brand, channel, date)
- Tax report (GST collected per state)
- Inventory report (stock value, turnover, dead stock)
- Customer report (cohort, retention, LTV)
- Coupon performance
- Search analytics
- Custom date range, CSV/Excel export

#### 6.12.7 Settings
- Store settings (name, logo, currency, timezone)
- Shipping zones & rates
- Tax configuration
- Payment gateway keys
- Email templates editor
- Staff management (RBAC)
- Webhook logs
- Audit trail (who changed what, when)

---

### 6.13 Customer Support Features

- Help center / FAQ (categorized, searchable)
- Contact form
- Live chat widget (Crisp / Tawk.to / Intercom — Phase 2)
- Order-specific help ("Need help with this order?")
- Ticket system (admin-side)
- Return/refund self-service
- WhatsApp support button (deep-linked)

---

## 7. Database Schema

> Implemented in **Prisma** schema. Below is a high-level entity overview. Full schema in `/prisma/schema.prisma`.

### 7.1 Core Entities

```prisma
// Users & Auth
User          (id, email, phone, name, image, role, emailVerified, ...)
Account       (OAuth providers — NextAuth standard)
Session       (NextAuth standard)
VerificationToken
Address       (id, userId, line1, line2, city, state, pincode, country, label, isDefault)

// Catalog
Category      (id, name, slug, parentId, image, description, seoMeta)
Brand         (id, name, slug, logo, description, seoMeta)
Product       (id, name, slug, brandId, description, status, ...)
ProductCategory (productId, categoryId)  // many-to-many
ProductVariant (id, productId, sku, price, mrp, stock, attributes JSON, ...)
ProductImage  (id, productId, variantId?, url, alt, position)
ProductSpec   (id, productId, group, key, value, position)
ProductAttribute (id, name, type, options[])  // for variant generation
RelatedProduct (productId, relatedId, type)   // compatibility, similar, bundle

// Inventory
Warehouse     (id, name, address, ...)
StockMovement (id, variantId, warehouseId, type, qty, reason, refId)

// Cart & Wishlist
Cart          (id, userId?, sessionId, expiresAt)
CartItem      (id, cartId, variantId, quantity, priceSnapshot)
Wishlist      (id, userId, name, isPublic)
WishlistItem  (id, wishlistId, productId, variantId?)

// Orders
Order         (id, orderNumber, userId, email, phone, status, subtotal, tax, shipping, discount, total, currency, paymentStatus, ...)
OrderItem     (id, orderId, variantId, qty, price, tax, discount, productSnapshot JSON)
OrderAddress  (id, orderId, type [billing/shipping], snapshot of address)
OrderEvent    (id, orderId, status, note, createdBy, createdAt)
Shipment      (id, orderId, carrier, awb, trackingUrl, status, ...)

// Payments
Payment       (id, orderId, gateway, gatewayId, method, amount, status, raw JSON, createdAt)
Refund        (id, orderId, paymentId, amount, reason, status, gatewayRefundId)

// Returns
Return        (id, orderId, reason, status, pickupAddress, ...)
ReturnItem    (id, returnId, orderItemId, qty, condition)

// Reviews
Review        (id, productId, userId, orderId, rating, title, body, status, createdAt)
ReviewMedia   (id, reviewId, type, url)
ReviewVote    (id, reviewId, userId, vote)
QnA           (id, productId, userId, question, answer, answeredBy, status)

// Marketing
Coupon        (id, code, type, value, rules JSON, validFrom, validTo, usageLimit, ...)
CouponUsage   (id, couponId, userId, orderId)
Banner        (id, position, image, link, validFrom, validTo)
LoyaltyTransaction (id, userId, type, points, refId, createdAt)

// Misc
Notification  (id, userId, type, title, body, read, createdAt)
SearchLog     (id, userId?, sessionId, query, resultsCount, clickedProductId?)
AuditLog      (id, userId, action, entity, entityId, before JSON, after JSON, ip, userAgent, createdAt)
Setting       (key, value JSON)  // store config
```

### 7.2 Indexing Strategy
- Composite indexes on `(productId, status)`, `(userId, createdAt)`, `(orderNumber)`
- Full-text indexes on `Product.name`, `Product.description` via `pg_trgm`
- Partial indexes on active records (`WHERE status = 'ACTIVE'`)
- B-tree on all foreign keys

### 7.3 Data Integrity
- Soft deletes (`deletedAt`) for orders, products, users
- All money fields stored as `Decimal(12,2)` — never floats
- Timestamps: `createdAt`, `updatedAt` on every table
- Optimistic concurrency on stock (version column)

---

## 8. API Specifications

### 8.1 API Conventions
- Base path: `/api`
- REST + JSON
- Auth via NextAuth session cookies (server) or Bearer JWT (mobile, Phase 4)
- Standard response shape:
  ```json
  { "success": true, "data": {...}, "meta": {...} }
  { "success": false, "error": { "code": "...", "message": "...", "details": [...] } }
  ```
- Pagination: `?page=1&limit=20` or cursor `?cursor=xyz`
- Rate limiting via Upstash Redis (per IP and per user)
- All inputs validated with Zod
- Idempotency keys for write endpoints (`Idempotency-Key` header)

### 8.2 Public Endpoints (sample)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/products` | List with filters, pagination, sort |
| GET | `/api/products/[slug]` | PDP data |
| GET | `/api/products/[slug]/related` | Related/similar |
| GET | `/api/categories` | Tree |
| GET | `/api/categories/[slug]` | Category page data |
| GET | `/api/search` | Search (proxy to Algolia) |
| GET | `/api/search/suggest` | Autocomplete |
| POST | `/api/cart` | Add to cart |
| GET | `/api/cart` | Get current cart |
| PATCH | `/api/cart/items/[id]` | Update qty |
| DELETE | `/api/cart/items/[id]` | Remove item |
| POST | `/api/cart/coupon` | Apply coupon |
| POST | `/api/checkout/session` | Create payment intent |
| POST | `/api/orders` | Place order (after payment confirmation) |
| GET | `/api/orders/[orderNumber]` | Order details |
| POST | `/api/orders/[id]/cancel` | Cancel order |
| POST | `/api/orders/[id]/return` | Initiate return |
| POST | `/api/reviews` | Submit review |
| POST | `/api/wishlist` | Add to wishlist |
| GET | `/api/wishlist` | Get wishlist |
| POST | `/api/auth/[...nextauth]` | NextAuth handler |
| POST | `/api/auth/register` | Custom registration |
| POST | `/api/auth/otp/send` | Send phone OTP |
| POST | `/api/auth/otp/verify` | Verify OTP |
| POST | `/api/serviceability` | Pincode check |
| POST | `/api/notify/back-in-stock` | Subscribe |

### 8.3 Webhooks

| Endpoint | Source |
|----------|--------|
| `/api/webhooks/razorpay` | Razorpay (payment events, refund events, settlement) |
| `/api/webhooks/shiprocket` | Shiprocket (shipment status updates) |
| `/api/webhooks/cloudinary` | Cloudinary (upload complete) |

All webhooks must verify signatures, use raw body parsing, be idempotent, and return 2xx within 5s (offload heavy work to background jobs).

### 8.4 Background Jobs
Use **Vercel Cron Jobs** + **Upstash QStash** for:
- Abandoned cart emails
- Daily price-drop notifications
- Stock-back-in alerts
- Order auto-cancellation (unpaid > 30 min)
- Review request reminders (D+3 post-delivery)
- Sitemap regeneration
- Sales reports
- Search index sync

---

## 9. Non-Functional Requirements

### 9.1 Performance
- **LCP < 2.5s** (mobile, 4G) on PDP & PLP
- **TTFB < 200ms** for cached pages, < 800ms for dynamic
- **CLS < 0.1**, **INP < 200ms**
- Image: AVIF/WebP via next/image, responsive sizes, lazy loading below fold
- Critical CSS inlined, fonts preloaded with `font-display: swap`
- Bundle size: initial JS < 180KB gzipped per route
- Route-level code splitting via App Router
- React Server Components for catalog pages (zero JS where possible)
- Database query budget: < 50ms p95 per request

### 9.2 Scalability
- Stateless serverless functions (no in-memory state)
- Horizontal scaling via Vercel auto-scale
- Read replicas in Phase 3 for catalog reads
- Redis caching layer for hot products, sessions, rate limits
- CDN edge caching for static and ISR pages
- Database connection pooling (Prisma Accelerate or pgbouncer)

### 9.3 Availability
- Target: **99.95% uptime**
- Multi-region failover (Phase 3)
- Graceful degradation (cart works even if reviews API down)
- Status page (status.yourstore.com via Better Stack)

### 9.4 Accessibility (WCAG 2.2 AA)
- Semantic HTML, proper ARIA roles
- Keyboard navigation everywhere
- Focus visible, focus trap in modals
- Color contrast ≥ 4.5:1
- Alt text on all product images
- Screen reader testing (NVDA, VoiceOver)
- Form labels and error announcements
- Reduced-motion media query support

### 9.5 Browser Support
- Last 2 versions of Chrome, Firefox, Safari, Edge
- iOS Safari 15+, Chrome Android 100+
- No IE support

### 9.6 Internationalization
- `next-intl` library (Phase 4)
- RTL support for Arabic (Phase 5)
- Locale-aware number, currency, date formatting

### 9.7 Compliance
- **DPDP Act 2023** (India) compliance
- **GDPR** for EU visitors (cookie consent, data portability, right to delete)
- **PCI DSS** — never store raw card data, only tokens
- **GST** invoice format compliance (India)
- **Consumer Protection (E-Commerce) Rules 2020** — seller info, country of origin, return policy disclosure

---

## 10. UI/UX Requirements

### 10.1 Design System
- **Design tokens** in Tailwind config: colors, spacing, radii, shadows, typography
- **Brand palette:** Primary, accent, neutral grays, semantic (success, warning, error, info)
- **Dark mode** parity from day one
- **Typography:** Variable font (e.g., Inter, Geist) with fluid scale
- **Component library** built on Shadcn/UI primitives, customized for brand
- **Icons:** Lucide consistent, 24px base
- **Motion:** Subtle, purposeful — Framer Motion for entrance, hover, page transitions

### 10.2 Key Pages (Wireframe-Level)
1. **Home** — Hero carousel, category tiles, deal-of-day, trending products, brand strip, editorial blocks, newsletter
2. **Category PLP** — Sticky filter sidebar (drawer on mobile), product grid, sort bar
3. **PDP** — Gallery left, info right, specs/reviews tabs, related products
4. **Cart** — Item list, summary, suggestions
5. **Checkout** — Accordion steps, sticky order summary
6. **Order Confirmation** — Success animation, order details, what next
7. **Search** — Filters + results
8. **Account Dashboard** — Sidebar nav, content area
9. **Admin Dashboard** — Sidebar, KPI cards, data tables
10. **Auth pages** — Centered card, OAuth buttons, branding

### 10.3 Mobile-First Considerations
- Bottom nav bar (Home, Categories, Search, Cart, Account)
- Sticky add-to-cart on PDP
- Swipeable product galleries
- Filter as full-screen drawer
- Skeleton loaders everywhere data fetches
- Pull-to-refresh on listing pages

### 10.4 UI References
The user may share live preview links of premium ThemeForest electronics themes (e.g., Electro, Wokiee, Martfury) for visual reference. The design team should extract the **structural patterns** and translate them into a custom design system aligned with brand identity — not copy verbatim.

---

## 11. SEO Strategy

### 11.1 Technical SEO
- **Server-rendered/SSG** content for all public pages
- **Dynamic metadata** via `generateMetadata` in App Router
- **Structured data (JSON-LD):**
  - `Product`, `Offer`, `AggregateRating`, `Review` on PDP
  - `BreadcrumbList` site-wide
  - `Organization`, `WebSite` on Home
  - `FAQPage` on FAQ pages
  - `ItemList` on PLPs
- **Open Graph & Twitter Card** meta tags on every page
- **Sitemap.xml** auto-generated, split by category (sitemap-products.xml, sitemap-categories.xml, sitemap-blog.xml), submitted to GSC
- **Robots.txt** — block admin, account, checkout
- **Canonical URLs** to avoid duplicate content (variant URLs canonicalize to parent product)
- **hreflang** tags (Phase 4 multi-lang)
- **Pagination** rel=next/prev (or canonical to all-products)
- **Clean URLs:** `/category/laptops/gaming`, `/products/dell-xps-15-9530`
- **HTTP/2 + Brotli compression** (Vercel default)
- **Image optimization** with descriptive filenames and alt
- **Core Web Vitals** monitoring → continuous optimization

### 11.2 Content SEO
- Category landing pages with 300+ word unique copy
- Brand pages with brand story
- Buying guides blog (e.g., "Best laptops under ₹50,000 in 2026")
- Comparison pages (Product A vs Product B)
- FAQ schema on PDP and category pages
- User-generated content (reviews, Q&A) for long-tail keywords
- Internal linking: related products, recently viewed, breadcrumbs

### 11.3 SEO-Friendly URL Patterns
| Page | URL Pattern |
|------|-------------|
| Home | `/` |
| Category | `/category/[...slug]` |
| Product | `/products/[slug]` |
| Brand | `/brands/[slug]` |
| Search | `/search?q=...` |
| Blog | `/blog/[slug]` |
| Compare | `/compare/[slug1]-vs-[slug2]` |

---

## 12. Security Requirements

### 12.1 Application Security
- **Input validation:** Every endpoint uses Zod schemas
- **Output encoding:** React handles by default; sanitize rich-text via DOMPurify
- **SQL injection:** Prisma parameterized queries (no raw unless reviewed)
- **XSS:** CSP headers, no `dangerouslySetInnerHTML` without sanitization
- **CSRF:** SameSite cookies + CSRF tokens on state-changing forms (NextAuth handles)
- **Authentication:** Auth.js v5 with secure session cookies, JWT rotation
- **Authorization:** RBAC middleware on every protected route
- **Rate limiting:** Upstash Redis sliding-window (login: 5/min, OTP: 3/min, API: 60/min/IP)
- **Bot protection:** Cloudflare Turnstile / hCaptcha on signup, login, checkout
- **Secrets management:** Vercel Environment Variables, never committed
- **Dependency scanning:** GitHub Dependabot + Snyk
- **Security headers:** HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Audit logs** for all admin actions

### 12.2 Payment Security
- PCI DSS SAQ-A scope (no card data ever touches our servers — Razorpay hosted iframe handles all card input)
- Razorpay Checkout iframe (Standard) for Phase 1; Razorpay Custom Checkout (Phase 2) still keeps card fields inside Razorpay's PCI-scoped iframe
- Webhook signature verification using HMAC-SHA256 with raw request body
- Server-side amount verification on every callback (never trust client-submitted price)
- Idempotency keys on all payment-confirmation endpoints
- Razorpay payment IDs stored with unique constraint to prevent double-processing
- Razorpay API keys split into Test and Live modes; Live keys only in production environment variables

### 12.3 Data Protection
- **Encryption at rest:** Neon (AES-256), Cloudinary, Vercel Blob
- **Encryption in transit:** TLS 1.3
- **PII fields:** email, phone, address — encrypted at column level for high-risk fields (Phase 2)
- **Backups:** Daily automated, 30-day retention, geo-redundant (Neon)
- **Access logs:** All admin DB access logged
- **Data retention:** Configurable per data type, automated purge

### 12.4 Account Security
- 2FA via TOTP (authenticator app) and SMS
- Suspicious login detection (new device, new location → email alert)
- Force re-auth for sensitive actions (change email, password, payment)
- Active session list, revoke individual sessions

---

## 13. Third-Party Integrations

| Service | Purpose | Integration Type |
|---------|---------|------------------|
| Razorpay | All payments (UPI, cards, EMI, wallets, COD) | SDK + Webhooks |
| Cloudinary | Media | Upload widget + APIs |
| Resend | Transactional email | SDK |
| MSG91 | SMS, WhatsApp | REST API |
| Algolia / Meilisearch | Search | SDK |
| Shiprocket | Shipping aggregator | REST API |
| India Post API | Pincode lookup | REST API |
| Google Maps | Address geocoding | JS SDK |
| Google Analytics 4 | Analytics | gtag |
| Google Tag Manager | Tag mgmt | Script |
| PostHog | Product analytics | SDK |
| Sentry | Error tracking | SDK |
| Upstash Redis | Cache, rate limit | REST/SDK |
| Upstash QStash | Background jobs | REST API |
| Cloudflare Turnstile | Bot protection | JS widget |
| GST API (Cleartax/Masters India) | GST verification | REST (Phase 4) |
| HIBP | Pwned passwords | REST (optional) |
| Tawk.to / Crisp | Live chat | JS widget |

---

## 14. Development Roadmap

### Phase 1 — MVP (Weeks 1–8)
**Goal:** Launchable storefront with single-vendor catalog, payments, orders.

- Project bootstrap (Next.js 16, React 19, TS 6, Tailwind 4, Shadcn, Prisma 7, Auth.js 5)
- Database schema, migrations, seed data
- Authentication (email/password + Google OAuth + email verification)
- Product CRUD admin (basic)
- Category & brand management
- Catalog: Home, Category PLP, PDP, Search (Postgres-based)
- Cart (guest + logged-in, Redis fallback)
- Checkout (Razorpay — UPI, cards, EMI, wallets, COD)
- Order placement, order confirmation, order list (customer + admin)
- Address management
- Pincode serviceability
- Shipping integration (Shiprocket)
- Basic email notifications (Resend)
- SEO basics (metadata, sitemap, robots, JSON-LD on PDP)
- Responsive UI, dark mode
- Vercel deployment, GitHub Actions CI

### Phase 2 — Conversion & Trust (Weeks 9–14)
- Reviews & ratings with photos
- Wishlist (multi-list)
- Coupons & discount engine
- Loyalty wallet
- Abandoned cart recovery
- Price drop & back-in-stock alerts
- Advanced filters (faceted)
- Algolia/Meilisearch integration
- Compare products
- Q&A on PDP
- Returns & refunds workflow
- Customer support helpdesk basics
- WhatsApp order updates

### Phase 3 — Scale & Engagement (Weeks 15–22)
- Multi-vendor / seller onboarding
- Seller dashboard (own products, orders, payouts)
- Multi-warehouse routing
- Advanced reporting & analytics
- A/B testing framework (PostHog)
- Email campaign builder
- Blog / CMS
- Referral program
- 2FA
- Read replicas, performance tuning
- Web push notifications

### Phase 4 — Expansion (Weeks 23–30)
- B2B / bulk pricing
- GST invoice for businesses
- Multi-language (Hindi + 3 regional)
- Mobile app via React Native or PWA install flow
- Live chat with chatbot (AI-powered FAQ)
- Voice & image search
- Advanced gamification (spin wheel, scratch cards)

### Phase 5 — International & Advanced (Weeks 31+)
- International shipping & multi-currency
- AR product preview (USDZ, glTF viewer)
- AI-powered recommendations (vector embeddings, pgvector)
- AI shopping assistant (Claude/GPT integration)
- Subscription products (replenishment)
- Marketplace ads / sponsored listings

---

## 15. Deployment & DevOps

### 15.1 Environments
| Env | Purpose | URL |
|-----|---------|-----|
| Development | Local | localhost:3000 |
| Preview | Per-PR auto-deploy | `*.vercel.app` |
| Staging | QA, UAT | staging.yourstore.com |
| Production | Live | yourstore.com |

### 15.2 CI/CD Pipeline (GitHub Actions)
```yaml
on: [push, pull_request]
jobs:
  - lint (Biome/ESLint)
  - typecheck (tsc)
  - unit tests (Vitest)
  - e2e tests on preview (Playwright)
  - security scan (Snyk, CodeQL)
  - bundle analysis (@next/bundle-analyzer)
  - Lighthouse CI on preview URL
  - DB migration dry-run
  - Auto-deploy to Vercel on main merge
```

### 15.3 Branching Strategy
- `main` → production (protected, requires PR + 1 approval + green CI)
- `develop` → integration branch (optional)
- `feature/*`, `fix/*`, `chore/*` → working branches
- Conventional Commits + Changesets for versioning

### 15.4 Database Migrations
- Prisma Migrate
- Backwards-compatible migrations for zero-downtime deploys
- Pre-deploy migration step in CI
- Rollback plan per migration

### 15.5 Monitoring
- Vercel Analytics (Web Vitals)
- Sentry (errors, performance)
- Better Stack / Uptime Kuma (uptime, status page)
- Custom log drains to Logflare / BetterStack
- Alerts to Slack / PagerDuty for incidents

### 15.6 Backup & Disaster Recovery
- Neon: Daily automated backups, point-in-time recovery (7 days)
- Cloudinary: Built-in redundancy
- Disaster recovery runbook documented
- Quarterly restore drills

---

## 16. Testing Strategy

### 16.1 Test Pyramid
| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Unit | Vitest | 70%+ on `/lib/services` |
| Component | Vitest + Testing Library | Critical UI components |
| Integration | Vitest with test DB | API route handlers |
| E2E | Playwright | Top 10 user flows |
| Visual regression | Chromatic / Percy | Design system components |
| Accessibility | axe-core + Playwright | All public pages |
| Performance | Lighthouse CI | Every PR |
| Load testing | k6 | Pre-launch + festival prep |
| Security | OWASP ZAP, npm audit, Snyk | Continuous |

### 16.2 Critical E2E Flows
1. Sign up → email verify → login
2. Browse → search → filter → add to cart → checkout (card) → order success
3. Checkout with COD
4. Apply coupon, then complete checkout
5. Order tracking, return initiation
6. Submit review with photo
7. Wishlist add → move to cart
8. Admin: create product, place test order, refund

### 16.3 Manual QA
- Cross-browser smoke tests pre-release
- Mobile device lab (BrowserStack)
- UAT with stakeholders before each phase release

---

## 17. Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Vercel cold starts on serverless | Slow first response | Medium | Edge runtime where possible, ISR, regional functions |
| Database connection limits | Outage at scale | Medium | Prisma Accelerate / pooler, read replicas in Phase 3 |
| Payment gateway downtime | Lost revenue | Low | Razorpay has 99.95%+ historical uptime; queue failed orders for retry, surface clear error UX, allow COD fallback |
| Inventory oversell race condition | Customer disappointment | Medium | DB transactions + optimistic locking + Redis reservation |
| Bot/scraper abuse | Cost, perf | High | Cloudflare WAF, Turnstile, rate limiting |
| GST/regulatory changes | Compliance | Low | Modular tax engine, easy config |
| SEO content thin | Poor ranking | Medium | Editorial team + AI-assisted unique copy |
| Image storage cost spike | Margin | Low | Cloudinary auto-format/quality, CDN caching |
| Shipping carrier delays | Customer churn | High | Multi-carrier via Shiprocket aggregator, transparent ETAs |
| Data breach | Severe | Low | Layered security, audits, principle of least privilege |

---

## 18. Future Enhancements (Backlog)

- AR product try-on (smartphones held next to face, TV in living room)
- AI-generated product summaries from specs
- Voice commerce (Alexa/Google Assistant skills)
- Subscribe & save (chargers, cables consumables)
- Trade-in & buyback program
- Repair service marketplace
- Refurbished/open-box products section
- Flash auction events
- Live shopping streams
- Crypto payment (UPI-linked stablecoins, future India regulatory permitting)
- Loyalty NFTs (experimental)
- Mobile native apps (React Native)
- Sustainability tracker (carbon footprint per order)
- Group buying / bulk discounts
- Affiliate / influencer program with custom dashboards

---

## Appendix A — Glossary
*(See Section 1.4)*

## Appendix B — Reference Sites for UX Inspiration
- Croma.com — Indian electronics flagship UX
- RelianceDigital.in — pincode-driven UX
- Amazon.in Electronics — gold standard for filters and reviews
- BestBuy.com — international reference for category-rich navigation
- Apple.com — premium PDP experience
- Flipkart.com — Indian-market checkout patterns

## Appendix C — Compliance Checklist
- [ ] Privacy Policy page
- [ ] Terms & Conditions
- [ ] Return & Refund Policy
- [ ] Shipping Policy
- [ ] Cancellation Policy
- [ ] Cookie Policy + consent banner
- [ ] Contact Us with grievance officer details (India CP Rules)
- [ ] Country of origin on every product
- [ ] Seller details visible per product (Phase 3 multi-vendor)
- [ ] GST invoice on every order

## Appendix D — Phase 1 Lean Cost Breakdown (Recommended: Vercel Pro Path)

> Phase 1 is about validating the business at minimum cost. Almost everything except hosting and payment fees runs on **free tiers**. Realistic monthly fixed cost: **~$20 (₹1,700)** + variable Razorpay fees that only apply when you make sales.

### D.1 Why Vercel Pro (Not Hobby)

**Vercel's Hobby (free) plan explicitly bans commercial use.** Running an e-commerce store on Hobby violates Vercel's Fair Use Policy and can result in account suspension. So a free Vercel deployment is **not** an option for a real revenue-generating store.

The recommended Phase 1 path is **Vercel Pro at $20/month flat (1 developer seat)** which includes:
- Commercial-use rights
- 1 TB bandwidth/month
- 1,000 GB-hours of serverless function compute
- 10 million Edge Requests
- $20 in usage credit applied automatically (absorbs small overages)
- Web Analytics, advanced spend management, and faster builds
- Full Next.js 16 feature support (ISR, Edge Middleware, Partial Prerendering, Server Actions)

This is the simplest, most reliable path. Free alternatives (Cloudflare Pages, Netlify free) exist but cost developer time in adapter quirks and bandwidth surprises — not worth the trade-off for a launching store.

### D.2 Phase 1 Recommended Stack (All Free Except Hosting)

| Service | Phase 1 Tier | Monthly Cost | What You Get | Upgrade Trigger |
|---------|--------------|--------------|--------------|-----------------|
| **Hosting** — Vercel Pro | Pro | **$20** | 1TB bandwidth, 1000 GB-hrs functions, $20 usage credit, Next.js 16 native support | Bandwidth approaching 1TB or function GB-hrs near 1000 |
| **Database** — Neon Postgres | Free | **$0** | 0.5 GB storage, autosuspend, 1 project | DB > 0.4 GB or need always-on connections |
| **Cache** — Upstash Redis | Free (or skip) | **$0** | 10K commands/day, 256 MB | ~5K daily active users — or skip Redis entirely in Phase 1 and use Next.js native cache |
| **Media** — Cloudinary | Free | **$0** | 25 credits (~25GB storage + 25GB bandwidth), auto-format, auto-quality | ~500 products with multiple images, or hitting credit cap |
| **Email** — Resend | Free | **$0** | 3,000 emails/month, 100/day | ~80 orders/day |
| **SMS/OTP** — MSG91 | Pay-per-use | **~₹0.20/SMS** | Pay only when sent (signup, COD verify) | Always pay-per-use, no base fee |
| **Search** — Postgres `pg_trgm` + `tsvector` | Free (built into Neon) | **$0** | Full-text + fuzzy search, faceted filters via SQL | SKU count > 5,000 or search latency > 500ms |
| **Errors** — Sentry | Free Developer | **$0** | 5K errors/mo, 10K performance events | Errors > 5K/month |
| **Product Analytics** — PostHog Cloud | Free | **$0** | 1M events/mo, session replay, funnels, feature flags | Hard to outgrow in Phase 1 |
| **Web Analytics** — Vercel Analytics | Included with Pro | **$0** | Core Web Vitals, page-level metrics | Already included |
| **Marketing Analytics** — Google Analytics 4 | Free | **$0** | Attribution, audiences, GTM integration | Always free |
| **Heatmaps** — Microsoft Clarity | Free | **$0** | Unlimited heatmaps, session recordings | Always free |
| **Bot Protection** — Cloudflare Turnstile | Free | **$0** | Unlimited validations on signup/login/checkout | Always free |
| **CI/CD** — GitHub Actions | Free | **$0** | 2,000 minutes/mo on private repos | Likely never |
| **Live Chat** — Tawk.to | Free | **$0** | Unlimited agents and chats | Skip Crisp/Intercom in Phase 1 |
| **Uptime Monitoring** — Better Stack / UptimeRobot | Free | **$0** | 10 monitors, 5-min checks, status page | Always free |
| **Payment Gateway** — Razorpay | Pay-per-transaction | **2% per txn** | UPI, cards, EMI, wallets, Net Banking, Pay Later, COD | Negotiate down at ₹50L+/month GMV |

### D.3 Total Phase 1 Monthly Cost

| Component | Monthly |
|-----------|---------|
| Vercel Pro (1 seat, flat) | **$20 (₹1,700)** |
| All other services (free tier) | **$0** |
| Domain (`.in` or `.com` via Cloudflare Registrar at cost, amortized) | **~₹70** |
| **Fixed total** | **~₹1,770/month** |
| Razorpay fees | **2% of revenue (only when you earn)** |
| MSG91 SMS | **~₹0.20 per OTP (only when triggered)** |

**If Phase 1 makes ₹0 in revenue, your true monthly bill is ~₹1,770.** Variable costs only kick in when you make sales.

### D.4 What I Cut from the Original Production Estimate

| Originally Listed | Original Cost | Phase 1 Action | Saving |
|-------------------|---------------|----------------|--------|
| Cloudinary Plus | $89 | → Free tier (25 credits, plenty for MVP) | **$89** |
| Algolia Build | $50+ | → Skip; use Postgres `tsvector` + `pg_trgm` until SKU count justifies | **$50** |
| Resend Pro | $20 | → Free tier (3K emails/mo) | **$20** |
| Sentry Team | $26 | → Free Developer tier (5K errors/mo) | **$26** |
| PostHog Cloud | $0–50 | → Free tier (1M events) | **$0–50** |
| MSG91 base | $30–100 | → Pure pay-per-use (no monthly base) | **$30–100** |
| Upstash Redis paid | $10–30 | → Free tier OR skip Redis in Phase 1 entirely | **$10–30** |
| Neon Scale | $19+ | → Free tier (0.5 GB) | **$19** |
| Stripe | 2.9% + 30¢ per txn | → Removed entirely; Razorpay handles all India payments | **N/A** |

**Total saved per month: ~$280–400 vs. the production estimate.**

### D.5 What's Skipped in Phase 1 (Add Later)

- ❌ **Algolia / Meilisearch** — Postgres native search covers MVP
- ❌ **Crisp / Intercom paid live chat** — Tawk.to free or WhatsApp button
- ❌ **Klaviyo / Mailchimp marketing email** — Resend transactional only for now
- ❌ **Optimizely / VWO** — PostHog free tier has feature flags + experiments
- ❌ **Stripe** — India-only Phase 1; Razorpay handles everything
- ❌ **Upstash QStash** — Vercel Cron Jobs (free on Pro) is enough
- ❌ **Multi-warehouse routing** — Single warehouse + Shiprocket aggregation
- ❌ **Multi-vendor / seller panel** — Phase 3
- ❌ **Native mobile apps** — Responsive PWA-installable web first

### D.6 Non-Negotiable Even in Phase 1

- ✅ **Hosting** — Vercel Pro (or commercial-use-allowed alternative)
- ✅ **Database** — Neon free is enough
- ✅ **Payment gateway** — Razorpay (no monthly fee, only transaction fees)
- ✅ **Transactional email** — Resend free is enough
- ✅ **Domain + SSL** — Cloudflare Registrar at cost (~₹800/year)
- ✅ **Error tracking** — Sentry free (launching without this is reckless)
- ✅ **Backups** — Neon includes them on free tier
- ✅ **Bot protection** — Turnstile free on signup/login

### D.7 Realistic Bill at 50 Orders/Month (Phase 1 Soft Launch)

Assumptions: 50 orders/month, ₹1,500 average order value (AOV), Vercel Pro path.

| Item | Monthly |
|------|---------|
| Vercel Pro | ₹1,700 |
| Domain (amortized) | ₹70 |
| Razorpay fees (50 × ₹1,500 × 2%) | ₹1,500 |
| MSG91 OTPs (~200 × ₹0.25) | ₹50 |
| **Total** | **~₹3,320/month** |

GMV at this scale: ₹75,000/month. Hosting/infra is **~2.3% of GMV**. As GMV grows, that percentage drops fast — at ₹3 lakh/month GMV the same fixed cost is under 1% of revenue.

**For comparison:** Shopify Basic in India costs ~₹2,400/month + 2% transaction fee + ₹500–2,000/month in essential apps (reviews, search, email automation). Your custom Next.js stack is typically **cheaper than Shopify** at Phase 1 — and you own the entire codebase.

### D.8 Upgrade Trigger Reference (Don't Upgrade Preemptively)

| Service | Upgrade When |
|---------|--------------|
| Vercel Pro → higher tier | Bandwidth approaching 1TB OR function GB-hrs near 1000; first try caching, only then upgrade |
| Neon Free → Launch ($19) | DB hits ~0.4 GB OR you need always-on connections OR you need read replicas |
| Cloudinary Free → Plus ($89) | ~500+ products with multiple images, or 25-credit cap hit |
| Resend Free → Pro ($20) | Sending >100 emails/day (~80–100 orders/day) |
| Upstash Redis Free → Pay-as-you-go | Exceed 10K commands/day (~5K active daily users) |
| Postgres search → Algolia/Meilisearch | SKU count > 5,000 OR search latency > 500ms p95 OR need typo tolerance + synonyms at scale |
| Sentry Free → Team ($26) | Errors > 5K/month or need longer retention |
| PostHog Free → Paid | Events > 1M/month (rare in Phase 1) |
| Tawk.to → Crisp/Intercom | When chat volume justifies paid features (Phase 2+) |
| Razorpay Standard → Negotiated rates | At ₹50L+/month GMV, negotiate transaction fee below 2% |

### D.9 Phase 2 Cost Preview (~₹4,000–6,000/month)

When Phase 2 features are added (reviews with media, advanced search, abandoned cart recovery), expect modest increases:
- Cloudinary may move to ~$10–20/mo (Phase 2 adds review photos)
- Algolia or Meilisearch ~$0–50/mo (Algolia free for 10K records, Meilisearch self-hosted is free on a $5 VPS)
- Possibly Resend Pro $20/mo if order volume crosses 80/day

Phase 2 fixed cost target: **~$30–50/month**, still under ₹4,500.

---

**Bottom line:** Phase 1 launches at **~₹1,770/month fixed** with all infrastructure on free tiers except Vercel Pro. Variable costs only kick in when you make sales. This is roughly **5× cheaper** than the original production estimate.

---

**Document End**

*This SRS is a living document. Updates require version bump and stakeholder sign-off. All version numbers, costs, and integration details should be re-validated at sprint planning.*

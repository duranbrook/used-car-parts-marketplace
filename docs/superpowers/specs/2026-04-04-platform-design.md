# PartFinder Platform Design Spec
**Date:** 2026-04-04  
**Status:** Approved

---

## Overview

PartFinder is a three-system used car parts marketplace platform. The three systems share a single backend but serve distinct user roles with tailored experiences.

| System | Users | Platforms |
|---|---|---|
| Seller App | Yards, dismantlers, individual sellers | Web + Native Mobile (Expo) |
| Buyer Marketplace | People buying used car parts | Web + Native Mobile (Expo) |
| Ops Dashboard | Internal platform operators | Web only |

---

## Architecture

### Repository Structure

Monorepo using Turborepo + pnpm workspaces:

```
car-parts/
├── apps/
│   ├── web/                  ← Next.js (current repo, reorganized)
│   │   └── src/app/
│   │       ├── (seller)/     ← seller web UI
│   │       ├── (buyer)/      ← buyer marketplace UI
│   │       ├── (ops)/        ← ops dashboard UI
│   │       └── api/          ← all API routes
│   ├── seller-app/           ← Expo React Native
│   └── buyer-app/            ← Expo React Native
├── packages/
│   ├── types/                ← shared TypeScript types + Zod schemas
│   ├── api-client/           ← typed fetch wrappers used by all 5 frontends
│   └── db/                   ← Prisma client (imported by web only)
├── turbo.json
└── pnpm-workspace.yaml
```

### Backend

- **Single Next.js API** with namespaced routes:
  - `/api/seller/*` — seller-only endpoints, requires SELLER role
  - `/api/buyer/*` — buyer-facing endpoints, requires BUYER role (or public)
  - `/api/ops/*` — internal endpoints, requires ADMIN role
- **Single PostgreSQL database** — all three systems read/write the same data
- **Role-based auth middleware** enforces access at every route

### Auth Strategy

| Platform | Mechanism |
|---|---|
| Web (all 3 systems) | NextAuth v5 cookie sessions |
| Mobile (Seller + Buyer apps) | JWT tokens stored in Expo SecureStore, refresh rotation |
| Mobile biometrics | FaceID / fingerprint unlock via Expo LocalAuthentication |

### Infrastructure

- **File storage:** S3 or Cloudflare R2. Mobile apps upload photos/videos directly via presigned URLs (no proxying through Next.js).
- **Push notifications:** Expo Push Notification Service (wraps APNs + FCM).
- **Payments:** Stripe + Stripe Connect for seller payouts.
- **AI:** Anthropic Claude API (vision + text) for condition assessment, pricing, search, moderation.
- **Shipping:** Multi-carrier rate shopping (UPS/FedEx/USPS) with auto-routing by weight.

---

## System 1 — Seller App

### Camera & Media Capture
- Multi-photo session with overlay guides showing what to capture (front, back, defects)
- Auto-enhance: brightness/contrast correction for part photos
- Background removal to isolate the part from surroundings
- Short video walkthrough recording (up to 30 seconds)
- VIN barcode scanner using device camera + torch
- QR code scanner for bin/shelf location labels
- Offline draft mode: capture media without internet, sync when connected
- Direct S3 upload via presigned URLs from mobile (no server proxy)
- Bulk photo upload with drag-to-reorder and primary photo selection (web)

### Listing & Inventory
- **AI part identification** from photos: part type, condition, compatible vehicles, confidence score
- **AI condition grading** (A/B/C) from photos with per-defect list and severity
- **AI price suggestion**: low/suggested/high range with reasoning, based on grade + market comps
- OEM part number + Hollander interchange number fields
- YMM compatibility tagging (multi-vehicle per part)
- **Bulk listing**: VIN decode → AI generates all harvestable parts at once, seller selects + sets grades
- 200+ standardized part type categories
- Storage location field (row / bin / shelf) for in-yard lookup
- Part status lifecycle: Draft → Active → Reserved → Sold → Inactive
- Inventory table: sortable by views, age, grade, price
- Aging alerts: flag listings unsold after 30/60/90 days with suggested price reduction
- Bulk actions: activate, deactivate, reprice, delete
- Scan part QR code on mobile → jump directly to its listing
- CSV export of full inventory (web)
- REST API sync with external yard management systems: AMS, Pinnacle, etc. (web)

### Donor Vehicle & Yard
- Register donor vehicle via VIN scan or manual YMM entry
- NHTSA VIN decode: year/make/model/trim/engine auto-populated
- Track vehicle dismantling status: whole → partial → stripped
- Parts harvested vs. parts remaining checklist per vehicle
- Vehicle photo set: exterior, interior, odometer, damage (mobile)
- Visual yard map: rows and bays, click to see parked vehicles (web)
- Assign storage locations to parts
- Print QR label for each part or bin (web, to label printer or PDF)
- Inventory audit mode: scan parts to confirm stock levels (mobile)

### Orders & Fulfillment
- Push notification on new order placed
- Accept or reject order with reason
- Order detail: buyer info, parts, shipping address, special notes
- Mark as shipped: enter tracking number and carrier
- Print shipping label via UPS/FedEx/USPS shipping API (web)
- Rate-shop: compare shipping costs across carriers before purchasing label
- Auto-route: parcel/ground/LTL selection based on part weight

### Returns & Disputes
- Return request queue with buyer photos and stated reason
- Accept or reject return with seller written response
- 90-day warranty window enforcement (system blocks return requests after expiry)
- Auto-escalate to Ops if unresolved after 48 hours
- Stripe refund issued automatically on return acceptance

### Communication
- Buyer-seller direct messaging per listing
- Push notification on new message (mobile)
- Message templates: pre-written responses for common questions
- Offer negotiation: buyer sends offer, seller accepts/counters/declines
- Auto-responder: set away message with estimated return time (web)

### Notifications (all events)
New order · Buyer message · Return request · Review posted · Listing view milestone · Payout sent · Inventory aging alert

### Financials & Analytics
- Earnings dashboard: gross revenue, platform fee, net earnings
- Pending vs. available balance (Stripe Connect)
- Payout history with dates and amounts
- Instant payout request (Stripe Instant Payout) (web)
- Annual 1099-K tax document download (web)
- Revenue by day/week/month/year
- Top-selling part types
- View-to-sale conversion rate per listing
- AI price optimization suggestions: "Lower by $10 — 3x more likely to sell"
- Buyer geography heatmap (web)
- Competitor price comparison by part type (web)
- Seller performance score: response time, ship time, return rate

### Seller Profile & Trust
- Public seller profile: name, location, description, logo
- Star rating + review count
- Seller tier badges: New / Verified / Top Rated / Power Seller
- Business hours and average response time displayed
- Shipping options: will-call pickup / local delivery / ship-only
- Business license upload for yard verification (web)
- Stripe identity verification for payouts (web)
- Return policy and shipping policy configuration (web)
- Holiday mode: pause store with auto-reply (web)

---

## System 2 — Buyer Marketplace

### Discovery & Search
- Year / Make / Model / Trim cascading selector
- VIN scan on mobile: camera scans VIN → auto-fills vehicle for search
- "My Garage" shortcut: saved vehicles, one-tap search pre-filtered to that vehicle
- OEM part number and Hollander interchange number exact-match search
- Natural language search (AI): "front bumper for 2015 Camry XSE" → structured filters
- Part type category tree browse (web)
- Filters: condition grade, price range, seller location + radius, seller rating, ships-to-state, local pickup
- Sort: newest, price low-high, closest, best match

### Part Detail & Evaluation
- Full photo gallery (swipe on mobile, lightbox on web)
- Video walkthrough player
- Condition grade with visual explanation of what A/B/C means
- AI-generated defect list from listing photos
- Vehicle compatibility list
- OEM part number + Hollander interchange reference
- Donor vehicle details (year/make/model/mileage if provided)
- Seller info: rating, location, response time, tier badge
- Price history chart: recent sold prices for this part type and grade
- "Is this a fair price?" — AI comparison to market range
- Similar listings from other sellers for price comparison
- Compatibility checker: "Does this fit my [saved vehicle]?"
- Shipping cost estimate by buyer zip code
- Estimated delivery date range
- Buyer protection badge showing return window and dispute coverage

### Cart & Checkout
- Multi-seller cart with items grouped by seller
- Per-seller shipping cost with carrier selection
- Quantity adjustment for parts with quantity > 1
- Save for later / move to watchlist
- Stock reservation: hold part for 30 minutes during checkout flow
- Promo / coupon code field
- Saved shipping addresses with default
- Payment: Stripe credit/debit, Apple Pay (mobile), Google Pay
- Order summary: subtotal, shipping, platform fee, total
- Biometric payment confirmation on mobile (FaceID / fingerprint)
- Guest checkout — no account required

### Post-Purchase
- Order status timeline: Placed → Confirmed → Shipped → Delivered
- Carrier tracking number with deep link to carrier tracking page
- Push notification: "Your part shipped" and "Out for delivery"
- Email confirmation at each status change
- Contact seller directly from order detail page
- Return request: select reason, attach photos, describe issue
- 90-day return window
- Dispute escalation if seller unresponsive after 48 hours
- Post-delivery review: 1-5 stars + text (verified purchase badge)
- Flag/report a listing for fraud or misrepresentation

### My Garage & Saved Items
- Save up to 5 vehicles (by YMM or VIN scan)
- One-tap "Find parts for this car" from garage
- Compatibility auto-filter: search results pre-filtered to saved vehicle
- Parts shopping list per vehicle (buyer-maintained list of needed parts)
- Watchlist: save parts to monitor
- Price drop alert: notify when a watchlisted part drops in price
- Saved searches with optional email/push alert for new matches
- "Part found" alert when a searched-for part type becomes newly available

### Communication & Account
- Direct message seller about a listing
- Make an offer below asking price
- Push notification on seller reply
- Pre-built question templates for common buyer questions
- Profile: name, email, phone, avatar
- Saved addresses and saved payment methods
- Notification preferences: email / push / SMS per event type
- Full order history with reorder shortcut
- Account deletion + data export (GDPR/CCPA)

---

## System 3 — Ops Dashboard

### Real-Time Platform Overview
- Live order volume: today / this week / this month
- GMV and platform revenue vs. prior periods
- Active sellers, active buyers, new signups today
- Open disputes with average resolution time
- Parts listed today and parts sold today
- System alerts: failed payments, API errors, abnormal return rate spikes

### Business Intelligence
- Revenue by part type, seller, and region over time
- Search terms with zero results (reveals demand gaps)
- Conversion funnel: search → view → cart → purchase
- Buyer retention and repeat purchase rate
- Seller cohort analysis: retention by signup month
- AI anomaly detection: flag unusual spikes in chargebacks or return rates

### Order Operations
- Full order list: all sellers, all statuses, filterable and searchable
- Order detail: buyer, seller, parts, payment, full timeline
- Manual status override for stuck orders
- Full and partial refund processing with reason logging
- Cancel order with automated buyer/seller notification
- Alert queue: orders stuck in pending for more than 48 hours

### Dispute Resolution
- Dispute queue with SLA countdown per case
- Unified view: full conversation, photos, and order history in one panel
- Ops decision: side with buyer / side with seller / split
- Force-refund buyer or release funds to seller
- Dispute outcome logging for pattern analysis
- AI dispute summary: key facts extracted, recommended resolution suggested

### User Management — Sellers
- Seller list: search by name/email/location, filter by tier/status
- Seller profile view: all listings, orders, reviews, disputes, earnings history
- Approve, suspend, or ban seller accounts
- Verify seller: review uploaded business license and identity documents
- Seller scorecard: ship time, response rate, return rate, star rating
- Tier management: assign Standard / Verified / Top Rated / Power Seller
- Stripe Connect status and payout history per seller

### User Management — Buyers
- Buyer list with search and filter by order count / dispute history
- Buyer profile: order history, messages, disputes, flagged activity
- Suspend or ban abusive buyer accounts
- View any buyer conversation (read-only, for support)
- Flag buyers with excessive returns or chargebacks

### Listing Moderation
- Flagged listings queue: reported by buyers or auto-flagged by AI
- Approve or reject listing with reason sent to seller
- AI auto-flag: counterfeit part numbers, misleading descriptions
- AI photo quality check: flag blurry or incomplete photo sets
- Bulk moderation: approve/reject multiple listings at once
- New seller hold: first 5 listings from new sellers require review before going live

### Fraud Detection
- AI duplicate listing detection: same part listed multiple times
- AI price anomaly: listing priced far below or above market
- Chargeback rate monitoring per seller (Stripe webhook alerts)
- Velocity checks: flag if seller lists 50+ parts within one hour
- Stripe Radar payment fraud signals
- Blacklisted email / IP / device fingerprint registry

### Financial Operations
- Platform fee collection: total fees by day/month/year
- Fee rate management: adjust platform % by seller tier
- Refund impact: total refunded vs. collected
- Stripe Connect overview: all seller account balances
- Revenue forecast based on pipeline
- 1099-K generation for sellers over IRS threshold
- Transaction log export (CSV/PDF) for audits
- GDPR/CCPA data deletion request queue
- Sales tax nexus tracking by state

### Growth & Marketing
- Boost listings to top of search (paid or ops-curated)
- Discount codes: percentage off, flat amount, free shipping
- Flash sales: time-limited promotions for specific part types
- New seller welcome bonus: fee waiver for first N sales
- Email campaign management: segment by user behavior
- Seller onboarding checklist: track % complete, send nudges at stalled steps
- Push notification broadcasts (system-wide announcements)
- SEO performance: indexed pages, top search queries, click-through rates
- API partner dashboard: usage metrics by yard management system integration

### Support & Platform Config
- View any order, listing, or conversation as ops agent
- Read-only user impersonation for debugging support tickets
- Send manual notification to any user (email or in-app)
- Support ticket queue with priority and SLA tracking
- Canned response templates for common support issues
- Feature flags: toggle features on/off without a deploy
- Platform fee rate configuration
- Return window policy settings (default 90 days, adjustable)
- API health: endpoint latency and error rate monitoring
- Background job queue status (email sends, AI jobs, media processing)

---

## Data Model Notes

The existing Prisma schema covers the core models. Extensions needed:

| Addition | Reason |
|---|---|
| `StorageLocation` on `Part` | Yard bin/shelf tracking |
| `DonorVehicle.dismantleStatus` | Track harvest progress |
| `Dispute` model | Currently escalation is implicit |
| `SellerTier` enum on `User` | New/Verified/Top Rated/Power Seller |
| `Notification.channel` | Email/push/SMS preference per event |
| `FeatureFlag` model | Ops platform config |
| `DiscountCode` model | Promotions |
| `SupportTicket` model | Ops support queue |
| `FraudFlag` model | Moderation signals |
| `YardLocation` model | Visual yard map rows/bays |

---

## What's Already Built

The current Next.js codebase has significant foundation:
- Auth (NextAuth v5, credentials + Google OAuth, role-based JWT)
- Full Prisma schema: User, Part, Vehicle, Order, Review, Message, Cart, Watchlist, SavedSearch
- Part listing creation, AI identification, AI pricing, AI condition assessment
- VIN decode (NHTSA), YMM compatibility tagging
- Search with filters and pagination
- Buyer + seller dashboards, order management, messaging
- Stripe + shipping scaffolds
- Seller analytics, returns API, notifications API
- Bulk listing, price history, interchange lookup, smart search
- Seller profiles, PWA manifest, admin panel

The monorepo migration and mobile apps are greenfield. The web app reorganization into route groups is a refactor of existing code.

# Used Car Parts Marketplace — Backlog

<!--
  PRIORITY ORDER: Top = highest priority. AI loop picks the top unchecked item.
  After completing, check off with [x] and add a completion note.
  BUG: prefix = hotfix, goes to top.
  FOLLOW-UP: prefix = discovered during implementation.
  RESEARCH: prefix = needs web research before implementation.
-->

## Phase 1: Foundation & Core MVP

- [x] Project setup: Initialize Next.js 14 (App Router) + TypeScript + Tailwind CSS + PostgreSQL (via Prisma ORM) + project structure (done: Next.js 16 + Prisma 7 + Vitest + landing page)
- [x] Database schema: Design and create Prisma schema for users, parts, vehicles, orders, messages, reviews (done: 13 models with full relations, enums, indexes)
- [x] Authentication: Implement NextAuth.js with email/password + Google OAuth. Separate seller and buyer roles with role-based access (done: NextAuth v5 + credentials + Google OAuth + register API + role-based JWT)
- [x] Part listing creation: Seller form with part type, title, description, condition grade, pricing, donor vehicle, photos (done: full form + API endpoint + dashboard)
- [x] AI part identification from photos: Integrate Claude Vision API (done: /api/ai/identify-part endpoint using Claude Sonnet, returns part type, condition, compatible vehicles, confidence)
- [x] VIN decoder integration: Use free NHTSA vPIC API to decode VIN numbers (done: /api/vin/[vin] endpoint with NHTSA integration)
- [x] Year/Make/Model (YMM) compatibility tagging: Each part listing gets tagged with compatible vehicles (done: PartCompatibility model + form fields)
- [x] AI pricing suggestion: AI-powered price suggestions (done: /api/ai/suggest-price endpoint using Claude, returns low/suggested/high prices with reasoning)
- [x] Part condition grading UI: Implement ARA/URG standard A/B/C grading with visual guide (done: A/B/C selector with descriptions in listing form)

## Phase 2: Buyer Experience & Search

- [x] Part search engine: Full-text search with filters (done: search by keyword, YMM, part type, condition, price range with pagination)
- [x] Part detail page: Full photo gallery, specifications, compatibility list, seller info, condition grade (done: complete detail page with all sections)
- [x] Shopping cart and checkout: Multi-seller cart with per-seller orders, 5% platform fee (done: cart API + checkout + order creation)
- [x] Buyer dashboard: Order history with status tracking (done: orders page with success notification)
- [x] Seller dashboard: Inventory table with status/views/grade, order management (done: inventory page + seller orders view)

## Phase 3: Marketplace Infrastructure

- [ ] Stripe Connect integration: Replace basic Stripe with Connect for marketplace split payments. Seller onboarding flow, automatic payouts, platform fee collection
- [x] Messaging system: Buyer-seller messaging with conversation list and chat UI (done: APIs + conversation list + chat page with polling)
- [ ] Shipping integration: Integrate ShipEngine API for real-time shipping rates. Auto-route: small parts (<70 lbs) to parcel, medium (70-150 lbs) to ground, heavy (>150 lbs) to LTL freight. Generate shipping labels
- [x] Order management flow: Full lifecycle with valid state transitions, tracking numbers (done: PATCH /api/orders/[id]/status with role-based permissions)
- [x] Reviews and ratings: Star ratings + text + verified purchase badge (done: reviews API with stats/distribution)
- [ ] Notification system: Email + in-app notifications for: new messages, order updates, price drop alerts, part availability alerts (saved searches)

FOLLOW-UP: Watchlist and saved searches APIs + UI (done: watchlist page, saved searches API, add/remove from watchlist)

## Phase 4: AI & Differentiation

- [x] Bulk listing from vehicle: VIN decode + AI generates all harvestable parts with pricing per grade (done: bulk listing page with select/deselect, grade picker, batch creation)
- [x] Advanced AI pricing engine: Price history API with averages by grade, median, sold prices (done: /api/parts/price-history with grade breakdown)
- [x] AI condition assessment: Vision-based damage detection with credit-card-unit measurement (done: /api/ai/assess-condition with defect list, grade suggestion, confidence)
- [x] Part interchange database: AI-powered interchange lookup (done: /api/ai/interchange returns compatible vehicles for any part+vehicle combo)
- [x] Smart search with natural language: AI parses natural language queries into structured filters (done: /api/ai/smart-search + auto-fill filters on search page)

## Phase 5: Growth & Operations

- [x] SEO-optimized part pages: OpenGraph metadata, product meta tags, dynamic sitemap.xml (done: part layout with generateMetadata + sitemap.ts)
- [x] Mobile-responsive PWA: PWA manifest added, theme color, viewport meta (done: manifest.json + layout metadata)
- [x] Seller analytics dashboard: Revenue, views, conversion rate, aging inventory alerts, top parts (done: analytics API + dashboard page)
- [ ] Logistics coordination: Offer pickup/delivery scheduling. Integrate with uShip for freight marketplace quotes on heavy parts. Show delivery time estimates
- [ ] Warranty and returns management: Configurable warranty per listing (30/60/90 day). Return request flow with photo evidence. Dispute resolution system
- [x] Admin panel: Platform stats dashboard with user/order/listing counts (done: admin API + dashboard page with stats grid and recent activity)

## Phase 6: Scale & Ecosystem

- [ ] API for yard management systems: REST API for junkyards to sync inventory from their existing systems (Checkmate, Pinnacle, etc.). CIECA standard compliance
- [ ] Multi-language support: i18n framework with English and Spanish to start. Translate all UI strings, support bilingual listings
- [x] Yard profile pages: Public seller profiles with inventory, ratings, location (done: /sellers/[id] page + API)
- [x] Price history and market trends: Market pricing data by part type with grade breakdown (done: included in price-history API)
- [x] Saved vehicle garage: Buyers save vehicles, quick "Find Parts" link pre-fills search (done: garage API + page with add/remove/search)

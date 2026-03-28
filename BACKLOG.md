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

## Phase 4: AI & Differentiation

- [ ] Bulk listing from vehicle: Seller enters VIN or selects vehicle, system shows all common harvestable parts for that vehicle. Seller checks off which parts they have, uploads batch photos, AI pre-fills all listings at once
- [ ] Advanced AI pricing engine: Build ML model trained on marketplace transaction data + eBay sold data. Factor in: part type, condition, supply/demand in region, seasonal trends, vehicle popularity. Show "market value" badge on fairly-priced parts
- [ ] AI condition assessment: Computer vision model that analyzes part photos to: detect scratches/dents/rust/cracks, measure damage area (credit-card-unit system), auto-suggest A/B/C grade with confidence score, flag misrepresented conditions
- [ ] Part interchange database: Build compatibility database mapping interchangeable parts across vehicles. Start with crowdsourced data + AI extraction from repair manuals. Show "also fits" on listings
- [ ] Smart search with natural language: Allow buyers to search in plain English: "driver side headlight for 2018 Honda Civic" or "transmission that fits my car" (with saved vehicle). AI parses intent and returns relevant results

## Phase 5: Growth & Operations

- [ ] SEO-optimized part pages: Server-side rendered pages with structured data (Schema.org/Product). URL structure: /parts/{year}/{make}/{model}/{part-type}. Sitemap generation
- [ ] Mobile-responsive PWA: Optimize entire app for mobile. Add PWA manifest for home screen install. Camera integration for quick photo capture on mobile
- [ ] Seller analytics dashboard: Detailed analytics: views per listing, search impression data, conversion funnel, pricing competitiveness score, inventory aging alerts
- [ ] Logistics coordination: Offer pickup/delivery scheduling. Integrate with uShip for freight marketplace quotes on heavy parts. Show delivery time estimates
- [ ] Warranty and returns management: Configurable warranty per listing (30/60/90 day). Return request flow with photo evidence. Dispute resolution system
- [ ] Admin panel: Platform admin dashboard: user management, listing moderation, reported content review, platform analytics, fee configuration

## Phase 6: Scale & Ecosystem

- [ ] API for yard management systems: REST API for junkyards to sync inventory from their existing systems (Checkmate, Pinnacle, etc.). CIECA standard compliance
- [ ] Multi-language support: i18n framework with English and Spanish to start. Translate all UI strings, support bilingual listings
- [ ] Yard profile pages: Public junkyard profile with: inventory count, location/map, hours, ratings, specialties (e.g., "Japanese imports", "trucks"), verified badge
- [ ] Price history and market trends: Show price trend charts for common parts. "Average selling price for [part] over last 90 days." Help sellers price competitively
- [ ] Saved vehicle garage: Buyers save their vehicles. All search results auto-filter to compatible parts. "Parts for your 2018 Civic" personalized homepage

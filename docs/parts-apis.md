# Parts Data Sources, APIs & Collection Methods

How to get live used-parts inventory into the database — from free public APIs to scraping to licensed data feeds.

---

## TL;DR — What Works Today

| Method | Works now? | Data | Effort |
|--------|-----------|------|--------|
| `npm run import:ebay` | After 5-min setup | Live eBay listings with prices, images, fitment | Low |
| `npm run scrape:row52` | Yes, no setup | LKQ yard vehicle inventory (51 yards, 47k vehicles) | Low |
| Pull-A-Part API (reverse-eng) | Yes, with DevTools step | Parts + pricing from 80+ yards | Medium |
| LKQ Drop Ship API | After business agreement | 9M salvage + 90K aftermarket parts | High |
| Car-Part.com | **No** — do not scrape | — | — |

---

## 1. eBay Browse API (Best Option)

**Script:** `scripts/import-ebay-parts.ts`  
**Docs:** https://developer.ebay.com/api-docs/buy/browse/overview.html

The richest freely accessible used parts data source. 80M+ active listings, millions of which are used auto parts. Official API with clear ToS.

### Setup (5 minutes)

1. Register at https://developer.ebay.com (free)
2. Create an application → copy **Client ID** and **Client Secret**
3. Add to `.env.local`:
   ```
   EBAY_CLIENT_ID=your_client_id_here
   EBAY_CLIENT_SECRET=your_client_secret_here
   EBAY_SANDBOX=false
   ```

### Run

```bash
# Dry run — see what would be imported without writing to DB
npm run import:ebay:dry

# Import 100 used parts (default query: "used auto parts")
npm run import:ebay

# Import engine parts specifically
npm run import:ebay -- --category 33559 --limit 200

# Import by keyword
npm run import:ebay -- --query "honda civic alternator" --limit 50

# Scrape multiple categories in sequence
for cat in 33559 33743 33560 33587 33549 33566; do
  npm run import:ebay -- --category $cat --limit 200
done
```

### eBay Motors Category IDs

```
33637  Car & Truck Parts & Accessories (top level)
33559  Engines & Engine Parts
33743  Transmission & Drivetrain
33560  Brakes & Brake Parts
33587  Suspension & Steering
33549  Electrical & Ignition
33554  Heating, Cooling & Climate
33566  Lighting & Lamps
33664  Interior Parts & Accessories
33640  Exterior Parts & Accessories
262989 Electric, Hybrid & PHEV Parts  (eBay's newest top-level)
```

### What Gets Imported Per Listing

- `title`, `price`, `condition` → `conditionGrade`
- `partType` — inferred from eBay category + keyword matching in title
- `images` — primary + up to 4 additional images
- `description` — shortDescription + condition notes + original eBay URL
- `partNumber` = `EBAY-{itemId}` (used to detect duplicates)
- A `User` record is created per unique eBay seller username

### API Technical Details

**Search endpoint:**
```
GET https://api.ebay.com/buy/browse/v1/item_summary/search
  ?q={query}
  &category_ids={id}
  &filter=conditionIds:{3000|4000|5000|6000},itemLocationCountry:US
  &limit=200
  &offset=0
```

**Pagination cap:** 10,000 items per query (200 per page × 50 pages).  
To get more, slice by subcategory, price band, or condition bucket.

**Compatibility filter** (filter by Year/Make/Model):
```
compatibility_filter=Year:2018;Make:Honda;Model:Civic;Trim:EX
```

**Feed API** (bulk daily/hourly snapshots — requires eBay approval):
```
GET https://api.ebay.com/buy/feed/v1/item?feed_scope=NEWLY_LISTED&category_id=33637&date=20260401
```
Returns a gzip TSV of all new listings in a category on a given day. Apply at developer.ebay.com under "Feed API" access.

**Rate limits:**
- Default production: 5,000 search calls/day
- Feed API: separate limit (higher, but approval needed)
- Request increases free via the "Application Growth Check" process

### ToS Key Points

- ✅ Displaying listings with eBay attribution is permitted
- ✅ Caching data for reasonable periods (with clear timestamps) is permitted
- ❌ Bulk storage for a competing marketplace is not permitted
- ❌ Training AI models on eBay data without written consent (new 2025 rule)
- ❌ Storing seller personal data beyond what's needed

**Legal risk: LOW** when using the official API with attribution.

---

## 2. Row52 / LKQ Pick-n-Pull Scraper

**Script:** `scripts/scrape-row52.ts`  
**Source:** https://row52.com  
**Coverage:** 51 LKQ Pick-n-Pull yards, ~47,887 vehicles on lot at any time

Self-service salvage yard inventory. Row52 uses GET-based server-rendered HTML — no JavaScript rendering needed. No `robots.txt` restrictions found.

### Run

```bash
# Dry run — see vehicles without writing to DB
npm run scrape:row52:dry

# Scrape first 3 pages (~90 vehicles) of all yards
npm run scrape:row52

# Scrape by make/model
npm run scrape:row52 -- --make Honda --model Civic --year 2015 --pages 5

# Scrape by zip code (nearby yards)
npm run scrape:row52 -- --zip 90210 --distance 50 --pages 10
```

### URL Structure (Discovered)

```
https://row52.com/Search?Page=1&MakeId=0&ModelId=0&Year=&Sort=DateAdded
  &SortDirection=desc&Distance=0&ZipCode=&HasImage=&HasComment=
  &LocationId=0&YMMorVIN=&IsVin=false
```

Every parameter is a GET query string — fully crawlable.

### What Gets Created

- `Vehicle` records (year/make/model/VIN) for each yard vehicle
- `Part` records with `status=DRAFT` linked to each vehicle
- Drafts won't show in search until a real seller activates them with part-specific details
- Draft `title` = `"{year} {make} {model} — Available at {yard} (Row {X})"`

### Data Available Per Vehicle

- year, make, model, VIN
- Yard name, city, state
- Row number on lot
- Date added to yard
- Photo thumbnail URL

### Legal Risk: LOW-MEDIUM

No `robots.txt` restrictions. LKQ corporate ToS applies to commercial use — review before scaling. A polite rate (1.2s between requests) is built into the script.

---

## 3. Pull-A-Part (Reverse-Engineered API)

**Coverage:** 80+ Pull-A-Part yards across the US South/Midwest  
**Source:** https://www.pullapart.com/inventory/search/

Pull-A-Part's site is a React SPA that loads data from exposed internal microservice URLs. These were found directly in the page source:

```
https://inventoryservice.pullapart.com      ← vehicle/part search
https://externalinterchangeservice.pullapart.com  ← interchange lookup
https://pricingcalc-services.pullapart.com  ← pricing data
https://imageservice.pullapart.com          ← part photos
```

### How to Reverse-Engineer the Exact Endpoints

1. Open https://www.pullapart.com/inventory/search/ in Chrome
2. Open DevTools → Network tab → filter by "Fetch/XHR"
3. Search for a Honda Civic alternator
4. Find the request to `inventoryservice.pullapart.com` — copy the full URL + headers
5. Replicate in the script

**Note:** No script exists yet for this — the endpoint parameters need to be documented from a live browser session. Once confirmed, a scraper follows the same pattern as Row52.

### Data Available

- Vehicle: year/make/model, yard location, row number, date added
- Parts: category, price (from `pricingcalc-services`), fitment compatibility
- Images: part/vehicle photos from `imageservice`

### Legal Risk: MEDIUM

`robots.txt` only blocks CMS paths (Umbraco). No explicit prohibition on inventory/search paths. However, Pull-A-Part's Terms of Service should be reviewed before commercial use.

---

## 4. Copart / IAAI (Upstream Salvage Vehicle Intelligence)

**Not a parts source directly** — but tells you which salvage vehicles are entering the ecosystem before they reach yards.

**Third-party aggregator APIs (recommended over direct scraping):**

| Service | URL | Cost | Data |
|---------|-----|------|------|
| auction-api.app | https://auction-api.app | Paid subscription | Copart + IAAI, hourly updates, 3yr history |
| carstat.dev | https://carstat.dev | Paid subscription | Similar coverage |
| Apify (Copart) | https://apify.com/parseforge/copart-public-search-scraper | Per-compute | Real-time lot data |
| Apify (IAAI) | https://apify.com/easyapi/iaai-vehicle-detail-scraper | Per-compute | Real-time lot data |

**Data per auction lot:**
- VIN, year, make, model, color, odometer
- Damage description (primary: "Front End", "Rear End", "Flood", "Fire")
- Condition report (engine starts/runs, keys, airbags)
- 30+ photos per vehicle
- Sale price, branch/auction location, sale date
- Title type (Salvage, Clean, Parts Only)

**Use case:** Predict which parts will be available in 4–8 weeks as auctioned vehicles reach salvage yards. Build a pre-order or notification system.

**Legal risk: LOW** when using third-party aggregator APIs.

---

## 5. LKQ Drop Ship API (Business Partnership)

**Contact:** https://lkqcorp.com/lkq-global_about-us/north-america/drop-ship/  
**Coverage:** 9M salvage parts + 90K aftermarket collision parts, 20 US + 6 Canadian warehouses

Requires a formal business agreement (NDA, credit application, IT integration). No setup fees. Same-day fulfillment.

**What you get once approved:**
- Real-time inventory search API across full LKQ catalog
- Ordering API (submit orders directly)
- Invoice and tracking pushed to FTP server
- Monthly shipping dimension files

**Timeline to access:** Weeks (business development process).

---

## 6. Car-Part.com — Do Not Scrape

Car-Part.com has:
- **Explicit ToS prohibition** on automated access, robots, scrapers
- **Copyrighted Hollander Interchange data** — strong IP protection
- **Cloudflare WAF** with AI crawler blocking
- **CAPIS API** (B2B only) — available via formal partnership with their sales team at (859) 344-1925

**Legal risk: HIGH** for scraping. **Contact them for a partnership** if this is a priority.

### How Car-Part.com Collects Their Data

Yards don't submit directly to Car-Part. The data flows through YMS (Yard Management Software):

```
Yard dismantles vehicle
  → Enters parts in YMS (Checkmate / Hollander Powerlink / CCC Pinnacle)
  → YMS assigns Hollander Interchange Number to each part
  → YMS auto-syncs to Car-Part.com in near-real-time
  → Also syncs to: Hollander EDEN, CCC ONE, Mitchell (estimating platforms)
```

The **Hollander Interchange Number** is the universal key:
- One number = all interchangeable vehicles for that part
- Enables cross-year/cross-make search without knowing the OEM part number
- Example: "2014 Toyota Camry alternator" → Hollander number → also matches 2012–2016 Camry and 2013–2015 RAV4

---

## 7. Other Reference Data Sources

### NHTSA vPIC API (VIN Decode — Free, Already Integrated)

```
GET https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{VIN}?format=json
POST https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesBatch  (up to 50 VINs)
GET https://vpic.nhtsa.dot.gov/api/vehicles/GetAllMakes?format=json
```

Auth: none. Already implemented at `/api/vin/[vin]`.

**Note:** NHTSA goes into maintenance occasionally (returns HTML 200 instead of JSON). The route catches this and returns 503.

### TecDoc / TecAlliance (OEM Parts Catalog Cross-Reference)

**URL:** https://www.tecalliance.net | RapidAPI: https://rapidapi.com/ronhartman/api/tecdoc-catalog  
**Coverage:** 1,000+ brands, 190,000 vehicle types, 9.8 million articles  
**Use case:** Look up OEM part number for a vehicle fitment → cross-reference with used parts listings

RapidAPI has a freemium tier. Full commercial use requires a TecAlliance partnership.

### Open Datasets

| Source | URL | Usefulness |
|--------|-----|-----------|
| Kaggle — Auto Parts Dataset | https://www.kaggle.com/datasets/qubdidata/auto-parts-dataset | Low (no pricing) |
| GitHub — car-api (1,200+ part names) | https://github.com/lifeofcapo/car-api | Medium (taxonomy reference) |
| GitHub — car_part_scraper | https://github.com/chung-chris-zz/car_part_scraper | Reference only (Car-Part.com — legal risk) |

None contain salvage pricing data. Primarily useful as taxonomy/CV training references.

---

## Legal Summary

| Source | CFAA Risk | Contract / ToS Risk | IP / Copyright Risk | Verdict |
|--------|-----------|--------------------|--------------------|---------|
| eBay (official API) | None | Low | Low | ✅ Use it |
| Row52 | Low | Low-Med | Low | ✅ Use it politely |
| Pull-A-Part (reverse API) | Low | Medium | Low | ⚠️ Review ToS first |
| Copart/IAAI (3rd party API) | None | Low | Low | ✅ Use 3rd party |
| Car-Part.com | Low (public) | **High** | **High (Hollander)** | ❌ Partner instead |
| LKQ Drop Ship | None | None (contracted) | None | ✅ After agreement |

**Legal precedent:** *hiQ v. LinkedIn* (9th Cir. 2022) held that scraping publicly accessible data (no login) does not violate the CFAA. However, it does **not** protect against breach of contract (ToS) or copyright infringement — both of which apply to Car-Part.com's Hollander data.

---

## Recommended Collection Strategy

**Phase 1 — Start today:**
1. Register eBay Developer → run `npm run import:ebay` → thousands of real listings immediately
2. Run `npm run scrape:row52` → 47K+ LKQ yard vehicles as draft listings

**Phase 2 — Next week:**
3. Reverse-engineer Pull-A-Part's `inventoryservice.pullapart.com` via DevTools
4. Implement Pull-A-Part scraper (same pattern as Row52)
5. Subscribe to `auction-api.app` for Copart/IAAI upstream intelligence

**Phase 3 — Business development:**
6. Apply for LKQ Drop Ship partnership — access to 9M parts with ordering API
7. License TecDoc for OEM cross-reference data
8. Contact Car-Part.com sales for CAPIS API access

# Parts Data Sources & APIs

Reference for importing live parts inventory, VIN decoding, and understanding how the major used-parts aggregators collect their data.

---

## Public APIs (No Business Agreement Required)

### 1. NHTSA vPIC API — VIN Decoding
**URL:** https://vpic.nhtsa.dot.gov/api/  
**Auth:** None. Completely free and open.  
**Use case:** Decode a VIN to get make, model, year, body style, engine, GVWR, plant country (~100+ fields per VIN).

**Key endpoints:**
```
GET /vehicles/DecodeVinValues/{VIN}?format=json
  → flat key-value response; fastest to parse

GET /vehicles/DecodeVin/{VIN}?format=json
  → returns ~100 Variable/Value pairs

POST /vehicles/DecodeVinValuesBatch
  → batch decode up to 50 VINs in one call; body: "5UXWX7C5*BA,2011;..."

GET /vehicles/GetAllMakes?format=json
  → full make list

GET /vehicles/GetModelsForMake/{make}?format=json
  → all models for a given make
```

**Rate limits:** Not documented as hard numbers; designed for high-volume research use.  
**Current status:** vPIC undergoes periodic maintenance windows (returns HTML 200 instead of JSON during maintenance — detect by catching JSON parse errors and returning 503).

---

### 2. eBay Browse API — Live Used Parts Listings
**URL:** https://developer.ebay.com/api-docs/buy/browse/overview.html  
**Auth:** OAuth 2.0 Application token (Client Credentials flow — no user login, no seller account required). Register free at https://developer.ebay.com  
**Use case:** Search eBay's 80M+ active listings, millions of which are used auto parts. **This is the best fully public API for live used parts data.**

**Key endpoint:**
```
GET https://api.ebay.com/buy/browse/v1/item_summary/search

Parameters:
  q=2015+honda+accord+alternator   (keyword)
  category_ids=33637                (Car & Truck Parts & Accessories under eBay Motors)
  filter=conditionIds:{3000}        (3000 = Used)
  filter=itemLocationCountry:US
  compatibility_filter=Year:2015,Make:Honda,Model:Accord   (YMM filter)
  limit=50
  offset=0
```

**Response per listing includes:**
- Item title, price, condition
- Seller info (username, feedback score)
- Item location (city/state)
- Primary image URL
- eBay item ID
- Listing end date
- Shipping options
- Part compatibility list (Year/Make/Model fitment data)

**eBay Motors category IDs:**
```
6000    = eBay Motors (top level)
33637   = Car & Truck Parts & Accessories
179799  = Engines & Engine Parts
33743   = Transmission & Drivetrain
33560   = Brakes & Brake Parts
33587   = Suspension & Steering
33549   = Electrical & Ignition
33554   = Heating, Cooling & Climate
33566   = Lighting & Lamps
33664   = Interior Parts & Accessories
33640   = Exterior Parts & Accessories
262989  = Electric, Hybrid & PHEV Parts  (eBay's newest top-level)
```

**Taxonomy API** (to enumerate all subcategories):
```
GET https://api.ebay.com/commerce/taxonomy/v1/category_tree/100/get_category_subtree?category_id=33637
```

**Docs:**
- Browse API: https://developer.ebay.com/api-docs/buy/browse/overview.html
- Vehicle Parts guide: https://partnerhelp.ebay.com/helpcenter/s/article/Using-Buy-APIs-to-retrieve-Vehicle-Parts-Accessories

---

## Gated APIs (Business Agreement Required)

### 3. LKQ Drop Ship API — 9M Salvage + 90K Aftermarket Parts
**URL:** https://lkqcorp.com/lkq-global_about-us/north-america/drop-ship/  
**Auth:** Partnership agreement required (NDA, data usage agreement, tax certification, credit application).  
**Use case:** Access to LKQ's real-time inventory — ~9 million salvage parts + 90,000 aftermarket collision parts across 20 US + 6 Canadian warehouses. Same-day fulfillment before 3pm. No API setup fees.

**Requirements to qualify:**
- Active automotive website
- Located in continental US or Canada
- IT resources for integration
- Contact: Fred McGhee via the link above

**What you get:**
- Real-time inventory search API
- Ordering API
- Invoice and tracking pushed to your FTP server
- Monthly shipping dimension files

---

### 4. Hollander / Solera EDEN — 160M Parts from 3,000 Recyclers
**URL:** https://www.hollandersolutions.com/products/ | API gateway: https://na.api.solera.com/  
**Auth:** OAuth 2.0 via Solera API gateway. Login required — no open developer tier. Partnership/contract basis.  
**Use case:** Access Hollander's EDEN network, which aggregates inventory from ~3,000 recyclers who run Hollander Powerlink YMS. Includes full Hollander Interchange cross-reference.

**Note:** Hollander Interchange data is also available as a licensed database download (separate from the live inventory API).

---

### 5. TecDoc / TecAlliance — OEM Parts Catalog Cross-Reference
**URL:** https://www.tecalliance.net/tecdoc-catalogue/ | RapidAPI: https://rapidapi.com/ronhartman/api/tecdoc-catalog  
**Auth:** Partnership for full commercial use; RapidAPI has a freemium tier.  
**Use case:** Look up the OEM part number for a specific vehicle fitment. TecDoc covers 1,000+ brands, 190,000 vehicle types, 9.8 million articles. Use to cross-reference used parts against OEM catalog data.

---

### 6. RepairPal Fair Price API — Labor + Parts Cost Estimates
**URL:** https://pages.repairpal.com/partners  
**Auth:** Partnership-based access only.  
**Use case:** Returns "fair price" repair cost ranges (parts + labor) by ZIP code. Not a parts inventory source — useful for showing buyers whether a part's price is reasonable relative to the total repair cost.

---

## Closed Ecosystems (No Developer Access)

### Car-Part.com
**URL:** https://www.car-part.com | Pro: https://pro.car-part.com  
**API:** None. No public REST API, no self-serve developer portal.

Car-Part.com aggregates 200M+ parts from 4,200+ recyclers. It is a **closed B2B ecosystem** — data flows from YMS software (not from individual yards directly).

**How salvage yards get on Car-Part.com:**
1. Yard uses a supported YMS: Checkmate, Hollander Powerlink, Pinnacle, AIM Systems, Isoft, Autoskill, or compatible system
2. As parts are entered into the YMS (barcoded at dismantling), the YMS automatically pushes the inventory to Car-Part.com
3. Updates are near-real-time — sold parts are removed promptly
4. No manual upload or special format required; all flows through YMS integration

**Products:**
- **Car-Part.com** (consumer): Search by zip, returns nearby yards with phone numbers
- **Car-Part Pro** (professional shops): Real-time pricing, delivery times, warranty terms, recycler certifications. Free for body shops. Integrates into Mitchell and CCC ONE estimating software via iPro
- **Checkmate YMS**: Car-Part's own yard management software — the dominant YMS feeding Car-Part.com
- **Car-Part Exchange**: Recycler-to-recycler parts trading network

---

### Row52 (Pick-n-Pull / LKQ)
**URL:** https://row52.com  
**API:** None. Web UI only.  
**Note:** ~47,887 vehicles across 51 Pick-n-Pull yards (an LKQ subsidiary). Self-service yards — customers search online for vehicles then physically pull parts. No developer path.

---

### CCC TRUE Parts Network
**URL:** https://www.cccis.com/parts-suppliers/recyclers  
**API:** None public. B2B collision estimating network only.  
**Note:** Recyclers with Hollander Powerlink or CCC Pinnacle YMS can publish live inventory into CCC ONE estimating software. Appraisers see recycled parts pricing while writing collision estimates. Closed network — access only through YMS partnership.

---

## How the Industry Data Flow Works

```
Salvage Yard dismantles vehicle
        ↓
Enters parts into YMS (Checkmate / Powerlink / Pinnacle)
YMS barcodes each part with Hollander Interchange Number
        ↓
YMS automatically syncs to:
  ├─ Car-Part.com (via Car-Part integration)
  ├─ Car-Part Pro (for body shops / appraisers)
  ├─ Hollander EDEN network (recycler-to-recycler)
  ├─ CCC TRUE Parts Network (insurance estimating)
  └─ eBay (via eLink / Hollander eBay module)
        ↓
Buyer searches via:
  ├─ Car-Part.com or Car-Part Pro
  ├─ Hollander HollanderParts.com
  ├─ eBay Motors
  └─ Mitchell / CCC ONE (insurance appraisers)
```

**The Hollander Interchange Number is the universal key:**
- Every part gets a Hollander number when entered into the YMS
- One Hollander number = all vehicles with an interchangeable part
- "2014 Toyota Camry alternator" → Hollander looks up the number → finds all 2012–2016 Camry and 2013–2015 RAV4 alternators at every yard in the network
- This enables cross-year/cross-make search without the buyer knowing the OEM part number

---

## Practical Recommendation for This Marketplace

| Goal | Best Option |
|------|------------|
| Show live used parts listings today | **eBay Browse API** — free, no agreement, millions of parts |
| VIN decode for donor vehicle | **NHTSA vPIC** — free, no auth, batch support |
| Wholesale supplier integration | **LKQ Drop Ship** — apply for partnership, 9M parts |
| OEM part number lookup / cross-reference | **TecDoc via RapidAPI** — freemium tier available |
| Full salvage yard inventory access | **Hollander/Solera EDEN** — requires Solera partnership |
| Collision shop integration | **CCC TRUE Parts** — requires Hollander Powerlink / CCC Pinnacle YMS |

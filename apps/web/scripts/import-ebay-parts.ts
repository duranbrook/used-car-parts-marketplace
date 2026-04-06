/**
 * eBay Browse API → Database importer
 *
 * Searches eBay Motors Parts & Accessories for Used listings and imports
 * them as Part records. Creates one system "eBay Import" seller per run.
 *
 * Setup:
 *   1. Register at https://developer.ebay.com (free)
 *   2. Create an application → copy Client ID + Client Secret
 *   3. Add to .env.local:
 *        EBAY_CLIENT_ID=your_client_id
 *        EBAY_CLIENT_SECRET=your_client_secret
 *        EBAY_SANDBOX=false          # true for sandbox, false for production
 *
 * Usage:
 *   npx tsx scripts/import-ebay-parts.ts
 *   npx tsx scripts/import-ebay-parts.ts --query "honda civic alternator" --limit 50
 *   npx tsx scripts/import-ebay-parts.ts --category 33559 --limit 200  # Engine parts
 *
 * eBay Motors Parts & Accessories category IDs:
 *   33637 — Car & Truck Parts & Accessories (top level)
 *   33559 — Engines & Engine Parts
 *   33743 — Transmission & Drivetrain
 *   33560 — Brakes & Brake Parts
 *   33587 — Suspension & Steering
 *   33549 — Electrical & Ignition
 *   33554 — Heating, Cooling & Climate
 *   33566 — Lighting & Lamps
 *   33664 — Interior Parts & Accessories
 *   33640 — Exterior Parts & Accessories
 *   262989 — Electric, Hybrid & PHEV Parts
 *
 * Docs: https://developer.ebay.com/api-docs/buy/browse/overview.html
 */

import { PrismaClient, PartType, ConditionGrade } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ─── Config ────────────────────────────────────────────────────────────────

const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;
const SANDBOX = process.env.EBAY_SANDBOX === "true";

const BASE_URL = SANDBOX
  ? "https://api.sandbox.ebay.com"
  : "https://api.ebay.com";

const AUTH_URL = SANDBOX
  ? "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
  : "https://api.ebay.com/identity/v1/oauth2/token";

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (name: string, def: string) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : def;
};

const QUERY = getArg("query", "used auto parts");
const CATEGORY_ID = getArg("category", "33637"); // Car & Truck Parts & Accessories
const LIMIT = Math.min(parseInt(getArg("limit", "100")), 200);
const DRY_RUN = args.includes("--dry-run");

// ─── eBay API types ─────────────────────────────────────────────────────────

interface EbayTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface EbayItemSummary {
  itemId: string;
  title: string;
  price?: { value: string; currency: string };
  condition?: string;
  conditionId?: string;
  image?: { imageUrl: string };
  additionalImages?: { imageUrl: string }[];
  shortDescription?: string;
  seller?: { username: string; feedbackScore: number; feedbackPercentage: string };
  itemLocation?: { city: string; stateOrProvince: string; postalCode: string; country: string };
  categories?: { categoryId: string; categoryName: string }[];
  itemWebUrl?: string;
  buyingOptions?: string[];
  leafCategoryIds?: string[];
}

interface EbaySearchResponse {
  itemSummaries?: EbayItemSummary[];
  total?: number;
  limit?: number;
  offset?: number;
  next?: string;
}

// ─── eBay category → PartType mapping ──────────────────────────────────────

const CATEGORY_TO_PART_TYPE: Record<string, PartType> = {
  "33559": PartType.ENGINE,
  "33743": PartType.TRANSMISSION,
  "33560": PartType.BRAKES,
  "33587": PartType.SUSPENSION,
  "33549": PartType.ELECTRICAL_CHARGING,
  "33554": PartType.HVAC,
  "33566": PartType.LIGHTING,
  "33664": PartType.INTERIOR,
  "33640": PartType.BODY_PANELS,
  "262989": PartType.EV_AND_HYBRID,
  "33637": PartType.HARDWARE, // fallback for top-level
};

// Keyword → PartType heuristics (applied to title when category doesn't match)
const KEYWORD_PART_TYPE: [RegExp, PartType][] = [
  [/engine|motor|piston|cylinder|crankshaft|camshaft|head gasket|valve/i, PartType.ENGINE],
  [/transmission|gearbox|torque converter|clutch|flywheel/i, PartType.TRANSMISSION],
  [/alternator|starter|battery|charging/i, PartType.ELECTRICAL_CHARGING],
  [/wiring|harness|fuse|relay|bcm|ecm|pcm|ecu|module|computer/i, PartType.ECU_AND_MODULES],
  [/brake|rotor|caliper|pad|drum|abs/i, PartType.BRAKES],
  [/strut|shock|spring|control arm|sway bar|suspension/i, PartType.SUSPENSION],
  [/steering|rack|tie rod|power steering|column/i, PartType.STEERING],
  [/radiator|coolant|thermostat|water pump|fan|intercooler/i, PartType.ENGINE_COOLING],
  [/fuel pump|injector|throttle body|carburetor|fuel rail/i, PartType.FUEL_AND_AIR],
  [/exhaust|muffler|catalytic|resonator|manifold pipe/i, PartType.EXHAUST],
  [/turbo|supercharger|boost|wastegate/i, PartType.TURBOCHARGER],
  [/headlight|tail light|fog light|lamp assembly|turn signal|daytime|drl/i, PartType.LIGHTING],
  [/mirror|side mirror|rear view/i, PartType.MIRRORS],
  [/door|latch|window regulator|door handle|door panel/i, PartType.DOORS],
  [/windshield|glass|window glass|back glass|quarter glass/i, PartType.GLASS],
  [/bumper|fender|hood|quarter panel|trunk|tailgate|body panel/i, PartType.BODY_PANELS],
  [/seat|upholstery|cushion|leather|cloth seat/i, PartType.SEATS],
  [/airbag|air bag|srs|clockspring/i, PartType.AIRBAGS],
  [/radio|stereo|head unit|speaker|amplifier|infotainment|navigation/i, PartType.AUDIO_AND_INFOTAINMENT],
  [/instrument cluster|speedometer|gauge cluster|dashboard/i, PartType.INSTRUMENT_CLUSTER],
  [/ac compressor|a\/c|condenser|evaporator|heater core|blower/i, PartType.HVAC],
  [/wheel|rim|alloy|hub cap|lug nut|tire pressure/i, PartType.WHEELS_AND_TIRES],
  [/cv axle|driveshaft|differential|axle shaft|u-joint|half shaft/i, PartType.DRIVETRAIN],
  [/transfer case|4wd|4x4|awd actuator/i, PartType.TRANSFER_CASE],
  [/wiper|windshield washer|wiper motor/i, PartType.WIPERS],
  [/oxygen sensor|o2 sensor|maf sensor|map sensor|crank sensor|cam sensor|knock sensor/i, PartType.SENSORS],
  [/belt|tensioner|pulley|serpentine/i, PartType.BELT_DRIVE],
  [/battery.*hybrid|high.?voltage|hv battery|prius.*battery|hybrid.*module/i, PartType.EV_AND_HYBRID],
];

function guessPartType(title: string, categoryIds: string[]): PartType {
  // Try category mapping first
  for (const catId of categoryIds) {
    if (CATEGORY_TO_PART_TYPE[catId]) return CATEGORY_TO_PART_TYPE[catId];
  }
  // Then keyword heuristics
  for (const [regex, pt] of KEYWORD_PART_TYPE) {
    if (regex.test(title)) return pt;
  }
  return PartType.HARDWARE; // fallback
}

// ─── eBay condition → ConditionGrade ───────────────────────────────────────

function mapCondition(conditionId?: string, condition?: string): ConditionGrade {
  // eBay condition IDs: 1000=New, 2500=Certified Refurb, 3000=Used, 4000=Very Good, 5000=Good, 6000=Acceptable, 7000=For Parts
  const id = conditionId ? parseInt(conditionId) : null;
  if (!id) {
    if (/excellent|like new|very good/i.test(condition ?? "")) return ConditionGrade.A;
    if (/good|clean/i.test(condition ?? "")) return ConditionGrade.B;
    return ConditionGrade.C;
  }
  if (id <= 2500) return ConditionGrade.A;    // New / Certified Refurb
  if (id === 3000) return ConditionGrade.A;   // Used (eBay's "Used" often means good)
  if (id === 4000) return ConditionGrade.B;   // Very Good
  if (id === 5000) return ConditionGrade.B;   // Good
  return ConditionGrade.C;                    // Acceptable / For Parts
}

// ─── eBay API client ────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
    throw new Error(
      "Missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET.\n" +
      "Register at https://developer.ebay.com and add credentials to .env.local"
    );
  }

  const credentials = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`eBay OAuth failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as EbayTokenResponse;
  return data.access_token;
}

async function searchParts(
  token: string,
  query: string,
  categoryId: string,
  limit: number,
  offset = 0
): Promise<EbaySearchResponse> {
  const params = new URLSearchParams({
    q: query,
    category_ids: categoryId,
    "filter": "conditionIds:{3000|4000|5000|6000},itemLocationCountry:US",
    limit: String(limit),
    offset: String(offset),
    fieldgroups: "EXTENDED",
  });

  const res = await fetch(`${BASE_URL}/buy/browse/v1/item_summary/search?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`eBay search failed: ${res.status} ${body}`);
  }

  return res.json() as Promise<EbaySearchResponse>;
}

// ─── Database import ─────────────────────────────────────────────────────────

async function getOrCreateImportSeller(prisma: PrismaClient, sellerUsername: string) {
  const email = `ebay-import-${sellerUsername.toLowerCase().replace(/[^a-z0-9]/g, "")}@import.ebay.com`;
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: `eBay Seller: ${sellerUsername}`,
      role: "SELLER",
      sellerTier: "VERIFIED",
      businessName: sellerUsername,
    },
  });
}

async function importItem(prisma: PrismaClient, item: EbayItemSummary): Promise<boolean> {
  const price = parseFloat(item.price?.value ?? "0");
  if (price <= 0) return false;

  const categoryIds = [
    ...(item.leafCategoryIds ?? []),
    ...(item.categories?.map((c) => c.categoryId) ?? []),
  ];
  const partType = guessPartType(item.title, categoryIds);
  const conditionGrade = mapCondition(item.conditionId, item.condition);
  const sellerUsername = item.seller?.username ?? "ebay-unknown";

  const seller = await getOrCreateImportSeller(prisma, sellerUsername);

  // Check for duplicate (by eBay item ID stored in partNumber field)
  const existing = await prisma.part.findFirst({
    where: { partNumber: `EBAY-${item.itemId}` },
  });
  if (existing) return false;

  const locationStr = [
    item.itemLocation?.city,
    item.itemLocation?.stateOrProvince,
  ]
    .filter(Boolean)
    .join(", ");

  await prisma.part.create({
    data: {
      title: item.title.slice(0, 255),
      description: [
        item.shortDescription,
        item.condition,
        item.itemWebUrl ? `eBay listing: ${item.itemWebUrl}` : null,
      ]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 1000),
      partType,
      conditionGrade,
      conditionNotes: item.condition ?? null,
      price,
      partNumber: `EBAY-${item.itemId}`,
      status: "ACTIVE",
      sellerId: seller.id,
      ...(locationStr && { storageRow: locationStr }),
      images: item.image?.imageUrl
        ? {
            create: [
              { url: item.image.imageUrl, isPrimary: true, order: 0 },
              ...(item.additionalImages?.slice(0, 4).map((img, i) => ({
                url: img.imageUrl,
                isPrimary: false,
                order: i + 1,
              })) ?? []),
            ],
          }
        : undefined,
    },
  });

  return true;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔧 eBay Parts Importer`);
  console.log(`   Mode:     ${SANDBOX ? "SANDBOX" : "PRODUCTION"}`);
  console.log(`   Query:    "${QUERY}"`);
  console.log(`   Category: ${CATEGORY_ID}`);
  console.log(`   Limit:    ${LIMIT}`);
  console.log(`   Dry run:  ${DRY_RUN}\n`);

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set");
  }

  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter }) as PrismaClient;

  try {
    console.log("🔑 Authenticating with eBay...");
    const token = await getAccessToken();
    console.log("   ✓ Token acquired\n");

    console.log(`🔍 Searching: category=${CATEGORY_ID} q="${QUERY}"...`);
    const response = await searchParts(token, QUERY, CATEGORY_ID, LIMIT);
    const items = response.itemSummaries ?? [];

    console.log(`   Found ${response.total?.toLocaleString() ?? "?"} total, fetched ${items.length}\n`);

    if (items.length === 0) {
      console.log("⚠️  No items found. Try a different query or category.");
      return;
    }

    if (DRY_RUN) {
      console.log("📋 DRY RUN — sample of items that would be imported:");
      items.slice(0, 5).forEach((item) => {
        const pt = guessPartType(item.title, [
          ...(item.leafCategoryIds ?? []),
          ...(item.categories?.map((c) => c.categoryId) ?? []),
        ]);
        console.log(`   [${pt}] $${item.price?.value} — ${item.title.slice(0, 70)}`);
      });
      return;
    }

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const item of items) {
      try {
        const created = await importItem(prisma, item);
        if (created) {
          imported++;
          const pt = guessPartType(item.title, [
            ...(item.leafCategoryIds ?? []),
            ...(item.categories?.map((c) => c.categoryId) ?? []),
          ]);
          console.log(`   ✓ [${pt}] $${item.price?.value} — ${item.title.slice(0, 60)}`);
        } else {
          skipped++;
        }
      } catch (err) {
        errors++;
        console.error(`   ✗ ${item.title.slice(0, 50)}: ${(err as Error).message}`);
      }
    }

    console.log(`\n✅ Done: ${imported} imported, ${skipped} skipped (duplicates/no price), ${errors} errors`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Fatal error:", e.message);
  process.exit(1);
});

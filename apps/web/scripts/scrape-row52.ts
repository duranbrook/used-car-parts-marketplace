/**
 * Row52 (Pick-n-Pull / LKQ) vehicle inventory scraper
 *
 * Row52 lists vehicles available at LKQ Pick-n-Pull self-service yards.
 * Each vehicle is a candidate for part pulls — we create Vehicle records
 * and stub Part listings (DRAFT status) that sellers can fill in once they
 * physically pull the part.
 *
 * Row52 uses GET-based pagination with server-rendered HTML — no JS rendering
 * needed. No robots.txt restrictions found.
 *
 * Source: https://row52.com/Search
 * Fields per vehicle: year, make, model, VIN, yard name, city/state,
 *                     row number, date added, image URL.
 *
 * Usage:
 *   npx tsx scripts/scrape-row52.ts
 *   npx tsx scripts/scrape-row52.ts --make Honda --model Civic --year 2015
 *   npx tsx scripts/scrape-row52.ts --zip 90210 --distance 50 --pages 5
 *   npx tsx scripts/scrape-row52.ts --dry-run
 *
 * Note: Be a polite scraper — the script sleeps 1s between pages.
 */

import * as dotenv from "dotenv";
import * as path from "path";
import { JSDOM } from "jsdom";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (name: string, def: string) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : def;
};

const MAKE = getArg("make", "");
const MODEL = getArg("model", "");
const YEAR = getArg("year", "");
const ZIP = getArg("zip", "");
const DISTANCE = getArg("distance", "0");
const MAX_PAGES = parseInt(getArg("pages", "3"));
const DRY_RUN = args.includes("--dry-run");

const BASE_URL = "https://row52.com";
const SLEEP_MS = 1200; // polite delay between requests

// ─── Scraping helpers ────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface Row52Vehicle {
  year: number;
  make: string;
  model: string;
  vin: string | null;
  yardName: string;
  yardCity: string;
  yardState: string;
  row: string | null;
  dateAdded: Date | null;
  imageUrl: string | null;
}

async function fetchPage(page: number): Promise<string> {
  const params = new URLSearchParams({
    Page: String(page),
    MakeId: "0",
    ModelId: "0",
    Year: YEAR,
    SortDirection: "desc",
    Sort: "DateAdded",
    Distance: DISTANCE,
    ZipCode: ZIP,
    HasImage: "",
    HasComment: "",
    LocationId: "0",
    YMMorVIN: MAKE && MODEL ? `${YEAR} ${MAKE} ${MODEL}`.trim() : "",
    IsVin: "false",
  });

  const url = `${BASE_URL}/Search?${params}`;
  console.log(`   Fetching page ${page}: ${url.slice(0, 80)}...`);

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

function parseVehicles(html: string): Row52Vehicle[] {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const vehicles: Row52Vehicle[] = [];

  // Row52 uses schema.org microdata on each vehicle block.
  // Each vehicle is a div[itemtype="http://schema.org/Thing/Automobile"]
  // with <meta itemprop="vin|make|model|year"> tags inside.
  const rows = doc.querySelectorAll('[itemtype="http://schema.org/Thing/Automobile"]');

  if (rows.length === 0) {
    const allText = doc.body?.textContent ?? "";
    if (allText.includes("No vehicles found") || allText.includes("no results")) {
      return [];
    }
    console.log("   ⚠️  Could not parse rows. Page structure may have changed.");
    return [];
  }

  const text = (el: Element | null) => el?.textContent?.trim() ?? "";
  const meta = (row: Element, prop: string) =>
    row.querySelector(`meta[itemprop="${prop}"]`)?.getAttribute("content") ?? "";

  for (const row of rows) {
    try {
      const vin = meta(row, "vin") || null;
      const make = meta(row, "make");
      const model = meta(row, "model");
      const year = parseInt(meta(row, "year")) || 0;

      if (year < 1960 || (!make && !vin)) continue;

      // Image
      const img = row.querySelector('img[itemprop="image"]');
      const imageUrl = img?.getAttribute("src") ?? null;

      // Yard name and address from nested AutomotiveBusiness block
      const yardBlock = row.querySelector('[itemtype="http://schema.org/AutomotiveBusiness"]');
      const yardName = text(yardBlock?.querySelector('[itemprop="name"]') ?? null);
      const addressRaw = text(yardBlock?.querySelector('[itemprop="address"]') ?? null);
      // addressRaw: "Salt Lake City, Utah 84115" → city + state abbrev
      const addrMatch = addressRaw.match(/^(.+?),\s+(\w+)\s+\d/);
      const yardCity = addrMatch?.[1] ?? "";
      // State is full name in address (e.g. "Utah") — extract 2-letter from known abbrevs or just store full name
      const yardState = addrMatch?.[2] ?? "";

      // Row number: in the .col-md-1 div after the yard block
      // Structure: <h4>Row</h4><div class="list-row-right"><strong>38</strong></div>
      let rowNum: string | null = null;
      const allCols = row.querySelectorAll(".col-md-1, .col-md-2");
      for (const col of allCols) {
        const heading = col.querySelector("h4");
        if (heading?.textContent?.trim() === "Row") {
          rowNum = text(col.querySelector("strong")) || null;
        }
      }

      // Date added: in the .col-md-2 div
      let dateAdded: Date | null = null;
      for (const col of allCols) {
        const heading = col.querySelector("h4");
        if (heading?.textContent?.trim() === "Added to yard") {
          const dateText = text(col.querySelector("strong"));
          if (dateText) {
            const d = new Date(dateText);
            if (!isNaN(d.getTime())) dateAdded = d;
          }
        }
      }

      vehicles.push({ year, make, model, vin, yardName, yardCity, yardState, row: rowNum, dateAdded, imageUrl });
    } catch {
      // Skip malformed rows
    }
  }

  return vehicles;
}

// ─── Database import ─────────────────────────────────────────────────────────

async function upsertVehicle(prisma: PrismaClient, v: Row52Vehicle) {
  // Find or create vehicle by VIN (if available) or year/make/model
  if (v.vin) {
    return prisma.vehicle.upsert({
      where: { vin: v.vin },
      update: {
        year: v.year || undefined,
        make: v.make || undefined,
        model: v.model || undefined,
      },
      create: {
        vin: v.vin,
        year: v.year,
        make: v.make,
        model: v.model,
        dismantleStatus: "WHOLE",
      },
    });
  }

  // No VIN — find by YMM + yard location
  const existing = await prisma.vehicle.findFirst({
    where: { year: v.year, make: v.make, model: v.model, vin: null },
  });
  if (existing) return existing;

  return prisma.vehicle.create({
    data: {
      year: v.year,
      make: v.make,
      model: v.model,
      dismantleStatus: "WHOLE",
    },
  });
}

async function getSystemSeller(prisma: PrismaClient) {
  const email = "row52-import@system.local";
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Row52 / LKQ Pick-n-Pull Import",
      role: "SELLER",
      sellerTier: "VERIFIED",
      businessName: "LKQ Pick-n-Pull (Row52)",
    },
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🚗 Row52 (Pick-n-Pull / LKQ) Scraper");
  console.log(`   Make:     ${MAKE || "(all)"}`);
  console.log(`   Model:    ${MODEL || "(all)"}`);
  console.log(`   Year:     ${YEAR || "(all)"}`);
  console.log(`   Zip:      ${ZIP || "(all locations)"}`);
  console.log(`   Distance: ${DISTANCE} miles`);
  console.log(`   Pages:    ${MAX_PAGES}`);
  console.log(`   Dry run:  ${DRY_RUN}\n`);

  const allVehicles: Row52Vehicle[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const html = await fetchPage(page);
      const vehicles = parseVehicles(html);

      if (vehicles.length === 0) {
        console.log(`   Page ${page}: 0 vehicles — stopping early`);
        break;
      }

      console.log(`   Page ${page}: ${vehicles.length} vehicles`);
      allVehicles.push(...vehicles);
      await sleep(SLEEP_MS);
    } catch (err) {
      console.error(`   Page ${page} error: ${(err as Error).message}`);
      break;
    }
  }

  console.log(`\n   Total scraped: ${allVehicles.length} vehicles\n`);

  if (DRY_RUN || allVehicles.length === 0) {
    if (allVehicles.length > 0) {
      console.log("📋 DRY RUN — sample vehicles:");
      allVehicles.slice(0, 10).forEach((v) => {
        console.log(`   ${v.year} ${v.make} ${v.model} | VIN: ${v.vin ?? "n/a"} | ${v.yardCity}, ${v.yardState} | Row: ${v.row ?? "n/a"}`);
      });
    }
    return;
  }

  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");

  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter }) as PrismaClient;

  try {
    const seller = await getSystemSeller(prisma);
    console.log(`✓ System seller: ${seller.id}\n`);

    let created = 0;
    let skipped = 0;

    for (const v of allVehicles) {
      try {
        const vehicle = await upsertVehicle(prisma, v);

        // Create a DRAFT part listing so the vehicle shows up in the marketplace
        // A human seller can later fill in the actual part details and activate it
        const locationStr = [v.yardCity, v.yardState].filter(Boolean).join(", ");
        const rowStr = v.row ? `Row ${v.row}` : null;

        const title = `${v.year} ${v.make} ${v.model} — Available at ${v.yardName || "LKQ Pick-n-Pull"}${rowStr ? ` (${rowStr})` : ""}`;

        const existing = await prisma.part.findFirst({
          where: {
            vehicleId: vehicle.id,
            sellerId: seller.id,
            status: "DRAFT",
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await prisma.part.create({
          data: {
            title: title.slice(0, 255),
            description: [
              `Sourced from Row52 / LKQ Pick-n-Pull.`,
              locationStr ? `Yard location: ${locationStr}` : null,
              rowStr ? `Vehicle is in ${rowStr} on the lot.` : null,
              v.vin ? `VIN: ${v.vin}` : null,
              v.dateAdded ? `Added to yard: ${v.dateAdded.toLocaleDateString()}` : null,
              `\nThis is a self-service yard — bring your own tools and pull the part yourself.`,
            ]
              .filter(Boolean)
              .join("\n"),
            // Use HARDWARE as a generic placeholder; seller updates partType when listing specific parts
            partType: "HARDWARE",
            conditionGrade: "C",
            price: 0,          // Seller sets price when activating
            status: "DRAFT",   // Not visible until a seller activates with real details
            sellerId: seller.id,
            vehicleId: vehicle.id,
            storageRow: rowStr ?? locationStr ?? null,
          },
        });

        created++;
        console.log(`   ✓ ${v.year} ${v.make} ${v.model} | ${v.vin ?? "no VIN"} | ${locationStr} | Row: ${v.row ?? "n/a"}`);
      } catch (err) {
        console.error(`   ✗ ${v.year} ${v.make} ${v.model}: ${(err as Error).message}`);
      }
    }

    console.log(`\n✅ Done: ${created} vehicles/drafts created, ${skipped} already existed`);
    console.log(`   These are DRAFT listings. A seller needs to activate them with part-specific details.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});

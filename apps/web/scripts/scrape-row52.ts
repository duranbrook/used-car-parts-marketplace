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

  // Row52 renders vehicles in <div class="row-standard"> or <tr> elements
  // Try table rows first (most likely structure based on URL params)
  const rows = doc.querySelectorAll("table tbody tr, .vehicle-row, .row-standard, [class*='vehicle']");

  if (rows.length === 0) {
    // Fallback: look for any div with year/make/model pattern
    const allText = doc.body?.textContent ?? "";
    if (allText.includes("No vehicles found") || allText.includes("no results")) {
      return [];
    }
    // Log a snippet to help debug the actual HTML structure
    console.log("   ⚠️  Could not parse rows. Page structure may have changed.");
    console.log("      HTML snippet:", html.slice(0, 500));
    return [];
  }

  for (const row of rows) {
    try {
      // Extract text content from cells
      const cells = row.querySelectorAll("td, .cell, [class*='col']");
      if (cells.length < 3) continue;

      const text = (el: Element | null) => el?.textContent?.trim() ?? "";

      // Row52 typical columns: Image | Year Make Model | VIN | Yard | Row | Date
      // The exact structure depends on their current HTML — we try multiple patterns

      let year = 0;
      let make = "";
      let model = "";
      let vin: string | null = null;
      let yardName = "";
      let yardCity = "";
      let yardState = "";
      let rowNum: string | null = null;
      let dateAdded: Date | null = null;
      let imageUrl: string | null = null;

      // Image
      const img = row.querySelector("img");
      if (img) imageUrl = img.getAttribute("src") ?? null;

      // Look for VIN pattern (17 chars alphanumeric)
      const fullText = text(row);
      const vinMatch = fullText.match(/\b([A-HJ-NPR-Z0-9]{17})\b/);
      if (vinMatch) vin = vinMatch[1];

      // Year (4 digits starting with 19xx or 20xx)
      const yearMatch = fullText.match(/\b(19[6-9]\d|20[0-3]\d)\b/);
      if (yearMatch) year = parseInt(yearMatch[1]);

      // Date pattern MM/DD/YYYY
      const dateMatch = fullText.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
      if (dateMatch) {
        dateAdded = new Date(`${dateMatch[3]}-${dateMatch[1].padStart(2, "0")}-${dateMatch[2].padStart(2, "0")}`);
      }

      // Row number pattern "Row XX" or "Row: XX"
      const rowMatch = fullText.match(/[Rr]ow[:\s]+([A-Z0-9]+)/);
      if (rowMatch) rowNum = rowMatch[1];

      // Parse cells positionally — Row52 has consistent column order
      for (let i = 0; i < cells.length; i++) {
        const cellText = text(cells[i]);

        // YMM cell usually has "YEAR MAKE MODEL" or links
        const links = cells[i].querySelectorAll("a");
        for (const link of links) {
          const linkText = link.textContent?.trim() ?? "";
          // Yard name links contain location info
          if (/pick.n.pull|u-pull|lkq|pull-a-part|yard|auto/i.test(linkText)) {
            yardName = linkText;
          }
        }

        // State abbreviation pattern
        const stateMatch = cellText.match(/,\s*([A-Z]{2})(?:\s|$)/);
        if (stateMatch && !yardState) {
          yardState = stateMatch[1];
          yardCity = cellText.replace(/,.*$/, "").trim();
        }
      }

      // Extract make/model from the ymm link text or cell text
      // Typical: "2015 Honda Civic" in a link or strong tag
      const ymmEl = row.querySelector("a[href*='/Search'], strong, b, .ymm, [class*='make'], [class*='model']");
      if (ymmEl) {
        const ymmText = text(ymmEl);
        const ymmMatch = ymmText.match(/^(\d{4})\s+(.+?)\s+(.+)$/);
        if (ymmMatch) {
          year = parseInt(ymmMatch[1]);
          make = ymmMatch[2];
          model = ymmMatch[3];
        }
      }

      if (year > 1960 && (make || vin)) {
        vehicles.push({ year, make, model, vin, yardName, yardCity, yardState, row: rowNum, dateAdded, imageUrl });
      }
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

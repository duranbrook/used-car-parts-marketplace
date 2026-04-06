/**
 * VIN lookup: decode a 17-character VIN via NHTSA API.
 * Public endpoint — runs under the "no-auth" Playwright project.
 */
import { test, expect } from "@playwright/test";

// Well-known VIN: 2019 Toyota Camry
const VALID_VIN = "4T1B11HK9KU256665";
const SEED_VIN = "1HGBH41JXMN109186"; // Honda Civic used in seed

test.describe("VIN lookup", () => {
  test("decodes a valid VIN and returns vehicle details", async ({ request }) => {
    const res = await request.get(`/api/vin/${VALID_VIN}`);
    // NHTSA is an external API — accept 200 or skip on network failure
    if (res.status() === 503 || res.status() === 504) {
      test.skip(true, "NHTSA API unavailable in this environment");
      return;
    }
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("make");
    expect(body).toHaveProperty("year");
    expect(body).toHaveProperty("model");
  });

  test("decodes the seeded VIN (1HGBH41JXMN109186)", async ({ request }) => {
    const res = await request.get(`/api/vin/${SEED_VIN}`);
    if (res.status() === 503 || res.status() === 504) {
      test.skip(true, "NHTSA API unavailable");
      return;
    }
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Honda Civic VIN
    expect(body.make?.toUpperCase()).toContain("HONDA");
  });

  test("VIN shorter than 17 chars returns 400", async ({ request }) => {
    const res = await request.get("/api/vin/SHORT");
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/17/);
  });

  test("VIN exactly 17 chars is accepted by the endpoint", async ({ request }) => {
    // Even if NHTSA returns no match, the endpoint should not return 400
    const res = await request.get("/api/vin/AAAAAAAAAAAAAAAAA"); // 17 chars, fake VIN
    expect(res.status()).not.toBe(400);
  });
});

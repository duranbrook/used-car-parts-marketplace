/**
 * Part reservation: 30-minute hold during checkout.
 * Uses Front Bumper seeded part.
 * Runs under the "buyer" Playwright project.
 */
import { test, expect } from "@playwright/test";

test.describe("Part reservation", () => {
  let bumperPartId: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.get("/api/parts?q=Bumper&limit=1");
    const { parts } = await res.json();
    bumperPartId = parts[0]?.id;
    expect(bumperPartId).toBeTruthy();
  });

  test.afterAll(async ({ request }) => {
    // Always release after tests
    if (bumperPartId) {
      await request.delete("/api/buyer/reserve", { data: { partId: bumperPartId } });
    }
  });

  test("can reserve an active part", async ({ request }) => {
    const res = await request.post("/api/buyer/reserve", {
      data: { partId: bumperPartId },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.reserved).toBe(true);
    expect(body.reservedUntil).toBeTruthy();
    // Should expire ~30 minutes from now
    const expiry = new Date(body.reservedUntil).getTime();
    const now = Date.now();
    expect(expiry - now).toBeGreaterThan(29 * 60 * 1000);
    expect(expiry - now).toBeLessThan(31 * 60 * 1000);
  });

  test("same buyer can re-reserve their own part", async ({ request }) => {
    // Buyer already holds it — re-reserving should succeed (extends expiry)
    const res = await request.post("/api/buyer/reserve", {
      data: { partId: bumperPartId },
    });
    expect(res.status()).toBe(200);
  });

  test("can release a reservation", async ({ request }) => {
    const res = await request.delete("/api/buyer/reserve", {
      data: { partId: bumperPartId },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.released).toBe(true);
  });

  test("reserving a non-existent part returns 404", async ({ request }) => {
    const res = await request.post("/api/buyer/reserve", {
      data: { partId: "does-not-exist" },
    });
    expect(res.status()).toBe(404);
  });
});

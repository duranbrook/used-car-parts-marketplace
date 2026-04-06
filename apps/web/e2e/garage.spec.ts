/**
 * Buyer garage: add, list, and remove saved vehicles.
 * Runs under the "buyer" Playwright project.
 */
import { test, expect } from "@playwright/test";

test.describe("Garage: manage saved vehicles", () => {
  let garageItemId: string;

  test("add a vehicle to garage", async ({ request }) => {
    const res = await request.post("/api/garage", {
      data: { year: 2018, make: "Honda", model: "Civic", trim: "Sport" },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.make).toBe("Honda");
    expect(body.year).toBe(2018);
    garageItemId = body.id;
  });

  test("garage list includes added vehicle", async ({ request }) => {
    const res = await request.get("/api/garage");
    expect(res.status()).toBe(200);
    const { vehicles } = await res.json();
    expect(Array.isArray(vehicles)).toBe(true);
    expect(vehicles.some((v: { make: string }) => v.make === "Honda")).toBe(true);
  });

  test("missing required fields returns 400", async ({ request }) => {
    const res = await request.post("/api/garage", {
      data: { year: 2018 }, // missing make and model
    });
    expect(res.status()).toBe(400);
  });

  test("remove vehicle from garage", async ({ request }) => {
    // Get current garage to find the Honda
    const list = await request.get("/api/garage");
    const { vehicles } = await list.json();
    const honda = vehicles.find((v: { make: string }) => v.make === "Honda");
    expect(honda).toBeDefined();

    const del = await request.delete("/api/garage", { data: { id: honda.id } });
    expect(del.status()).toBe(200);
    const body = await del.json();
    expect(body.ok).toBe(true);

    // Verify it's gone
    const after = await request.get("/api/garage");
    const { vehicles: afterList } = await after.json();
    expect(afterList.every((v: { id: string }) => v.id !== honda.id)).toBe(true);
  });

  test("garage page loads without redirect", async ({ page }) => {
    await page.goto("/garage");
    await expect(page).not.toHaveURL(/signin/);
    await expect(page.locator("main, [role='main'], h1").first()).toBeVisible({ timeout: 8_000 });
  });
});

/**
 * Buyer watchlist: save, list, and remove parts.
 * Runs under the "buyer" Playwright project.
 */
import { test, expect } from "@playwright/test";

test.describe("Watchlist: save and manage parts", () => {
  let watchPartId: string;

  test.beforeAll(async ({ request }) => {
    // Use the Front Bumper seeded part for watchlist tests
    const res = await request.get("/api/parts?q=Bumper&limit=1");
    const { parts } = await res.json();
    watchPartId = parts[0]?.id;
    expect(watchPartId).toBeTruthy();
  });

  test.afterAll(async ({ request }) => {
    if (watchPartId) {
      await request.delete("/api/watchlist", { data: { partId: watchPartId } });
    }
  });

  test("add part to watchlist", async ({ request }) => {
    const res = await request.post("/api/watchlist", { data: { partId: watchPartId } });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.partId).toBe(watchPartId);
  });

  test("watchlist includes saved part", async ({ request }) => {
    const res = await request.get("/api/watchlist");
    expect(res.status()).toBe(200);
    const { items } = await res.json();
    expect(Array.isArray(items)).toBe(true);
    expect(items.some((i: { partId: string }) => i.partId === watchPartId)).toBe(true);
  });

  test("adding same part again is idempotent (upsert)", async ({ request }) => {
    const res = await request.post("/api/watchlist", { data: { partId: watchPartId } });
    expect(res.status()).toBe(201);
    // Count in list should still be 1 for this part
    const list = await request.get("/api/watchlist");
    const { items } = await list.json();
    const count = items.filter((i: { partId: string }) => i.partId === watchPartId).length;
    expect(count).toBe(1);
  });

  test("missing partId returns 400", async ({ request }) => {
    const res = await request.post("/api/watchlist", { data: {} });
    expect(res.status()).toBe(400);
  });

  test("remove part from watchlist", async ({ request }) => {
    const del = await request.delete("/api/watchlist", { data: { partId: watchPartId } });
    expect(del.status()).toBe(200);
    const body = await del.json();
    expect(body.ok).toBe(true);

    const list = await request.get("/api/watchlist");
    const { items } = await list.json();
    expect(items.every((i: { partId: string }) => i.partId !== watchPartId)).toBe(true);
  });

  test("watchlist page loads without redirect", async ({ page }) => {
    await page.goto("/watchlist");
    await expect(page).not.toHaveURL(/signin/);
    await expect(page.locator("main, [role='main']").first()).toBeVisible({ timeout: 8_000 });
  });
});

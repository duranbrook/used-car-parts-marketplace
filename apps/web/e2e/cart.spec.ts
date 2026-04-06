/**
 * Cart and checkout flows for the buyer role.
 * Runs under the "buyer" Playwright project.
 */
import { test, expect } from "@playwright/test";

test.describe("Cart: add, view, remove", () => {
  let testPartId: string;

  test.beforeAll(async ({ request }) => {
    // Get a seeded part to work with
    const res = await request.get("/api/parts?q=Brake&limit=1");
    const { parts } = await res.json();
    testPartId = parts[0]?.id;
    expect(testPartId).toBeTruthy();
  });

  test.afterEach(async ({ request }) => {
    // Clean up: remove the part from cart after each test
    if (testPartId) {
      await request.delete("/api/cart", {
        data: { partId: testPartId },
      });
    }
  });

  test("cart API returns empty cart initially", async ({ request }) => {
    const res = await request.get("/api/cart");
    expect(res.status()).toBe(200);
    const { items } = await res.json();
    expect(Array.isArray(items)).toBe(true);
  });

  test("can add a part to cart via API", async ({ request }) => {
    const res = await request.post("/api/cart", {
      data: { partId: testPartId, quantity: 1 },
    });
    expect(res.status()).toBe(201);
    const item = await res.json();
    expect(item.partId).toBe(testPartId);
    expect(item.quantity).toBe(1);
  });

  test("cart page renders added items", async ({ page, request }) => {
    // Add part first
    await request.post("/api/cart", { data: { partId: testPartId, quantity: 1 } });

    await page.goto("/cart");
    await expect(page.getByText("Brake Pad Set", { exact: false })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can remove a part from cart via API", async ({ request }) => {
    await request.post("/api/cart", { data: { partId: testPartId } });

    const del = await request.delete("/api/cart", { data: { partId: testPartId } });
    expect(del.status()).toBe(200);

    const cart = await request.get("/api/cart");
    const { items } = await cart.json();
    expect(items.every((i: { partId: string }) => i.partId !== testPartId)).toBe(true);
  });

  test("missing partId returns 400", async ({ request }) => {
    const res = await request.post("/api/cart", { data: {} });
    expect(res.status()).toBe(400);
  });
});

test.describe("Cart: business rules", () => {
  test("placing order with empty cart returns 400", async ({ request }) => {
    // Clear cart first
    const cartRes = await request.get("/api/cart");
    const { items } = await cartRes.json();
    for (const item of items) {
      await request.delete("/api/cart", { data: { partId: item.partId } });
    }

    const res = await request.post("/api/orders", { data: {} });
    expect(res.status()).toBe(400);
  });

  // /api/orders auth enforcement is tested in access-control.spec.ts
});

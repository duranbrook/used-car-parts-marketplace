/**
 * End-to-end checkout flow: cart → order → orders list.
 * Uses the Alternator seeded part to avoid conflicts with cart.spec.ts (which uses Brake Pad Set).
 * Runs under the "buyer" Playwright project.
 */
import { test, expect } from "@playwright/test";

test.describe("Checkout: place an order", () => {
  let alternatorId: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.get("/api/parts?q=Alternator&limit=1");
    const { parts } = await res.json();
    alternatorId = parts[0]?.id;
    expect(alternatorId).toBeTruthy();
  });

  test("add to cart, place order, see it in orders list", async ({ request }) => {
    // 1. Add Alternator to cart
    const add = await request.post("/api/cart", {
      data: { partId: alternatorId, quantity: 1 },
    });
    expect(add.status()).toBe(201);

    // 2. Place the order
    const order = await request.post("/api/orders", { data: {} });
    expect(order.status()).toBe(201);
    const { orders } = await order.json();
    expect(orders).toHaveLength(1);
    expect(orders[0].status).toBe("PENDING");
    expect(orders[0].items[0].partId).toBe(alternatorId);
    // 5% platform fee is applied
    expect(parseFloat(orders[0].platformFee)).toBeGreaterThan(0);

    // 3. Verify order appears in orders list
    const list = await request.get("/api/orders");
    expect(list.status()).toBe(200);
    const { orders: allOrders } = await list.json();
    const placed = allOrders.find((o: { id: string }) => o.id === orders[0].id);
    expect(placed).toBeDefined();
    expect(placed.status).toBe("PENDING");
  });

  test("cart is empty after checkout", async ({ request }) => {
    const cart = await request.get("/api/cart");
    const { items } = await cart.json();
    // Alternator was purchased, should no longer be in cart
    expect(items.every((i: { partId: string }) => i.partId !== alternatorId)).toBe(true);
  });

  test("orders page renders for authenticated buyer", async ({ page }) => {
    await page.goto("/dashboard/orders");
    await expect(page).not.toHaveURL(/signin/);
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10_000 });
  });
});

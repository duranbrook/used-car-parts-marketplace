import { test, expect } from "@playwright/test";

test.describe("Ops/Admin: platform management", () => {
  test("dashboard shows ADMIN role badge", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("ADMIN")).toBeVisible();
  });

  test("admin stats API returns platform stats", async ({ request }) => {
    const res = await request.get("/api/admin/stats");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("stats");
    expect(body.stats).toHaveProperty("totalUsers");
  });

  test("ops sellers list API returns sellers", async ({ request }) => {
    const res = await request.get("/api/ops/sellers");
    expect(res.status()).toBe(200);
    const sellers = await res.json();
    expect(Array.isArray(sellers)).toBe(true);
  });

  test("ops discounts API can create and list codes", async ({ request }) => {
    // Create a discount code
    const create = await request.post("/api/ops/discounts", {
      data: { code: "E2ETEST10", type: "percent", value: 10, maxUses: 5 },
    });
    expect(create.status()).toBe(201);
    const code = await create.json();
    expect(code.code).toBe("E2ETEST10");

    // List all codes
    const list = await request.get("/api/ops/discounts");
    expect(list.status()).toBe(200);
    const codes = await list.json();
    expect(codes.some((c: { code: string }) => c.code === "E2ETEST10")).toBe(true);
  });

  test("non-admin cannot access ops sellers API", async ({ browser }) => {
    // Use a fresh browser context (no auth)
    const ctx = await browser.newContext();
    const req = await ctx.request.get("http://localhost:3000/api/ops/sellers");
    expect(req.status()).toBe(403);
    await ctx.close();
  });

  test("seller suspend action works via API", async ({ request }) => {
    // Get the seller user's ID first
    const sellers = await request.get("/api/ops/sellers");
    const list = await sellers.json();
    const testSeller = list.find(
      (s: { email: string }) => s.email === "seller@test.com"
    );
    expect(testSeller).toBeDefined();

    // Suspend them
    const suspend = await request.patch(`/api/ops/sellers/${testSeller.id}`, {
      data: { action: "suspend" },
    });
    expect(suspend.status()).toBe(200);
    const updated = await suspend.json();
    expect(updated.holidayMode).toBe(true);

    // Unsuspend to leave DB clean for other tests
    await request.patch(`/api/ops/sellers/${testSeller.id}`, {
      data: { action: "unsuspend" },
    });
  });
});

import { test, expect } from "@playwright/test";

test.describe("Ops/Admin: platform management", () => {
  test("dashboard shows ADMIN role badge", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("ADMIN", { exact: true })).toBeVisible();
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
    // Use a unique code suffix to avoid conflicts across runs
    const code = `E2ETEST${Date.now().toString().slice(-6)}`;
    const create = await request.post("/api/ops/discounts", {
      data: { code, type: "percent", value: 10, maxUses: 5 },
    });
    expect(create.status()).toBe(201);
    const body = await create.json();
    expect(body.code).toBe(code);

    const list = await request.get("/api/ops/discounts");
    expect(list.status()).toBe(200);
    const codes = await list.json();
    expect(codes.some((c: { code: string }) => c.code === code)).toBe(true);
  });

  test("non-admin cannot access ops sellers API", async ({ page, context }) => {
    // Clear the browser context cookies so page.request is also unauthenticated
    await context.clearCookies();
    const res = await page.request.get("/api/ops/sellers");
    expect([401, 403]).toContain(res.status());
  });

  test("seller suspend action works via API", async ({ request }) => {
    const sellers = await request.get("/api/ops/sellers");
    const list = await sellers.json();
    const testSeller = list.find((s: { email: string }) => s.email === "seller@test.com");
    expect(testSeller).toBeDefined();

    const suspend = await request.patch(`/api/ops/sellers/${testSeller.id}`, {
      data: { action: "suspend" },
    });
    expect(suspend.status()).toBe(200);
    const updated = await suspend.json();
    expect(updated.holidayMode).toBe(true);

    // Restore so other tests aren't affected
    await request.patch(`/api/ops/sellers/${testSeller.id}`, {
      data: { action: "unsuspend" },
    });
  });
});

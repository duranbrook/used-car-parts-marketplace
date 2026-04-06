/**
 * Role-based access control tests.
 * Runs under the "no-auth" Playwright project (no stored session).
 * Tests that protected endpoints and pages reject unauthenticated requests.
 */
import { test, expect } from "@playwright/test";

// Only server components do a server-side redirect.
// Client components ("use client") render without auth and rely on API-level 401s.
// Server components that auth-guard themselves:
const PROTECTED_PAGES = ["/dashboard"];

const PROTECTED_API_GET = [
  "/api/cart",
  "/api/orders",
  "/api/watchlist",
  "/api/garage",
  "/api/seller/onboarding",
  "/api/seller/analytics",
  "/api/admin/stats",
  "/api/ops/sellers",
  "/api/ops/discounts",
];

test.describe("Unauthenticated: page redirects", () => {
  for (const path of PROTECTED_PAGES) {
    test(`${path} redirects to sign-in`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/auth\/signin/, { timeout: 8_000 });
    });
  }
});

test.describe("Unauthenticated: API returns 401 or 403", () => {
  for (const path of PROTECTED_API_GET) {
    test(`GET ${path} is rejected`, async ({ request }) => {
      const res = await request.get(path);
      expect([401, 403]).toContain(res.status());
    });
  }

  test("POST /api/parts is rejected (no auth)", async ({ request }) => {
    const res = await request.post("/api/parts", {
      data: { title: "Hack", partType: "ENGINE", conditionGrade: "A", price: 1 },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("POST /api/cart is rejected (no auth)", async ({ request }) => {
    const res = await request.post("/api/cart", { data: { partId: "fake" } });
    expect([401, 403]).toContain(res.status());
  });

  test("POST /api/orders is rejected (no auth)", async ({ request }) => {
    const res = await request.post("/api/orders", { data: {} });
    expect([401, 403]).toContain(res.status());
  });
});

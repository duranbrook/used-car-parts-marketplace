import { test, expect } from "@playwright/test";

test.describe("Seller: dashboard and inventory", () => {
  test("dashboard shows SELLER role badge", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("SELLER", { exact: true })).toBeVisible();
  });

  test("dashboard shows seller-specific links", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("List a Part", { exact: false })).toBeVisible();
    await expect(page.getByText("My Inventory", { exact: false })).toBeVisible();
  });

  test("inventory page loads", async ({ page }) => {
    await page.goto("/dashboard/inventory");
    await expect(page).not.toHaveURL(/signin/);
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10_000 });
  });

  test("new part listing page loads", async ({ page }) => {
    await page.goto("/parts/new");
    await expect(page).not.toHaveURL(/signin/);
    await expect(page.locator("form, main").first()).toBeVisible({ timeout: 10_000 });
  });

  test("seller onboarding API returns seller data", async ({ request }) => {
    const res = await request.get("/api/seller/onboarding");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("steps");
  });
});

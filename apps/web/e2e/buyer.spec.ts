import { test, expect } from "@playwright/test";

test.describe("Buyer: search and discovery", () => {
  test("search page loads and shows results", async ({ page }) => {
    await page.goto("/search");
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
  });

  test("searching for a known part returns results", async ({ page }) => {
    await page.goto("/search");
    await page.locator('input[type="text"]').first().fill("Brake");
    await page.keyboard.press("Enter");
    await page.waitForResponse((resp) => resp.url().includes("/api/parts"));
    await expect(page.getByText("Brake Pad Set", { exact: false })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("part detail page loads from search result", async ({ page }) => {
    await page.goto("/search");
    await page.locator('input[type="text"]').first().fill("Brake");
    await page.keyboard.press("Enter");
    await page.waitForResponse((resp) => resp.url().includes("/api/parts"));
    const firstPart = page.getByText("Brake Pad Set", { exact: false }).first();
    await expect(firstPart).toBeVisible({ timeout: 10_000 });
    await firstPart.click();
    await expect(page).toHaveURL(/\/parts\//, { timeout: 10_000 });
  });

  test("unauthenticated user is redirected from dashboard", async ({ page, context }) => {
    // Clear cookies from this context to simulate unauthenticated state
    await context.clearCookies();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/signin/, { timeout: 10_000 });
  });
});

import { test, expect } from "@playwright/test";

test.describe("Buyer: search and discovery", () => {
  test("search page loads and shows results", async ({ page }) => {
    await page.goto("/search");
    // Search form should be visible
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
  });

  test("searching for a known part returns results", async ({ page }) => {
    await page.goto("/search");

    // Type in search box
    await page.locator('input[type="text"]').first().fill("Brake");
    // Trigger search (form submits on change or button click)
    await page.keyboard.press("Enter");

    // Wait for results to appear
    await page.waitForResponse((resp) => resp.url().includes("/api/parts"));

    // Should show at least one result card
    await expect(page.getByText("Brake Pad Set", { exact: false })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("part detail page loads from search result", async ({ page }) => {
    await page.goto("/search");
    await page.locator('input[type="text"]').first().fill("Brake");
    await page.keyboard.press("Enter");
    await page.waitForResponse((resp) => resp.url().includes("/api/parts"));

    // Click first part link
    const firstPart = page.getByText("Brake Pad Set", { exact: false }).first();
    await expect(firstPart).toBeVisible({ timeout: 10_000 });
    await firstPart.click();

    // Detail page should load (URL changes to /parts/[id])
    await expect(page).toHaveURL(/\/parts\//, { timeout: 10_000 });
  });

  test("unauthenticated user is redirected from dashboard", async ({ browser }) => {
    const ctx = await browser.newContext(); // no storage state
    const page = await ctx.newPage();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/signin/);
    await ctx.close();
  });
});

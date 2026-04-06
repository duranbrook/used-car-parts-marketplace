/**
 * Auth flows tested without any stored session.
 * Runs under the "no-auth" Playwright project.
 */
import { test, expect } from "@playwright/test";

test.describe("Sign-in error states", () => {
  test("wrong password shows error message", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.getByLabel("Email").fill("buyer@test.com");
    await page.getByLabel("Password").fill("WrongPassword!");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText("Invalid email or password")).toBeVisible();
  });

  test("non-existent email shows error message", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.getByLabel("Email").fill("nobody@nowhere.com");
    await page.getByLabel("Password").fill("Test1234!");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText("Invalid email or password")).toBeVisible();
  });

  test("unauthenticated /dashboard redirects to sign-in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});

test.describe("Registration flow", () => {
  test("register page shows buyer/seller role selector", async ({ page }) => {
    await page.goto("/auth/register");
    await expect(page.getByText("Buy Parts")).toBeVisible();
    await expect(page.getByText("Sell Parts")).toBeVisible();
  });

  test("registers as a new buyer and lands on dashboard", async ({ page }) => {
    const email = `newbuyer+${Date.now()}@e2e.test`;
    await page.goto("/auth/register");
    await page.getByRole("button", { name: "Buy Parts" }).click();
    await page.getByLabel(/full name/i).fill("New Buyer");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("Test1234!");
    await page.getByRole("button", { name: "Create Account" }).click();
    await page.waitForURL("/dashboard");
    await expect(page.getByText("BUYER", { exact: true })).toBeVisible();
  });

  test("registers as a new seller and lands on dashboard", async ({ page }) => {
    const email = `newseller+${Date.now()}@e2e.test`;
    await page.goto("/auth/register");
    await page.getByRole("button", { name: "Sell Parts" }).click();
    await page.getByLabel(/business name/i).fill("Test Auto Parts");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("Test1234!");
    await page.getByRole("button", { name: "Create Account" }).click();
    await page.waitForURL("/dashboard");
    await expect(page.getByText("SELLER", { exact: true })).toBeVisible();
  });

  test("duplicate email shows error", async ({ page }) => {
    await page.goto("/auth/register");
    await page.getByLabel(/full name/i).fill("Dup Buyer");
    await page.getByLabel("Email").fill("buyer@test.com"); // already exists
    await page.getByLabel("Password").fill("Test1234!");
    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(page.getByText(/already|exists|taken/i)).toBeVisible({ timeout: 8_000 });
  });
});

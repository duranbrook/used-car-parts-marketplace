import { test as setup, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const AUTH_DIR = path.join(__dirname, ".auth");

setup.beforeAll(() => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
});

async function signIn(
  page: import("@playwright/test").Page,
  email: string,
  storageStatePath: string
) {
  await page.goto("/auth/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Test1234!");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.context().storageState({ path: storageStatePath });
}

setup("authenticate as buyer", async ({ page }) => {
  await signIn(page, "buyer@test.com", path.join(AUTH_DIR, "buyer.json"));
});

setup("authenticate as seller", async ({ page }) => {
  await signIn(page, "seller@test.com", path.join(AUTH_DIR, "seller.json"));
});

setup("authenticate as admin", async ({ page }) => {
  await signIn(page, "admin@test.com", path.join(AUTH_DIR, "admin.json"));
});

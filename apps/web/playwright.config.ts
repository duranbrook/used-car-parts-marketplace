import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.test") });

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  tsconfig: "./e2e/tsconfig.json",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    // No storageState — for auth flow and access-control tests
    {
      name: "no-auth",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testMatch: /auth\.spec\.ts|access-control\.spec\.ts|vin\.spec\.ts|search-filters\.spec\.ts/,
    },
    {
      name: "buyer",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/buyer.json",
      },
      dependencies: ["setup"],
      testMatch: /buyer\.spec\.ts|cart\.spec\.ts|checkout\.spec\.ts|garage\.spec\.ts|watchlist\.spec\.ts|buyer-offers\.spec\.ts|reserve\.spec\.ts|reviews\.spec\.ts|messages\.spec\.ts/,
    },
    {
      name: "seller",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/seller.json",
      },
      dependencies: ["setup"],
      testMatch: /seller\.spec\.ts|part-creation\.spec\.ts|seller-offers\.spec\.ts/,
    },
    {
      name: "ops",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
      testMatch: /ops\.spec\.ts/,
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: process.env.DATABASE_URL!,
      AUTH_SECRET: process.env.AUTH_SECRET!,
      AUTH_URL: process.env.AUTH_URL ?? "http://localhost:3000",
    },
  },
});

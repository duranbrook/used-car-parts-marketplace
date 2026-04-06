import { execSync } from "node:child_process";
import path from "node:path";
import dotenv from "dotenv";

const WEB_DIR = path.resolve(__dirname, "..");

export default async function globalSetup() {
  dotenv.config({ path: path.join(WEB_DIR, ".env.test") });

  console.log("[e2e] Pushing schema to test database...");
  execSync("npx prisma generate && npx prisma db push --accept-data-loss", {
    cwd: WEB_DIR,
    env: { ...process.env },
    stdio: "inherit",
  });

  console.log("[e2e] Seeding test data...");
  execSync("npx tsx prisma/seed-e2e.ts", {
    cwd: WEB_DIR,
    env: { ...process.env },
    stdio: "inherit",
  });

  console.log("[e2e] Setup complete.");
}

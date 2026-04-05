import { execSync } from "node:child_process";
import path from "node:path";
import dotenv from "dotenv";

const WEB_DIR = path.resolve(__dirname, "..");

export default async function globalSetup() {
  dotenv.config({ path: path.join(WEB_DIR, ".env.test") });

  console.log("[e2e] Pushing schema to test database...");
  execSync("npx prisma generate && npx prisma db push --force-reset --accept-data-loss", {
    cwd: WEB_DIR,
    env: { ...process.env },
    stdio: "inherit",
  });

  console.log("[e2e] Seeding test data...");
  const { seedE2E } = await import("../prisma/seed-e2e");
  await seedE2E(process.env.DATABASE_URL!);

  console.log("[e2e] Setup complete.");
}

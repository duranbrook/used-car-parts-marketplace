import pg from "pg";

export default async function globalTeardown() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    // Delete in FK-safe order (test.com seed users + e2e.test registration users)
    await pool.query(`DELETE FROM "Part" WHERE "sellerId" IN (SELECT id FROM "User" WHERE email LIKE '%@test.com' OR email LIKE '%@e2e.test')`);
    await pool.query(`DELETE FROM "User" WHERE email LIKE '%@test.com' OR email LIKE '%@e2e.test'`);
    await pool.query(`DELETE FROM "DiscountCode" WHERE code LIKE 'E2ETEST%'`);
  } finally {
    await pool.end();
  }
}

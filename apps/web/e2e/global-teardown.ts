import pg from "pg";

export default async function globalTeardown() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    // Delete in FK-safe order
    await pool.query(`DELETE FROM "Part" WHERE "sellerId" IN (SELECT id FROM "User" WHERE email LIKE '%@test.com')`);
    await pool.query(`DELETE FROM "User" WHERE email LIKE '%@test.com'`);
    await pool.query(`DELETE FROM "DiscountCode" WHERE code LIKE 'E2ETEST%'`);
  } finally {
    await pool.end();
  }
}

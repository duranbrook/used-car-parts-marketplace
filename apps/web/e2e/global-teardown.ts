import pg from "pg";

export default async function globalTeardown() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    // Collect test user IDs first
    const { rows: users } = await pool.query<{ id: string }>(
      `SELECT id FROM "User" WHERE email LIKE '%@test.com' OR email LIKE '%@e2e.test'`
    );
    const userIds = users.map((u) => u.id);
    if (userIds.length > 0) {

    // Collect part IDs owned by test sellers
    const { rows: parts } = await pool.query<{ id: string }>(
      `SELECT id FROM "Part" WHERE "sellerId" = ANY($1::text[])`,
      [userIds]
    );
    const partIds = parts.map((p) => p.id);

    // Delete all tables that reference Part (FK order)
    if (partIds.length > 0) {
      await pool.query(`DELETE FROM "Offer"            WHERE "partId" = ANY($1::text[])`, [partIds]);
      await pool.query(`DELETE FROM "OrderItem"        WHERE "partId" = ANY($1::text[])`, [partIds]);
      await pool.query(`DELETE FROM "CartItem"         WHERE "partId" = ANY($1::text[])`, [partIds]);
      await pool.query(`DELETE FROM "Review"           WHERE "partId" = ANY($1::text[])`, [partIds]);
      await pool.query(`DELETE FROM "Message"          WHERE "partId" = ANY($1::text[])`, [partIds]);
      await pool.query(`DELETE FROM "Watchlist"        WHERE "partId" = ANY($1::text[])`, [partIds]);
      await pool.query(`DELETE FROM "PartCompatibility" WHERE "partId" = ANY($1::text[])`, [partIds]);
      await pool.query(`DELETE FROM "PartImage"        WHERE "partId" = ANY($1::text[])`, [partIds]);
      await pool.query(`DELETE FROM "Part"             WHERE id       = ANY($1::text[])`, [partIds]);
    }

    // Delete remaining user-owned rows
    // Orders: delete OrderItems first, then Orders
    const { rows: orders } = await pool.query<{ id: string }>(
      `SELECT id FROM "Order" WHERE "buyerId" = ANY($1::text[]) OR "sellerId" = ANY($1::text[])`,
      [userIds]
    );
    const orderIds = orders.map((o) => o.id);
    if (orderIds.length > 0) {
      await pool.query(`DELETE FROM "OrderItem" WHERE "orderId" = ANY($1::text[])`, [orderIds]);
      await pool.query(`DELETE FROM "Dispute"   WHERE "orderId" = ANY($1::text[])`, [orderIds]);
      await pool.query(`DELETE FROM "Order"     WHERE id        = ANY($1::text[])`, [orderIds]);
    }
    await pool.query(`DELETE FROM "Offer"       WHERE "buyerId"  = ANY($1::text[])`, [userIds]);
    await pool.query(`DELETE FROM "Review"      WHERE "buyerId"  = ANY($1::text[])`, [userIds]);
    await pool.query(`DELETE FROM "Message"     WHERE "senderId" = ANY($1::text[]) OR "receiverId" = ANY($1::text[])`, [userIds]);
    await pool.query(`DELETE FROM "CartItem"    WHERE "userId"   = ANY($1::text[])`, [userIds]);
    await pool.query(`DELETE FROM "SavedSearch" WHERE "userId"   = ANY($1::text[])`, [userIds]);
    await pool.query(`DELETE FROM "Watchlist"   WHERE "userId"   = ANY($1::text[])`, [userIds]);
    await pool.query(`DELETE FROM "Account"     WHERE "userId"   = ANY($1::text[])`, [userIds]);
    await pool.query(`DELETE FROM "Session"     WHERE "userId"   = ANY($1::text[])`, [userIds]);
    await pool.query(`DELETE FROM "User"        WHERE id         = ANY($1::text[])`, [userIds]);
    } // end if (userIds.length > 0)
    await pool.query(`DELETE FROM "DiscountCode" WHERE code LIKE 'E2ETEST%'`);
  } finally {
    await pool.end();
  }
}

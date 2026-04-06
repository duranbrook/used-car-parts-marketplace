/**
 * Seeds the test database with known users and parts for E2E tests.
 * Run via: npx tsx prisma/seed-e2e.ts
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

export async function seedE2E(databaseUrl: string) {
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const passwordHash = await bcrypt.hash("Test1234!", 10);

    // Clean previous test run data in FK-safe order
    const prevSeller = await prisma.user.findUnique({ where: { email: "seller@test.com" } });
    if (prevSeller) {
      const prevParts = await prisma.part.findMany({ where: { sellerId: prevSeller.id }, select: { id: true } });
      const prevPartIds = prevParts.map((p) => p.id);
      if (prevPartIds.length > 0) {
        await prisma.offer.deleteMany({ where: { partId: { in: prevPartIds } } });
        await prisma.orderItem.deleteMany({ where: { partId: { in: prevPartIds } } });
        await prisma.cartItem.deleteMany({ where: { userId: prevSeller.id } });
        await prisma.review.deleteMany({ where: { partId: { in: prevPartIds } } });
        await prisma.watchlist.deleteMany({ where: { partId: { in: prevPartIds } } });
        await prisma.message.deleteMany({ where: { partId: { in: prevPartIds } } });
      }
      // Clean up orders for test users before deleting parts
      const prevBuyer = await prisma.user.findUnique({ where: { email: "buyer@test.com" } });
      if (prevBuyer) {
        const prevOrders = await prisma.order.findMany({ where: { OR: [{ buyerId: prevBuyer.id }, { sellerId: prevSeller.id }] }, select: { id: true } });
        if (prevOrders.length > 0) {
          await prisma.orderItem.deleteMany({ where: { orderId: { in: prevOrders.map((o) => o.id) } } });
          await prisma.order.deleteMany({ where: { id: { in: prevOrders.map((o) => o.id) } } });
        }
      }
    }
    await prisma.offer.deleteMany({ where: { buyer: { email: { endsWith: "@test.com" } } } });
    await prisma.review.deleteMany({ where: { buyer: { email: { endsWith: "@test.com" } } } });
    await prisma.message.deleteMany({ where: { OR: [{ sender: { email: { endsWith: "@test.com" } } }, { receiver: { email: { endsWith: "@test.com" } } }] } });
    await prisma.cartItem.deleteMany({ where: { user: { email: { endsWith: "@test.com" } } } });
    await prisma.savedSearch.deleteMany({ where: { user: { email: { endsWith: "@test.com" } } } });
    await prisma.watchlist.deleteMany({ where: { user: { email: { endsWith: "@test.com" } } } });
    await prisma.part.deleteMany({ where: { seller: { email: { endsWith: "@test.com" } } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: "@test.com" } } });
    await prisma.vehicle.deleteMany({ where: { vin: "1HGBH41JXMN109186" } });

    // Create test users
    const buyer = await prisma.user.create({
      data: { email: "buyer@test.com", name: "Test Buyer", passwordHash, role: "BUYER" },
    });

    const seller = await prisma.user.create({
      data: {
        email: "seller@test.com",
        name: "Test Seller",
        passwordHash,
        role: "SELLER",
        sellerTier: "VERIFIED",
      },
    });

    await prisma.user.create({
      data: { email: "admin@test.com", name: "Test Admin", passwordHash, role: "ADMIN" },
    });

    // Create a donor vehicle owned by seller
    const vehicle = await prisma.vehicle.create({
      data: { year: 2015, make: "Toyota", model: "Camry", vin: "1HGBH41JXMN109186" },
    });

    // Create test parts
    await prisma.part.createMany({
      data: [
        {
          title: "Brake Pad Set - Toyota Camry 2015",
          description: "OEM brake pads, minimal wear",
          partType: "BRAKES",
          conditionGrade: "A",
          price: 45.0,
          status: "ACTIVE",
          sellerId: seller.id,
          vehicleId: vehicle.id,
        },
        {
          title: "Alternator - Toyota Camry 2015",
          description: "Tested and working",
          partType: "ELECTRICAL",
          conditionGrade: "B",
          price: 120.0,
          status: "ACTIVE",
          sellerId: seller.id,
          vehicleId: vehicle.id,
        },
        {
          title: "Front Bumper Cover",
          description: "Minor scuff on lower edge",
          partType: "BODY",
          conditionGrade: "C",
          price: 200.0,
          status: "ACTIVE",
          sellerId: seller.id,
          vehicleId: vehicle.id,
        },
      ],
    });

    console.log(
      `[seed-e2e] Created: buyer=${buyer.id}, seller=${seller.id}, 3 parts`
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Run when executed directly
seedE2E(process.env.DATABASE_URL!).catch((e) => {
  console.error(e);
  process.exit(1);
});

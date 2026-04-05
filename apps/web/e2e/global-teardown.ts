import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export default async function globalTeardown() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  try {
    await prisma.user.deleteMany({
      where: { email: { in: ["buyer@test.com", "seller@test.com", "admin@test.com"] } },
    });
  } finally {
    await prisma.$disconnect();
  }
}

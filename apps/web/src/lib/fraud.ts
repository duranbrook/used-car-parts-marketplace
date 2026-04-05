import { prisma } from "./prisma";

const VELOCITY_THRESHOLD = 50; // parts per hour before flagging

export async function checkListingVelocity(
  sellerId: string
): Promise<{ flagged: boolean; reason?: string }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const count = await prisma.part.count({
    where: {
      sellerId,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (count >= VELOCITY_THRESHOLD) {
    await prisma.fraudFlag.create({
      data: {
        targetId: sellerId,
        targetType: "user",
        type: "VELOCITY",
        details: `Listed ${count} parts in the last hour`,
      },
    });
    return { flagged: true, reason: `velocity: ${count} listings in 1 hour` };
  }

  return { flagged: false };
}

export async function checkPriceAnomaly(
  partType: string,
  price: number,
  sellerId: string,
  partId: string
): Promise<{ flagged: boolean; reason?: string }> {
  const recent = await prisma.part.findMany({
    where: { partType, status: "SOLD" },
    select: { price: true },
    take: 50,
    orderBy: { updatedAt: "desc" },
  });

  if (recent.length < 5) return { flagged: false };

  const avg = recent.reduce((sum, p) => sum + Number(p.price), 0) / recent.length;

  if (price < avg * 0.2 || price > avg * 5) {
    await prisma.fraudFlag.create({
      data: {
        targetId: partId,
        targetType: "part",
        type: "PRICE_ANOMALY",
        details: `Price $${price} vs avg $${avg.toFixed(2)} for ${partType}`,
      },
    });
    return {
      flagged: true,
      reason: `price anomaly: $${price} vs market avg $${avg.toFixed(2)}`,
    };
  }

  return { flagged: false };
}

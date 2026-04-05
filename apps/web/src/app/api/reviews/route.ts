import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { partId, sellerId, rating, comment } = await req.json();

  if (!sellerId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "sellerId and rating (1-5) are required" }, { status: 400 });
  }

  // Check if buyer actually purchased from this seller
  const order = await prisma.order.findFirst({
    where: {
      buyerId: session.user.id,
      sellerId,
      status: { in: ["DELIVERED", "COMPLETED"] },
    },
  });

  const review = await prisma.review.create({
    data: {
      buyerId: session.user.id,
      sellerId,
      partId: partId || null,
      rating,
      comment,
      verified: !!order,
    },
    include: {
      buyer: { select: { name: true } },
    },
  });

  return NextResponse.json(review, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sellerId = searchParams.get("sellerId");
  const partId = searchParams.get("partId");

  if (!sellerId && !partId) {
    return NextResponse.json({ error: "sellerId or partId required" }, { status: 400 });
  }

  const where: Record<string, unknown> = {};
  if (sellerId) where.sellerId = sellerId;
  if (partId) where.partId = partId;

  const reviews = await prisma.review.findMany({
    where,
    include: {
      buyer: { select: { name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return NextResponse.json({
    reviews,
    stats: {
      count: reviews.length,
      average: Math.round(avgRating * 10) / 10,
      distribution: {
        5: reviews.filter((r) => r.rating === 5).length,
        4: reviews.filter((r) => r.rating === 4).length,
        3: reviews.filter((r) => r.rating === 3).length,
        2: reviews.filter((r) => r.rating === 2).length,
        1: reviews.filter((r) => r.rating === 1).length,
      },
    },
  });
}

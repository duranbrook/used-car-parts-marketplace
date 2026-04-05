import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const seller = await prisma.user.findUnique({
    where: { id, role: "SELLER" },
    select: {
      id: true,
      name: true,
      image: true,
      location: true,
      phone: true,
      createdAt: true,
      _count: { select: { parts: { where: { status: "ACTIVE" } } } },
    },
  });

  if (!seller) {
    return NextResponse.json({ error: "Seller not found" }, { status: 404 });
  }

  const reviews = await prisma.review.findMany({
    where: { sellerId: id },
    select: { rating: true },
  });

  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const recentParts = await prisma.part.findMany({
    where: { sellerId: id, status: "ACTIVE" },
    include: { images: { where: { isPrimary: true }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return NextResponse.json({
    seller: {
      ...seller,
      activeParts: seller._count.parts,
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount: reviews.length,
    },
    recentParts,
  });
}

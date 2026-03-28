import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const sellerId = session.user.id;

  const [
    totalParts,
    activeParts,
    soldParts,
    totalOrders,
    totalViews,
    parts,
    orders,
    reviews,
  ] = await Promise.all([
    prisma.part.count({ where: { sellerId } }),
    prisma.part.count({ where: { sellerId, status: "ACTIVE" } }),
    prisma.part.count({ where: { sellerId, status: "SOLD" } }),
    prisma.order.count({ where: { sellerId } }),
    prisma.part.aggregate({ where: { sellerId }, _sum: { views: true } }),
    prisma.part.findMany({
      where: { sellerId },
      select: { id: true, title: true, price: true, views: true, status: true, createdAt: true, conditionGrade: true },
      orderBy: { views: "desc" },
      take: 10,
    }),
    prisma.order.findMany({
      where: { sellerId, status: "COMPLETED" },
      select: { total: true, createdAt: true },
    }),
    prisma.review.findMany({
      where: { sellerId },
      select: { rating: true },
    }),
  ]);

  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total.toString()), 0);
  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  // Inventory aging: parts older than 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const agingParts = await prisma.part.count({
    where: { sellerId, status: "ACTIVE", createdAt: { lt: thirtyDaysAgo } },
  });

  // Conversion rate
  const conversionRate = totalViews._sum.views
    ? (soldParts / (totalViews._sum.views || 1)) * 100
    : 0;

  return NextResponse.json({
    summary: {
      totalParts,
      activeParts,
      soldParts,
      totalOrders,
      totalViews: totalViews._sum.views || 0,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount: reviews.length,
      agingParts,
      conversionRate: Math.round(conversionRate * 100) / 100,
    },
    topParts: parts,
  });
}

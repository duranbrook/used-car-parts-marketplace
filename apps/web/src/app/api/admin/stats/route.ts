import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    totalUsers,
    totalSellers,
    totalBuyers,
    totalParts,
    activeParts,
    totalOrders,
    pendingOrders,
    totalReviews,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "SELLER" } }),
    prisma.user.count({ where: { role: "BUYER" } }),
    prisma.part.count(),
    prisma.part.count({ where: { status: "ACTIVE" } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.review.count(),
  ]);

  const recentOrders = await prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      buyer: { select: { name: true, email: true } },
      seller: { select: { name: true } },
    },
  });

  const recentUsers = await prisma.user.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json({
    stats: { totalUsers, totalSellers, totalBuyers, totalParts, activeParts, totalOrders, pendingOrders, totalReviews },
    recentOrders,
    recentUsers,
  });
}

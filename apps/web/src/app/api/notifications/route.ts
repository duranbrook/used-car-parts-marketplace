import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// In-app notifications stored as special messages to self
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Aggregate notifications from different sources
  const [unreadMessages, pendingOrders, newReviews] = await Promise.all([
    prisma.message.count({
      where: { receiverId: session.user.id, read: false },
    }),
    prisma.order.count({
      where: {
        OR: [
          { sellerId: session.user.id, status: "PENDING" },
          { buyerId: session.user.id, status: "SHIPPED" },
        ],
      },
    }),
    prisma.review.count({
      where: {
        sellerId: session.user.id,
        createdAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const notifications = [];

  if (unreadMessages > 0) {
    notifications.push({
      type: "messages",
      title: `${unreadMessages} unread message${unreadMessages > 1 ? "s" : ""}`,
      link: "/messages",
      count: unreadMessages,
    });
  }

  if (pendingOrders > 0) {
    notifications.push({
      type: "orders",
      title: `${pendingOrders} order${pendingOrders > 1 ? "s" : ""} need attention`,
      link: "/dashboard/orders",
      count: pendingOrders,
    });
  }

  if (newReviews > 0) {
    notifications.push({
      type: "reviews",
      title: `${newReviews} new review${newReviews > 1 ? "s" : ""} this week`,
      link: "/dashboard/analytics",
      count: newReviews,
    });
  }

  // Check saved searches for new matching parts
  const savedSearches = await prisma.savedSearch.findMany({
    where: { userId: session.user.id, notify: true, name: { not: { startsWith: "GARAGE:" } } },
  });

  for (const search of savedSearches) {
    try {
      const query = JSON.parse(search.query);
      const newParts = await prisma.part.count({
        where: {
          status: "ACTIVE",
          createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          ...(query.partType && { partType: { contains: query.partType, mode: "insensitive" as const } }),
          ...(query.q && { title: { contains: query.q, mode: "insensitive" as const } }),
        },
      });

      if (newParts > 0) {
        notifications.push({
          type: "saved_search",
          title: `${newParts} new parts matching "${search.name || "saved search"}"`,
          link: `/search?q=${encodeURIComponent(query.q || "")}`,
          count: newParts,
        });
      }
    } catch {
      // Invalid search query JSON
    }
  }

  return NextResponse.json({
    notifications,
    totalCount: notifications.reduce((sum, n) => sum + n.count, 0),
  });
}

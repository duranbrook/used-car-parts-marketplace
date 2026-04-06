import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sellers = await prisma.user.findMany({
    where: { role: "SELLER" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      sellerTier: true,
      holidayMode: true,
      createdAt: true,
      _count: { select: { parts: true, sellerOrders: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(sellers);
}

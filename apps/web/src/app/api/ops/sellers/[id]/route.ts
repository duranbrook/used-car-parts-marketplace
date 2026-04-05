import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const seller = await prisma.user.findUnique({
    where: { id },
    include: {
      parts: {
        select: { id: true, status: true, title: true, price: true },
        take: 10,
        orderBy: { createdAt: "desc" },
      },
      sellerOrders: {
        select: { id: true, status: true, total: true, createdAt: true },
        take: 10,
        orderBy: { createdAt: "desc" },
      },
      sellerReviews: {
        select: { rating: true, comment: true, createdAt: true },
        take: 10,
      },
    },
  });

  if (!seller) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(seller);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { action, tier } = (await req.json()) as {
    action: "suspend" | "unsuspend" | "ban" | "set_tier" | "verify";
    tier?: string;
  };

  const seller = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (!seller) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "set_tier") {
    const updated = await prisma.user.update({
      where: { id },
      data: { sellerTier: tier as never },
    });
    return NextResponse.json(updated);
  }

  if (action === "suspend") {
    await prisma.part.updateMany({
      where: { sellerId: id, status: "ACTIVE" },
      data: { status: "INACTIVE" },
    });
    const updated = await prisma.user.update({
      where: { id },
      data: { holidayMode: true, holidayMessage: "Account suspended" },
    });
    return NextResponse.json(updated);
  }

  if (action === "unsuspend") {
    await prisma.part.updateMany({
      where: { sellerId: id, status: "INACTIVE" },
      data: { status: "ACTIVE" },
    });
    const updated = await prisma.user.update({
      where: { id },
      data: { holidayMode: false, holidayMessage: null },
    });
    return NextResponse.json(updated);
  }

  if (action === "ban") {
    await prisma.part.updateMany({
      where: { sellerId: id },
      data: { status: "INACTIVE" },
    });
    const updated = await prisma.user.update({ where: { id }, data: { role: "BUYER" } });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

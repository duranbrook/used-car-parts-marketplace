import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId, reason, description, photos } = (await req.json()) as {
    orderId: string;
    reason: string;
    description?: string;
    photos?: string[];
  };

  const order = await prisma.order.findFirst({
    where: { id: orderId, buyerId: session.user.id },
    select: { id: true, sellerId: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const existing = await prisma.dispute.findUnique({ where: { orderId } });
  if (existing) {
    return NextResponse.json(
      { error: "Dispute already exists for this order" },
      { status: 409 }
    );
  }

  const dispute = await prisma.dispute.create({
    data: {
      orderId,
      buyerId: session.user.id,
      sellerId: order.sellerId,
      reason,
      description,
      photos: photos ?? [],
    },
  });

  return NextResponse.json(dispute, { status: 201 });
}

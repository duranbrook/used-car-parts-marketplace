import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: ["REFUNDED"],
  REFUNDED: [],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { status, trackingNumber, shippingCarrier } = await req.json();

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Only seller or buyer can update (depending on the transition)
  const isSeller = order.sellerId === session.user.id;
  const isBuyer = order.buyerId === session.user.id;

  if (!isSeller && !isBuyer) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Validate transition
  const allowed = VALID_TRANSITIONS[order.status] || [];
  if (!allowed.includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${order.status} to ${status}` },
      { status: 400 }
    );
  }

  // Sellers can confirm, ship; Buyers can mark delivered, complete
  if (["CONFIRMED", "SHIPPED"].includes(status) && !isSeller) {
    return NextResponse.json({ error: "Only seller can perform this action" }, { status: 403 });
  }
  if (["DELIVERED", "COMPLETED"].includes(status) && !isBuyer) {
    return NextResponse.json({ error: "Only buyer can perform this action" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = { status };
  if (trackingNumber) updateData.trackingNumber = trackingNumber;
  if (shippingCarrier) updateData.shippingCarrier = shippingCarrier;

  const updated = await prisma.order.update({
    where: { id },
    data: updateData,
    include: {
      items: { include: { part: true } },
      buyer: { select: { name: true, email: true } },
      seller: { select: { name: true, email: true } },
    },
  });

  // Update part status based on order status
  if (status === "COMPLETED") {
    await prisma.part.updateMany({
      where: { id: { in: order.items.map((i) => i.partId) } },
      data: { status: "SOLD" },
    });
  } else if (status === "CANCELLED" || status === "REFUNDED") {
    await prisma.part.updateMany({
      where: { id: { in: order.items.map((i) => i.partId) } },
      data: { status: "ACTIVE" },
    });
  }

  return NextResponse.json(updated);
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Return requests are stored as messages with a special format
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId, reason, description, photoUrls } = await req.json();

  if (!orderId || !reason) {
    return NextResponse.json({ error: "orderId and reason are required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { part: true } } },
  });

  if (!order || order.buyerId !== session.user.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!["DELIVERED", "COMPLETED"].includes(order.status)) {
    return NextResponse.json({ error: "Can only return delivered/completed orders" }, { status: 400 });
  }

  // Check warranty period (default 30 days)
  const daysSinceDelivery = Math.floor(
    (Date.now() - new Date(order.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceDelivery > 90) {
    return NextResponse.json({ error: "Return window has expired (90 days max)" }, { status: 400 });
  }

  // Create return request as a message to the seller
  const returnContent = JSON.stringify({
    type: "RETURN_REQUEST",
    orderId,
    reason,
    description,
    photoUrls: photoUrls || [],
    daysSinceDelivery,
    createdAt: new Date().toISOString(),
  });

  const message = await prisma.message.create({
    data: {
      senderId: session.user.id,
      receiverId: order.sellerId,
      content: returnContent,
    },
  });

  // Update order status
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "REFUNDED", notes: `Return requested: ${reason}` },
  });

  return NextResponse.json({ returnId: message.id, orderId, status: "RETURN_REQUESTED" }, { status: 201 });
}

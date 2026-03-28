import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { partIds } = await req.json();

  // Get cart items (or specific parts if partIds provided)
  const cartItems = await prisma.cartItem.findMany({
    where: {
      userId: session.user.id,
      ...(partIds?.length ? { partId: { in: partIds } } : {}),
    },
    include: {
      part: {
        include: { seller: { select: { id: true } } },
      },
    },
  });

  if (cartItems.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  // Group items by seller
  const bySeller = new Map<string, typeof cartItems>();
  for (const item of cartItems) {
    const sellerId = item.part.seller.id;
    if (!bySeller.has(sellerId)) bySeller.set(sellerId, []);
    bySeller.get(sellerId)!.push(item);
  }

  // Create one order per seller
  const orders = [];
  for (const [sellerId, items] of bySeller) {
    const subtotal = items.reduce(
      (sum, item) => sum + parseFloat(item.part.price.toString()) * item.quantity,
      0
    );
    const platformFee = Math.round(subtotal * 0.05 * 100) / 100; // 5% platform fee
    const shippingCost = 0; // TODO: calculate from ShipEngine
    const total = subtotal + platformFee + shippingCost;

    const order = await prisma.order.create({
      data: {
        buyerId: session.user.id,
        sellerId,
        subtotal,
        platformFee,
        shippingCost,
        total,
        status: "PENDING",
        items: {
          create: items.map((item) => ({
            partId: item.partId,
            quantity: item.quantity,
            price: item.part.price,
          })),
        },
      },
      include: { items: { include: { part: true } }, seller: { select: { name: true } } },
    });

    // Mark parts as reserved
    await prisma.part.updateMany({
      where: { id: { in: items.map((i) => i.partId) } },
      data: { status: "RESERVED" },
    });

    orders.push(order);
  }

  // Clear purchased items from cart
  await prisma.cartItem.deleteMany({
    where: {
      userId: session.user.id,
      partId: { in: cartItems.map((i) => i.partId) },
    },
  });

  return NextResponse.json({ orders }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isSeller = session.user.role === "SELLER" || session.user.role === "ADMIN";

  const orders = await prisma.order.findMany({
    where: isSeller
      ? { OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }] }
      : { buyerId: session.user.id },
    include: {
      items: {
        include: {
          part: {
            include: { images: { where: { isPrimary: true }, take: 1 } },
          },
        },
      },
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orders });
}

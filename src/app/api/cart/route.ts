import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.cartItem.findMany({
    where: { userId: session.user.id },
    include: {
      part: {
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          seller: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const subtotal = items.reduce(
    (sum, item) => sum + parseFloat(item.part.price.toString()) * item.quantity,
    0
  );

  return NextResponse.json({ items, subtotal });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { partId, quantity = 1 } = await req.json();
  if (!partId) {
    return NextResponse.json({ error: "partId is required" }, { status: 400 });
  }

  const part = await prisma.part.findUnique({ where: { id: partId } });
  if (!part || part.status !== "ACTIVE") {
    return NextResponse.json({ error: "Part not found or unavailable" }, { status: 404 });
  }
  if (part.sellerId === session.user.id) {
    return NextResponse.json({ error: "Cannot buy your own part" }, { status: 400 });
  }

  const item = await prisma.cartItem.upsert({
    where: { userId_partId: { userId: session.user.id, partId } },
    update: { quantity },
    create: { userId: session.user.id, partId, quantity },
    include: { part: true },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { partId } = await req.json();
  if (!partId) {
    return NextResponse.json({ error: "partId is required" }, { status: 400 });
  }

  await prisma.cartItem.deleteMany({
    where: { userId: session.user.id, partId },
  });

  return NextResponse.json({ ok: true });
}

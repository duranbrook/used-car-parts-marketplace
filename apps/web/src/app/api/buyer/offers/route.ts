import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { partId, amount } = (await req.json()) as { partId: string; amount: number };

  if (!partId || !amount || amount <= 0) {
    return NextResponse.json({ error: "partId and positive amount required" }, { status: 400 });
  }

  const part = await prisma.part.findUnique({
    where: { id: partId, status: "ACTIVE" },
    select: { sellerId: true, price: true },
  });
  if (!part) return NextResponse.json({ error: "Part not found" }, { status: 404 });

  if (part.sellerId === session.user.id) {
    return NextResponse.json({ error: "Cannot offer on your own listing" }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  const offer = await prisma.offer.create({
    data: {
      partId,
      buyerId: session.user.id,
      sellerId: part.sellerId,
      amount,
      expiresAt,
    },
  });

  return NextResponse.json(offer, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const offers = await prisma.offer.findMany({
    where: { buyerId: session.user.id },
    include: { part: { select: { id: true, title: true, price: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(offers);
}

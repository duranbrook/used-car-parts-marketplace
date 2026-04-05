import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.watchlist.findMany({
    where: { userId: session.user.id },
    include: {
      part: {
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          seller: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { partId } = await req.json();
  if (!partId) return NextResponse.json({ error: "partId required" }, { status: 400 });

  const item = await prisma.watchlist.upsert({
    where: { userId_partId: { userId: session.user.id, partId } },
    update: {},
    create: { userId: session.user.id, partId },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { partId } = await req.json();
  await prisma.watchlist.deleteMany({ where: { userId: session.user.id, partId } });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const RESERVATION_MINUTES = 30;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { partId } = (await req.json()) as { partId: string };

  const part = await prisma.part.findFirst({
    where: { id: partId, status: "ACTIVE" },
    select: { id: true, reservedBy: true, reservedUntil: true },
  });

  if (!part) return NextResponse.json({ error: "Part not available" }, { status: 404 });

  if (
    part.reservedBy &&
    part.reservedBy !== session.user.id &&
    part.reservedUntil &&
    part.reservedUntil > new Date()
  ) {
    const minutesLeft = Math.ceil((part.reservedUntil.getTime() - Date.now()) / 60000);
    return NextResponse.json(
      { error: `Part is reserved by another buyer for ${minutesLeft} more minutes` },
      { status: 409 }
    );
  }

  const reservedUntil = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);

  await prisma.part.update({
    where: { id: partId },
    data: { reservedBy: session.user.id, reservedUntil },
  });

  return NextResponse.json({ reserved: true, reservedUntil });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { partId } = (await req.json()) as { partId: string };

  await prisma.part.updateMany({
    where: { id: partId, reservedBy: session.user.id },
    data: { reservedBy: null, reservedUntil: null },
  });

  return NextResponse.json({ released: true });
}

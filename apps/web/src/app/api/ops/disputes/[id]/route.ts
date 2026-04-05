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
  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: {
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, name: true, email: true } },
      order: {
        include: {
          items: { include: { part: { select: { id: true, title: true } } } },
        },
      },
    },
  });

  if (!dispute) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(dispute);
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
  const { status, resolution } = (await req.json()) as {
    status: "RESOLVED_BUYER" | "RESOLVED_SELLER" | "RESOLVED_SPLIT" | "CLOSED";
    resolution: string;
  };

  const dispute = await prisma.dispute.update({
    where: { id },
    data: {
      status,
      resolution,
      resolvedBy: session.user.id,
      resolvedAt: new Date(),
    },
  });

  return NextResponse.json(dispute);
}

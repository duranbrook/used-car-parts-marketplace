import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { action, counterAmount } = (await req.json()) as {
    action: "accept" | "decline" | "counter";
    counterAmount?: number;
  };

  const offer = await prisma.offer.findFirst({
    where: { id, sellerId: session.user.id, status: "PENDING" },
  });
  if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });

  const statusMap = {
    accept: "ACCEPTED",
    decline: "DECLINED",
    counter: "COUNTERED",
  } as const;

  const updated = await prisma.offer.update({
    where: { id },
    data: {
      status: statusMap[action],
      ...(action === "counter" && counterAmount ? { counterAmount } : {}),
    },
  });

  return NextResponse.json(updated);
}

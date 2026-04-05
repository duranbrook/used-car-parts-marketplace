import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code, subtotal } = (await req.json()) as { code: string; subtotal: number };

  const discount = await prisma.discountCode.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!discount || !discount.active) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 404 });
  }

  if (discount.expiresAt && discount.expiresAt < new Date()) {
    return NextResponse.json({ error: "Code has expired" }, { status: 410 });
  }

  if (discount.maxUses && discount.usedCount >= discount.maxUses) {
    return NextResponse.json({ error: "Code has reached its usage limit" }, { status: 410 });
  }

  let discountAmount = 0;
  if (discount.type === "percent" && discount.value) {
    discountAmount = (subtotal * Number(discount.value)) / 100;
  } else if (discount.type === "flat" && discount.value) {
    discountAmount = Math.min(Number(discount.value), subtotal);
  }

  return NextResponse.json({
    valid: true,
    code: discount.code,
    type: discount.type,
    discountAmount: Math.round(discountAmount * 100) / 100,
    freeShipping: discount.type === "free_shipping",
  });
}

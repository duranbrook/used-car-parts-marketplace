import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "ADMIN" ? session : null;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const codes = await prisma.discountCode.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(codes);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { code, type, value, maxUses, expiresAt } = (await req.json()) as {
    code: string;
    type: "percent" | "flat" | "free_shipping";
    value?: number;
    maxUses?: number;
    expiresAt?: string;
  };

  const discount = await prisma.discountCode.create({
    data: {
      code: code.toUpperCase(),
      type,
      value,
      maxUses,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: session.user.id,
    },
  });

  return NextResponse.json(discount, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SELLER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sellers only" }, { status: 403 });
  }

  const { enabled, message } = (await req.json()) as { enabled: boolean; message?: string };

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      holidayMode: enabled,
      holidayMessage: enabled ? (message ?? null) : null,
    },
    select: { holidayMode: true, holidayMessage: true },
  });

  return NextResponse.json(user);
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { holidayMode: true, holidayMessage: true },
  });

  return NextResponse.json(user);
}

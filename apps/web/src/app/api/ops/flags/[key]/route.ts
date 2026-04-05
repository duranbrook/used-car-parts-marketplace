import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invalidateFlagCache } from "@/lib/flags";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { key } = await params;
  const { enabled } = (await req.json()) as { enabled: boolean };

  const flag = await prisma.featureFlag.update({
    where: { key },
    data: { enabled, updatedBy: session.user.id },
  });

  invalidateFlagCache();
  return NextResponse.json(flag);
}

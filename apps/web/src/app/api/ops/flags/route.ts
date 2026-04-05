import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invalidateFlagCache } from "@/lib/flags";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const flags = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json(flags);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { key, enabled, description } = (await req.json()) as {
    key: string;
    enabled: boolean;
    description?: string;
  };

  const flag = await prisma.featureFlag.upsert({
    where: { key },
    update: { enabled, updatedBy: session.user.id },
    create: { key, enabled, description, updatedBy: session.user.id },
  });

  invalidateFlagCache();
  return NextResponse.json(flag);
}

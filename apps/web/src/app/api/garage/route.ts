import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Saved vehicles (buyer's garage)
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Use saved searches with a special prefix to store garage vehicles
  const vehicles = await prisma.savedSearch.findMany({
    where: {
      userId: session.user.id,
      name: { startsWith: "GARAGE:" },
    },
    orderBy: { createdAt: "desc" },
  });

  const parsed = vehicles.map((v) => ({
    id: v.id,
    ...JSON.parse(v.query),
    createdAt: v.createdAt,
  }));

  return NextResponse.json({ vehicles: parsed });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { year, make, model, trim, vin, nickname } = await req.json();
  if (!year || !make || !model) {
    return NextResponse.json({ error: "year, make, and model required" }, { status: 400 });
  }

  const vehicle = await prisma.savedSearch.create({
    data: {
      userId: session.user.id,
      name: `GARAGE:${nickname || `${year} ${make} ${model}`}`,
      query: JSON.stringify({ year, make, model, trim, vin, nickname }),
      notify: true,
    },
  });

  return NextResponse.json({ id: vehicle.id, year, make, model, trim, vin, nickname }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await prisma.savedSearch.deleteMany({ where: { id, userId: session.user.id } });

  return NextResponse.json({ ok: true });
}

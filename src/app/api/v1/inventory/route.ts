import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// External API for yard management systems to sync inventory
// Authentication via API key in header

async function authenticateApiKey(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return null;

  // For now, API key is stored as the user's phone field (placeholder)
  // In production, use a proper API key table
  const user = await prisma.user.findFirst({
    where: { phone: apiKey, role: "SELLER" },
  });

  return user;
}

export async function GET(req: NextRequest) {
  const user = await authenticateApiKey(req);
  if (!user) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "ACTIVE";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);

  const parts = await prisma.part.findMany({
    where: { sellerId: user.id, status: status as "ACTIVE" | "DRAFT" | "SOLD" },
    include: {
      images: true,
      donorVehicle: true,
      compatibility: { include: { vehicle: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const total = await prisma.part.count({ where: { sellerId: user.id, status: status as "ACTIVE" } });

  return NextResponse.json({
    data: parts,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(req: NextRequest) {
  const user = await authenticateApiKey(req);
  if (!user) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const body = await req.json();

  // Support batch creation
  const items = Array.isArray(body) ? body : [body];
  const results = [];

  for (const item of items) {
    const { title, partType, conditionGrade, price, description, partNumber, hollanderNumber, weight, quantity, donorVehicle, images } = item;

    if (!title || !partType || !conditionGrade || !price) {
      results.push({ error: "Missing required fields", item });
      continue;
    }

    let vehicleId: string | undefined;
    if (donorVehicle?.year && donorVehicle?.make && donorVehicle?.model) {
      const vehicle = donorVehicle.vin
        ? await prisma.vehicle.upsert({
            where: { vin: donorVehicle.vin },
            update: {},
            create: { vin: donorVehicle.vin, year: donorVehicle.year, make: donorVehicle.make, model: donorVehicle.model },
          })
        : await prisma.vehicle.create({
            data: { year: donorVehicle.year, make: donorVehicle.make, model: donorVehicle.model },
          });
      vehicleId = vehicle.id;
    }

    const part = await prisma.part.create({
      data: {
        sellerId: user.id,
        vehicleId,
        title,
        partType,
        conditionGrade,
        price,
        description,
        partNumber,
        hollanderNumber,
        weight,
        quantity: quantity || 1,
        status: "ACTIVE",
        images: images?.length
          ? { create: images.map((img: { url: string }, i: number) => ({ url: img.url, isPrimary: i === 0, order: i })) }
          : undefined,
      },
    });

    results.push({ id: part.id, title: part.title, status: "created" });
  }

  return NextResponse.json({ results }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await authenticateApiKey(req);
  if (!user) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const { partIds } = await req.json();
  if (!partIds?.length) {
    return NextResponse.json({ error: "partIds required" }, { status: 400 });
  }

  const result = await prisma.part.updateMany({
    where: { id: { in: partIds }, sellerId: user.id },
    data: { status: "INACTIVE" },
  });

  return NextResponse.json({ deactivated: result.count });
}

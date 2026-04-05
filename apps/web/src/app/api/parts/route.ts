import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SELLER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only sellers can create listings" }, { status: 403 });
  }

  const body = await req.json();
  const {
    title,
    description,
    partType,
    partNumber,
    hollanderNumber,
    conditionGrade,
    conditionNotes,
    price,
    quantity,
    weight,
    images,
    compatibility,
    donorVehicle,
  } = body;

  if (!title || !partType || !conditionGrade || !price) {
    return NextResponse.json(
      { error: "Title, part type, condition grade, and price are required" },
      { status: 400 }
    );
  }

  // Create or find donor vehicle if VIN provided
  let vehicleId: string | undefined;
  if (donorVehicle?.vin || (donorVehicle?.year && donorVehicle?.make && donorVehicle?.model)) {
    const vehicle = donorVehicle.vin
      ? await prisma.vehicle.upsert({
          where: { vin: donorVehicle.vin },
          update: {},
          create: {
            vin: donorVehicle.vin,
            year: donorVehicle.year,
            make: donorVehicle.make,
            model: donorVehicle.model,
            trim: donorVehicle.trim,
            engineType: donorVehicle.engineType,
          },
        })
      : await prisma.vehicle.create({
          data: {
            year: donorVehicle.year,
            make: donorVehicle.make,
            model: donorVehicle.model,
            trim: donorVehicle.trim,
            engineType: donorVehicle.engineType,
          },
        });
    vehicleId = vehicle.id;
  }

  const part = await prisma.part.create({
    data: {
      sellerId: session.user.id,
      vehicleId,
      title,
      description,
      partType,
      partNumber,
      hollanderNumber,
      conditionGrade,
      conditionNotes,
      price,
      quantity: quantity || 1,
      weight,
      status: "ACTIVE",
      images: images?.length
        ? {
            create: images.map((img: { url: string; aiTags?: string }, i: number) => ({
              url: img.url,
              isPrimary: i === 0,
              aiTags: img.aiTags,
              order: i,
            })),
          }
        : undefined,
      compatibility: compatibility?.length
        ? {
            create: await Promise.all(
              compatibility.map(
                async (c: { year: number; make: string; model: string; yearStart?: number; yearEnd?: number }) => {
                  const vehicle = await prisma.vehicle.create({
                    data: { year: c.year, make: c.make, model: c.model },
                  });
                  return {
                    vehicleId: vehicle.id,
                    yearStart: c.yearStart,
                    yearEnd: c.yearEnd,
                  };
                }
              )
            ),
          }
        : undefined,
    },
    include: {
      images: true,
      compatibility: { include: { vehicle: true } },
      donorVehicle: true,
    },
  });

  return NextResponse.json(part, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const partType = searchParams.get("partType");
  const make = searchParams.get("make");
  const model = searchParams.get("model");
  const year = searchParams.get("year");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const conditionGrade = searchParams.get("conditionGrade");
  const q = searchParams.get("q");

  const where: Record<string, unknown> = { status: "ACTIVE" };

  if (partType) where.partType = partType;
  if (conditionGrade) where.conditionGrade = conditionGrade;
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) (where.price as Record<string, unknown>).gte = parseFloat(minPrice);
    if (maxPrice) (where.price as Record<string, unknown>).lte = parseFloat(maxPrice);
  }
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { partType: { contains: q, mode: "insensitive" } },
    ];
  }
  if (make || model || year) {
    where.compatibility = {
      some: {
        vehicle: {
          ...(make && { make: { equals: make, mode: "insensitive" } }),
          ...(model && { model: { equals: model, mode: "insensitive" } }),
          ...(year && { year: parseInt(year) }),
        },
      },
    };
  }

  const [parts, total] = await Promise.all([
    prisma.part.findMany({
      where,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        seller: { select: { id: true, name: true } },
        donorVehicle: { select: { year: true, make: true, model: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.part.count({ where }),
  ]);

  return NextResponse.json({
    parts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

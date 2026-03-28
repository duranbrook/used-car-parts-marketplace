import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const partType = searchParams.get("partType");
  const make = searchParams.get("make");
  const model = searchParams.get("model");

  if (!partType) {
    return NextResponse.json({ error: "partType is required" }, { status: 400 });
  }

  const where: Record<string, unknown> = {
    partType: { equals: partType, mode: "insensitive" },
    status: { in: ["ACTIVE", "SOLD"] },
  };

  if (make || model) {
    where.donorVehicle = {
      ...(make && { make: { equals: make, mode: "insensitive" } }),
      ...(model && { model: { equals: model, mode: "insensitive" } }),
    };
  }

  const parts = await prisma.part.findMany({
    where,
    select: {
      price: true,
      conditionGrade: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const prices = parts.map((p) => parseFloat(p.price.toString()));
  const soldPrices = parts.filter((p) => p.status === "SOLD").map((p) => parseFloat(p.price.toString()));

  const gradeBreakdown = {
    A: parts.filter((p) => p.conditionGrade === "A").map((p) => parseFloat(p.price.toString())),
    B: parts.filter((p) => p.conditionGrade === "B").map((p) => parseFloat(p.price.toString())),
    C: parts.filter((p) => p.conditionGrade === "C").map((p) => parseFloat(p.price.toString())),
  };

  const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : null;
  const med = (arr: number[]) => {
    if (!arr.length) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  return NextResponse.json({
    partType,
    make,
    model,
    sampleSize: parts.length,
    pricing: {
      average: avg(prices),
      median: med(prices),
      low: prices.length ? Math.min(...prices) : null,
      high: prices.length ? Math.max(...prices) : null,
      soldAverage: avg(soldPrices),
    },
    byGrade: {
      A: { count: gradeBreakdown.A.length, average: avg(gradeBreakdown.A), median: med(gradeBreakdown.A) },
      B: { count: gradeBreakdown.B.length, average: avg(gradeBreakdown.B), median: med(gradeBreakdown.B) },
      C: { count: gradeBreakdown.C.length, average: avg(gradeBreakdown.C), median: med(gradeBreakdown.C) },
    },
  });
}

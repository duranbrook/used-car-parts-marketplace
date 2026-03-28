import { NextRequest, NextResponse } from "next/server";

interface NHTSAResult {
  Variable: string;
  Value: string | null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ vin: string }> }
) {
  const { vin } = await params;

  if (!vin || vin.length !== 17) {
    return NextResponse.json({ error: "VIN must be 17 characters" }, { status: 400 });
  }

  const res = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to decode VIN" }, { status: 502 });
  }

  const data = await res.json();
  const results = data.Results?.[0];

  if (!results) {
    return NextResponse.json({ error: "No results found" }, { status: 404 });
  }

  return NextResponse.json({
    vin,
    year: results.ModelYear ? parseInt(results.ModelYear) : null,
    make: results.Make || null,
    model: results.Model || null,
    trim: results.Trim || null,
    engineType: [results.EngineConfiguration, results.DisplacementL && `${results.DisplacementL}L`, results.FuelTypePrimary]
      .filter(Boolean)
      .join(" ") || null,
    transmission: results.TransmissionStyle || null,
    driveType: results.DriveType || null,
    bodyType: results.BodyClass || null,
  });
}

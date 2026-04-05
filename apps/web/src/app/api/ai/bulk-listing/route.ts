import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { year, make, model, trim, engineType } = await req.json();

  if (!year || !make || !model) {
    return NextResponse.json({ error: "Year, make, and model are required" }, { status: 400 });
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are an expert automotive recycler. A junkyard has just received a ${year} ${make} ${model}${trim ? ` ${trim}` : ""}${engineType ? ` (${engineType})` : ""} for disassembly.

List ALL commonly harvestable and sellable parts from this vehicle. For each part, provide:

{
  "parts": [
    {
      "partType": "engine",
      "suggestedTitle": "2018 Honda Civic 1.5L Turbo Engine Assembly",
      "category": "powertrain" | "body" | "electrical" | "interior" | "suspension" | "brakes" | "cooling" | "exhaust" | "fuel" | "other",
      "estimatedWeight": 350,
      "avgPriceGradeA": 2500,
      "avgPriceGradeB": 1800,
      "avgPriceGradeC": 1200,
      "demandLevel": "high" | "medium" | "low",
      "notes": "Check for timing chain issues common in this model"
    }
  ]
}

Include parts from ALL categories: engine, transmission, body panels (doors, fenders, hood, trunk, bumpers), lights (headlights, taillights, fog lights), mirrors, wheels/rims, interior (seats, dashboard, steering wheel, radio/infotainment), glass (windshield, windows), suspension components, brakes, radiator, AC components, alternator, starter, catalytic converter, exhaust, fuel pump, ECU/computers, wiring harnesses, etc.

Be specific to THIS vehicle — use correct part descriptions for the ${year} ${make} ${model}. Include both left and right side parts where applicable.

Return ONLY the JSON object.`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json({ error: "No response from AI" }, { status: 500 });
  }

  try {
    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const result = JSON.parse(jsonStr);
    return NextResponse.json({
      vehicle: { year, make, model, trim, engineType },
      ...result,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to parse AI response", raw: textBlock.text },
      { status: 500 }
    );
  }
}

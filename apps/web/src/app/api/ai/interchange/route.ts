import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const { partType, year, make, model } = await req.json();

  if (!partType || !year || !make || !model) {
    return NextResponse.json({ error: "partType, year, make, and model are required" }, { status: 400 });
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `You are an automotive parts interchange expert. For a ${partType} from a ${year} ${make} ${model}, list all vehicles that use an interchangeable/compatible part.

Return a JSON object:
{
  "originalVehicle": {"year": ${year}, "make": "${make}", "model": "${model}"},
  "partType": "${partType}",
  "interchangeableVehicles": [
    {"yearStart": 2016, "yearEnd": 2021, "make": "Honda", "model": "Civic", "notes": "Same part number across all trims"},
    {"yearStart": 2016, "yearEnd": 2021, "make": "Honda", "model": "Civic Si", "notes": "Same housing, different bulb"}
  ],
  "notes": "Any important notes about compatibility differences"
}

Be accurate. Only include vehicles where the part is genuinely interchangeable. Include year ranges. Return ONLY JSON.`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json({ error: "No response" }, { status: 500 });
  }

  try {
    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    return NextResponse.json(JSON.parse(jsonStr));
  } catch {
    return NextResponse.json({ error: "Failed to parse", raw: textBlock.text }, { status: 500 });
  }
}

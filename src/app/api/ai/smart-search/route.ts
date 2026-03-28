import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const { query } = await req.json();

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `You are a search query parser for a used car parts marketplace. Convert this natural language search into structured filters.

User query: "${query}"

Return a JSON object with these fields (only include fields that can be inferred from the query):
{
  "q": "keyword search terms",
  "partType": "the part type if mentioned (e.g., headlight, engine, door, bumper)",
  "year": "vehicle year if mentioned",
  "make": "vehicle make if mentioned (e.g., Honda, Toyota, Ford)",
  "model": "vehicle model if mentioned (e.g., Civic, Camry, F-150)",
  "conditionGrade": "A, B, or C if a condition is implied",
  "maxPrice": "max price if a budget is mentioned",
  "minPrice": "min price if mentioned"
}

Examples:
- "cheap headlight for 2018 civic" → {"q": "headlight", "partType": "headlight", "year": "2018", "make": "Honda", "model": "Civic", "maxPrice": "100"}
- "driver side mirror toyota camry" → {"q": "driver side mirror", "partType": "mirror", "make": "Toyota", "model": "Camry"}
- "good condition engine under 2000" → {"q": "engine", "partType": "engine", "conditionGrade": "A", "maxPrice": "2000"}

Return ONLY the JSON object.`,
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
    // Fall back to simple keyword search
    return NextResponse.json({ q: query });
  }
}

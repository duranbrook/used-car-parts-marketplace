import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const { partType, conditionGrade, year, make, model, description } = await req.json();

  if (!partType) {
    return NextResponse.json({ error: "partType is required" }, { status: 400 });
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `You are an expert used auto parts pricing analyst. Based on your knowledge of used auto parts market prices, suggest a price range for this part:

Part Type: ${partType}
Condition Grade: ${conditionGrade || "B"} (A=excellent, B=good, C=fair)
${year ? `Vehicle Year: ${year}` : ""}
${make ? `Make: ${make}` : ""}
${model ? `Model: ${model}` : ""}
${description ? `Description: ${description}` : ""}

Return ONLY a JSON object with:
{
  "lowPrice": <number - low end of fair market value>,
  "suggestedPrice": <number - recommended listing price>,
  "highPrice": <number - high end / asking price>,
  "reasoning": "<brief explanation of pricing factors>",
  "marketDemand": "high" | "medium" | "low"
}

Base prices on typical US used parts market values. Consider that Grade A parts command 30-50% premium over Grade B, and Grade C is typically 30-40% below Grade B. Return ONLY JSON.`,
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
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse AI response", raw: textBlock.text },
      { status: 500 }
    );
  }
}

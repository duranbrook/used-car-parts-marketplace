import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const { imageUrl, imageBase64, mimeType, partType } = await req.json();

  if (!imageUrl && !imageBase64) {
    return NextResponse.json({ error: "Image required" }, { status: 400 });
  }

  const imageContent: Anthropic.ImageBlockParam = imageBase64
    ? { type: "image", source: { type: "base64", media_type: mimeType || "image/jpeg", data: imageBase64 } }
    : { type: "image", source: { type: "url", url: imageUrl } };

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          imageContent,
          {
            type: "text",
            text: `You are an expert auto parts condition assessor using the ARA/URG grading standard.

Analyze this image of a ${partType || "car part"} and assess its condition.

The grading system:
- Grade A: Highest quality. Less than 60K miles. Minimal wear, no visible damage.
- Grade B: Good quality. 60K-200K miles. Minor cosmetic issues, fully functional.
- Grade C: Acceptable. 200K+ miles. Significant wear but functional.

Damage is measured in "credit card units" — each defect compared to a standard credit card's surface area.

Return ONLY a JSON object:
{
  "suggestedGrade": "A" | "B" | "C",
  "confidence": 0.0-1.0,
  "damageUnits": <number of credit-card-sized damage areas detected>,
  "defects": [
    {"type": "scratch" | "dent" | "rust" | "crack" | "discoloration" | "wear" | "missing_part", "severity": "minor" | "moderate" | "severe", "location": "description of where on the part"}
  ],
  "overallAssessment": "brief summary of condition",
  "warnings": ["any concerns about misrepresentation or hidden damage"]
}`,
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json({ error: "No response" }, { status: 500 });
  }

  try {
    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    return NextResponse.json(JSON.parse(jsonStr));
  } catch {
    return NextResponse.json({ error: "Failed to parse", raw: textBlock.text }, { status: 500 });
  }
}

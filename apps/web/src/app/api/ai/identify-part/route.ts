import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const { imageUrl, imageBase64, mimeType } = await req.json();

  if (!imageUrl && !imageBase64) {
    return NextResponse.json(
      { error: "Either imageUrl or imageBase64 is required" },
      { status: 400 }
    );
  }

  const imageContent: Anthropic.ImageBlockParam = imageBase64
    ? {
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType || "image/jpeg",
          data: imageBase64,
        },
      }
    : {
        type: "image",
        source: {
          type: "url",
          url: imageUrl,
        },
      };

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
            text: `You are an expert automotive parts identifier. Analyze this image of a car part and return a JSON object with the following fields:

{
  "partType": "the type of part (e.g., headlight, engine, door, bumper, alternator, etc.)",
  "suggestedTitle": "a descriptive listing title for this part",
  "description": "brief description of what you see, including any visible damage or wear",
  "conditionGrade": "A, B, or C based on visible condition (A=excellent/minimal wear, B=good/moderate wear, C=fair/significant wear)",
  "conditionNotes": "specific notes about condition you observe",
  "possibleVehicles": [
    {"yearStart": 2016, "yearEnd": 2021, "make": "Honda", "model": "Civic"}
  ],
  "estimatedWeight": "weight in pounds if you can estimate, or null",
  "confidence": "high, medium, or low - how confident you are in this identification"
}

Be specific about the part type. If you can identify the make/model it's from based on design cues, include that. If you can see part numbers, include them. Return ONLY the JSON object, no other text.`,
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json({ error: "No response from AI" }, { status: 500 });
  }

  try {
    // Extract JSON from the response (handle potential markdown code blocks)
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

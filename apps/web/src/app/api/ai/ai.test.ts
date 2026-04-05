import { describe, it, expect, vi } from "vitest";

// Mock the Anthropic SDK
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                partType: "headlight",
                suggestedTitle: "2018 Honda Civic Driver Side Headlight Assembly",
                description: "LED headlight assembly in good condition",
                conditionGrade: "B",
                conditionNotes: "Minor scratches on lens",
                possibleVehicles: [
                  { yearStart: 2016, yearEnd: 2021, make: "Honda", model: "Civic" },
                ],
                estimatedWeight: "8",
                confidence: "high",
              }),
            },
          ],
        }),
      };
    },
  };
});

describe("AI Part Identification API", () => {
  it("rejects requests without image", async () => {
    const { POST } = await import("./identify-part/route");
    const req = new Request("http://localhost/api/ai/identify-part", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("returns parsed AI identification for a URL image", async () => {
    const { POST } = await import("./identify-part/route");
    const req = new Request("http://localhost/api/ai/identify-part", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: "https://example.com/headlight.jpg" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.partType).toBe("headlight");
    expect(data.confidence).toBe("high");
    expect(data.possibleVehicles).toHaveLength(1);
  });
});

describe("AI Price Suggestion API", () => {
  it("rejects requests without partType", async () => {
    // Re-mock for price endpoint
    vi.doMock("@anthropic-ai/sdk", () => ({
      default: class {
        messages = {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: '{"lowPrice": 50, "suggestedPrice": 75, "highPrice": 100, "reasoning": "test", "marketDemand": "medium"}' }],
          }),
        };
      },
    }));

    const { POST } = await import("./suggest-price/route");
    const req = new Request("http://localhost/api/ai/suggest-price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });
});

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "seller-1", role: "SELLER" },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: "seller-1",
        name: "Joe",
        image: "https://example.com/photo.jpg",
        phone: null,
        location: null,
        businessName: null,
      }),
    },
    part: {
      count: vi.fn().mockResolvedValue(0),
    },
    order: {
      count: vi.fn().mockResolvedValue(0),
    },
  },
}));

describe("GET /api/seller/onboarding", () => {
  it("returns checklist with completed steps", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/seller/onboarding");

    const res = await GET(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("steps");
    expect(body.steps).toBeInstanceOf(Array);
    expect(body.percentComplete).toBeGreaterThanOrEqual(0);

    const profileStep = body.steps.find((s: { id: string }) => s.id === "profile");
    expect(profileStep).toBeDefined();
    expect(profileStep.completed).toBe(true); // has name and image
  });
});

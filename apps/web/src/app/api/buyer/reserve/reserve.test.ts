import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "buyer-1", role: "BUYER" } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    part: {
      findFirst: vi.fn().mockResolvedValue({
        id: "part-1",
        status: "ACTIVE",
        reservedBy: null,
        reservedUntil: null,
      }),
      update: vi.fn().mockResolvedValue({ id: "part-1", reservedBy: "buyer-1" }),
    },
  },
}));

describe("POST /api/buyer/reserve", () => {
  it("reserves an available part for 30 minutes", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/buyer/reserve", {
      method: "POST",
      body: JSON.stringify({ partId: "part-1" }),
    });

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reserved).toBe(true);
  });

  it("returns 409 when part is already reserved by another buyer", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.part.findFirst).mockResolvedValueOnce({
      id: "part-1",
      status: "ACTIVE",
      reservedBy: "other-buyer",
      reservedUntil: new Date(Date.now() + 1000 * 60 * 20),
    } as never);

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/buyer/reserve", {
      method: "POST",
      body: JSON.stringify({ partId: "part-1" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(409);
  });
});

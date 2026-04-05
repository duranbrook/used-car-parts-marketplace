import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "buyer-1", role: "BUYER" } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    discountCode: {
      findUnique: vi.fn(),
    },
  },
}));

describe("POST /api/buyer/discount", () => {
  it("returns discount details for a valid active code", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.discountCode.findUnique).mockResolvedValueOnce({
      id: "dc1",
      code: "SAVE10",
      type: "percent",
      value: 10,
      maxUses: 100,
      usedCount: 5,
      expiresAt: new Date(Date.now() + 86400000),
      active: true,
    } as never);

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/buyer/discount", {
      method: "POST",
      body: JSON.stringify({ code: "SAVE10", subtotal: 200 }),
    });

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.valid).toBe(true);
    expect(body.discountAmount).toBe(20);
  });

  it("returns 404 for unknown code", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.discountCode.findUnique).mockResolvedValueOnce(null);

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/buyer/discount", {
      method: "POST",
      body: JSON.stringify({ code: "INVALID", subtotal: 200 }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(404);
  });
});

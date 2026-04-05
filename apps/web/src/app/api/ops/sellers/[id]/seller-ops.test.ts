import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: "seller-1", role: "SELLER", sellerTier: "NEW" }),
      update: vi
        .fn()
        .mockImplementation(({ data }) => Promise.resolve({ id: "seller-1", ...data })),
    },
    part: {
      updateMany: vi.fn().mockResolvedValue({ count: 5 }),
    },
  },
}));

describe("PATCH /api/ops/sellers/[id]", () => {
  it("updates seller tier", async () => {
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/ops/sellers/seller-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "set_tier", tier: "VERIFIED" }),
    });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: "seller-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sellerTier).toBe("VERIFIED");
  });

  it("suspends seller and hides their listings", async () => {
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/ops/sellers/seller-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "suspend" }),
    });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: "seller-1" }) });
    expect(res.status).toBe(200);
  });
});

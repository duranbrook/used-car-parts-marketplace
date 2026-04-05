import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "seller-1", role: "SELLER" } }),
}));

const mockOffer = {
  id: "offer-1",
  partId: "part-1",
  buyerId: "buyer-1",
  sellerId: "seller-1",
  amount: "80.00",
  status: "PENDING",
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    offer: {
      findFirst: vi.fn().mockResolvedValue(mockOffer),
      update: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ ...mockOffer, ...data })
      ),
    },
  },
}));

describe("PATCH /api/seller/offers/[id]", () => {
  it("accepts an offer", async () => {
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/seller/offers/offer-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "accept" }),
    });

    const res = await PATCH(req as never, { params: Promise.resolve({ id: "offer-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ACCEPTED");
  });

  it("counters an offer with a new amount", async () => {
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/seller/offers/offer-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "counter", counterAmount: 95 }),
    });

    const res = await PATCH(req as never, { params: Promise.resolve({ id: "offer-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("COUNTERED");
    expect(body.counterAmount).toBe(95);
  });

  it("declines an offer", async () => {
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/seller/offers/offer-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "decline" }),
    });

    const res = await PATCH(req as never, { params: Promise.resolve({ id: "offer-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("DECLINED");
  });
});

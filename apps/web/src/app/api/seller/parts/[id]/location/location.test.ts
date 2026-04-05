import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "seller-1", role: "SELLER" } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    part: {
      findFirst: vi.fn().mockResolvedValue({ id: "part-1", sellerId: "seller-1" }),
      update: vi.fn().mockResolvedValue({
        id: "part-1",
        storageRow: "A",
        storageBin: "12",
        storageShelf: "3",
      }),
    },
  },
}));

describe("PATCH /api/seller/parts/[id]/location", () => {
  it("updates storage location for a seller's own part", async () => {
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/seller/parts/part-1/location", {
      method: "PATCH",
      body: JSON.stringify({ row: "A", bin: "12", shelf: "3" }),
    });

    const res = await PATCH(req as never, { params: Promise.resolve({ id: "part-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.storageRow).toBe("A");
    expect(body.storageBin).toBe("12");
  });

  it("returns 404 when part does not belong to seller", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.part.findFirst).mockResolvedValueOnce(null);

    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/seller/parts/part-2/location", {
      method: "PATCH",
      body: JSON.stringify({ row: "B" }),
    });

    const res = await PATCH(req as never, { params: Promise.resolve({ id: "part-2" }) });
    expect(res.status).toBe(404);
  });
});

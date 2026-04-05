import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } }),
}));

const mockDisputes = [
  {
    id: "d1",
    orderId: "order-1",
    reason: "Part not as described",
    status: "OPEN",
    createdAt: new Date().toISOString(),
    buyer: { id: "b1", name: "Alice" },
    seller: { id: "s1", name: "Bob's Yard" },
    order: { id: "order-1", total: "150.00" },
  },
];

vi.mock("@/lib/prisma", () => ({
  prisma: {
    dispute: {
      findMany: vi.fn().mockResolvedValue(mockDisputes),
      findUnique: vi.fn().mockResolvedValue(mockDisputes[0]),
      update: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ ...mockDisputes[0], ...data })
      ),
    },
  },
}));

describe("GET /api/ops/disputes", () => {
  it("returns all disputes for admin", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ops/disputes");
    const res = await GET(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toBeInstanceOf(Array);
    expect(body[0].reason).toBe("Part not as described");
  });
});

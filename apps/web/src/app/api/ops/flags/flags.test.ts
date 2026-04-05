import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    featureFlag: {
      findMany: vi.fn().mockResolvedValue([
        { key: "buyer_guest_checkout", enabled: true, description: "Allow guest checkout" },
      ]),
      upsert: vi.fn().mockImplementation(({ create }) => Promise.resolve(create)),
    },
  },
}));

vi.mock("@/lib/flags", () => ({
  invalidateFlagCache: vi.fn(),
}));

describe("GET /api/ops/flags", () => {
  it("returns all feature flags for admin", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ops/flags");
    const res = await GET(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toBeInstanceOf(Array);
    expect(body[0]).toHaveProperty("key");
    expect(body[0]).toHaveProperty("enabled");
  });

  it("returns 403 for non-admin", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u1", role: "SELLER" } } as never);

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ops/flags");
    const res = await GET(req as never);
    expect(res.status).toBe(403);
  });
});

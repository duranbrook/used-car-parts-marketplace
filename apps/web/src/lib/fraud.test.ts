import { describe, it, expect, vi } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    part: {
      count: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    fraudFlag: {
      create: vi.fn().mockResolvedValue({ id: "ff1" }),
    },
  },
}));

describe("checkListingVelocity", () => {
  it("returns safe when under threshold", async () => {
    const { prisma } = await import("./prisma");
    vi.mocked(prisma.part.count).mockResolvedValueOnce(3);

    const { checkListingVelocity } = await import("./fraud");
    const result = await checkListingVelocity("seller-1");
    expect(result.flagged).toBe(false);
  });

  it("flags seller who listed 50+ parts in one hour", async () => {
    const { prisma } = await import("./prisma");
    vi.mocked(prisma.part.count).mockResolvedValueOnce(55);

    const { checkListingVelocity } = await import("./fraud");
    const result = await checkListingVelocity("seller-1");
    expect(result.flagged).toBe(true);
    expect(result.reason).toContain("velocity");
  });
});

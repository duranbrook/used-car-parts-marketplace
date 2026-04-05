import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "seller-1", role: "SELLER" } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: "seller-1", ...data })
      ),
    },
  },
}));

describe("PATCH /api/seller/holiday-mode", () => {
  it("enables holiday mode with message", async () => {
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/seller/holiday-mode", {
      method: "PATCH",
      body: JSON.stringify({ enabled: true, message: "Back in 2 weeks!" }),
    });

    const res = await PATCH(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.holidayMode).toBe(true);
    expect(body.holidayMessage).toBe("Back in 2 weeks!");
  });

  it("disables holiday mode", async () => {
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/seller/holiday-mode", {
      method: "PATCH",
      body: JSON.stringify({ enabled: false }),
    });

    const res = await PATCH(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.holidayMode).toBe(false);
  });
});

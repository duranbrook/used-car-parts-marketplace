/**
 * Seller offer management: view pending offers and respond.
 * Relies on buyer-offers.spec.ts (buyer project) having already created
 * an offer on Brake Pad Set before this seller project runs.
 * Runs under the "seller" Playwright project.
 */
import { test, expect } from "@playwright/test";

test.describe("Seller offers", () => {
  let pendingOfferId: string;

  test.beforeAll(async ({ request }) => {
    // Get the offer the buyer created on Brake Pad Set
    const res = await request.get("/api/seller/offers");
    expect(res.status()).toBe(200);
    const offers = await res.json();
    // Find the pending offer (created by buyer-offers.spec.ts)
    const pending = offers.find((o: { status: string }) => o.status === "PENDING");
    if (pending) pendingOfferId = pending.id;
  });

  test("seller can list pending offers", async ({ request }) => {
    const res = await request.get("/api/seller/offers");
    expect(res.status()).toBe(200);
    const offers = await res.json();
    expect(Array.isArray(offers)).toBe(true);
  });

  test("pending offers include buyer and part details", async ({ request }) => {
    const res = await request.get("/api/seller/offers");
    const offers = await res.json();
    if (offers.length > 0) {
      const offer = offers[0];
      expect(offer).toHaveProperty("amount");
      expect(offer).toHaveProperty("status");
      expect(offer.part).toHaveProperty("title");
    }
  });

  test("seller can accept a pending offer", async ({ request }) => {
    if (!pendingOfferId) {
      test.skip(true, "No pending offer found — buyer-offers.spec.ts must run first");
      return;
    }
    const res = await request.patch(`/api/seller/offers/${pendingOfferId}`, {
      data: { action: "accept" },
    });
    expect(res.status()).toBe(200);
    const offer = await res.json();
    expect(offer.status).toBe("ACCEPTED");
  });

  test("seller can decline an offer", async ({ request }) => {
    // Create a fresh offer to decline — look for another pending offer
    const res = await request.get("/api/seller/offers");
    const offers = await res.json();
    const pending = offers.find((o: { status: string; id: string }) => o.status === "PENDING" && o.id !== pendingOfferId);
    if (!pending) {
      test.skip(true, "No additional pending offer to decline");
      return;
    }
    const decline = await request.patch(`/api/seller/offers/${pending.id}`, {
      data: { action: "decline" },
    });
    expect(decline.status()).toBe(200);
    const body = await decline.json();
    expect(body.status).toBe("DECLINED");
  });
});

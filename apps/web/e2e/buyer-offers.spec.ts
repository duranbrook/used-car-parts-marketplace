/**
 * Buyer offer flow: make offers, list them, validate business rules.
 * Runs under the "buyer" Playwright project.
 *
 * The offer created here on Brake Pad Set is later used by seller-offers.spec.ts
 * to test the seller's accept/decline flow.
 */
import { test, expect } from "@playwright/test";

test.describe("Buyer offers", () => {
  let brakePartId: string;
  let alternatorPartId: string;
  let createdOfferId: string;

  test.beforeAll(async ({ request }) => {
    const brakeRes = await request.get("/api/parts?q=Brake&limit=1");
    const { parts: brakeParts } = await brakeRes.json();
    brakePartId = brakeParts[0]?.id;
    expect(brakePartId).toBeTruthy();

    const altRes = await request.get("/api/parts?q=Alternator&limit=1");
    const { parts: altParts } = await altRes.json();
    alternatorPartId = altParts[0]?.id;
    expect(alternatorPartId).toBeTruthy();
  });

  test("buyer can make an offer on a part", async ({ request }) => {
    const res = await request.post("/api/buyer/offers", {
      data: { partId: brakePartId, amount: 35 }, // offer below the $45 price
    });
    expect(res.status()).toBe(201);
    const offer = await res.json();
    expect(offer.partId).toBe(brakePartId);
    expect(parseFloat(offer.amount)).toBe(35);
    expect(offer.status).toBe("PENDING");
    expect(offer.expiresAt).toBeTruthy(); // 48h expiry
    createdOfferId = offer.id;
  });

  test("buyer can make a second offer (for seller decline test)", async ({ request }) => {
    // This offer on Alternator will be used by seller-offers.spec.ts to test decline flow
    const res = await request.post("/api/buyer/offers", {
      data: { partId: alternatorPartId, amount: 90 }, // offer below the $120 price
    });
    expect(res.status()).toBe(201);
    const offer = await res.json();
    expect(offer.status).toBe("PENDING");
  });

  test("buyer can list their offers", async ({ request }) => {
    const res = await request.get("/api/buyer/offers");
    expect(res.status()).toBe(200);
    const offers = await res.json();
    expect(Array.isArray(offers)).toBe(true);
    expect(offers.some((o: { id: string }) => o.id === createdOfferId)).toBe(true);
  });

  test("offer includes part details", async ({ request }) => {
    const res = await request.get("/api/buyer/offers");
    const offers = await res.json();
    const offer = offers.find((o: { id: string }) => o.id === createdOfferId);
    expect(offer.part).toHaveProperty("title");
    expect(offer.part).toHaveProperty("price");
  });

  test("zero or negative amount is rejected", async ({ request }) => {
    const res = await request.post("/api/buyer/offers", {
      data: { partId: brakePartId, amount: 0 },
    });
    expect(res.status()).toBe(400);
  });

  test("missing partId is rejected", async ({ request }) => {
    const res = await request.post("/api/buyer/offers", {
      data: { amount: 50 },
    });
    expect(res.status()).toBe(400);
  });
});

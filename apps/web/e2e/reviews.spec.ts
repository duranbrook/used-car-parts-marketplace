/**
 * Review system: create and retrieve reviews for sellers and parts.
 * Runs under the "buyer" Playwright project.
 */
import { test, expect } from "@playwright/test";

test.describe("Reviews: create and retrieve", () => {
  let sellerId: string;
  let brakePartId: string;

  test.beforeAll(async ({ request }) => {
    // Get seller ID from a seeded part
    const res = await request.get("/api/parts?q=Brake&limit=1");
    const { parts } = await res.json();
    sellerId = parts[0]?.seller?.id;
    brakePartId = parts[0]?.id;
    expect(sellerId).toBeTruthy();
  });

  test("can create a seller review", async ({ request }) => {
    const res = await request.post("/api/reviews", {
      data: { sellerId, rating: 5, comment: "Great part, fast shipping!" },
    });
    expect(res.status()).toBe(201);
    const review = await res.json();
    expect(review.rating).toBe(5);
    expect(review.sellerId).toBe(sellerId);
    expect(review.verified).toBe(false); // no completed order exists
  });

  test("can retrieve reviews by sellerId", async ({ request }) => {
    const res = await request.get(`/api/reviews?sellerId=${sellerId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.reviews)).toBe(true);
    expect(body.reviews.length).toBeGreaterThan(0);
    expect(body.stats).toHaveProperty("average");
    expect(body.stats).toHaveProperty("distribution");
  });

  test("can create a part-level review", async ({ request }) => {
    const res = await request.post("/api/reviews", {
      data: { sellerId, partId: brakePartId, rating: 4, comment: "Good condition" },
    });
    expect(res.status()).toBe(201);
    const review = await res.json();
    expect(review.partId).toBe(brakePartId);
    expect(review.rating).toBe(4);
  });

  test("can retrieve reviews by partId", async ({ request }) => {
    const res = await request.get(`/api/reviews?partId=${brakePartId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.reviews)).toBe(true);
  });

  test("rating below 1 or above 5 is rejected", async ({ request }) => {
    const res = await request.post("/api/reviews", {
      data: { sellerId, rating: 6 },
    });
    expect(res.status()).toBe(400);
  });

  test("missing sellerId is rejected", async ({ request }) => {
    const res = await request.post("/api/reviews", {
      data: { rating: 5, comment: "test" },
    });
    expect(res.status()).toBe(400);
  });

  test("GET without sellerId or partId returns 400", async ({ request }) => {
    const res = await request.get("/api/reviews");
    expect(res.status()).toBe(400);
  });
});

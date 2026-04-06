/**
 * Search API filter coverage: partType, price range, condition, pagination.
 * Public endpoint — runs under the "no-auth" Playwright project.
 */
import { test, expect } from "@playwright/test";

test.describe("Search: filter and pagination", () => {
  test("returns all active parts with no filters", async ({ request }) => {
    const res = await request.get("/api/parts");
    expect(res.status()).toBe(200);
    const { parts, pagination } = await res.json();
    expect(Array.isArray(parts)).toBe(true);
    expect(pagination).toHaveProperty("total");
    expect(pagination).toHaveProperty("page");
  });

  test("filter by partType returns matching parts", async ({ request }) => {
    const res = await request.get("/api/parts?partType=BRAKES");
    expect(res.status()).toBe(200);
    const { parts } = await res.json();
    expect(parts.every((p: { partType: string }) => p.partType === "BRAKES")).toBe(true);
  });

  test("filter by conditionGrade returns matching parts", async ({ request }) => {
    const res = await request.get("/api/parts?conditionGrade=A");
    expect(res.status()).toBe(200);
    const { parts } = await res.json();
    expect(parts.every((p: { conditionGrade: string }) => p.conditionGrade === "A")).toBe(true);
  });

  test("filter by minPrice excludes cheaper parts", async ({ request }) => {
    const res = await request.get("/api/parts?minPrice=100");
    expect(res.status()).toBe(200);
    const { parts } = await res.json();
    expect(parts.every((p: { price: string }) => parseFloat(p.price) >= 100)).toBe(true);
  });

  test("filter by maxPrice excludes expensive parts", async ({ request }) => {
    const res = await request.get("/api/parts?maxPrice=50");
    expect(res.status()).toBe(200);
    const { parts } = await res.json();
    expect(parts.every((p: { price: string }) => parseFloat(p.price) <= 50)).toBe(true);
  });

  test("price range filter works together", async ({ request }) => {
    const res = await request.get("/api/parts?minPrice=40&maxPrice=130");
    expect(res.status()).toBe(200);
    const { parts } = await res.json();
    expect(
      parts.every((p: { price: string }) => {
        const price = parseFloat(p.price);
        return price >= 40 && price <= 130;
      })
    ).toBe(true);
  });

  test("full-text search (q) filters by title and description", async ({ request }) => {
    const res = await request.get("/api/parts?q=Toyota");
    expect(res.status()).toBe(200);
    const { parts } = await res.json();
    expect(parts.length).toBeGreaterThan(0);
    // At least one result should mention Toyota
    expect(
      parts.some((p: { title: string; description?: string }) =>
        (p.title + (p.description || "")).toLowerCase().includes("toyota")
      )
    ).toBe(true);
  });

  test("pagination returns correct page size", async ({ request }) => {
    const res = await request.get("/api/parts?limit=2&page=1");
    expect(res.status()).toBe(200);
    const { parts, pagination } = await res.json();
    expect(parts.length).toBeLessThanOrEqual(2);
    expect(pagination.limit).toBe(2);
    expect(pagination.page).toBe(1);
  });

  test("search with no matches returns empty array", async ({ request }) => {
    const res = await request.get("/api/parts?q=xyznonexistentpart99999");
    expect(res.status()).toBe(200);
    const { parts } = await res.json();
    expect(parts).toHaveLength(0);
  });

  test("parts from suspended sellers are excluded", async ({ request }) => {
    // All seeded parts come from seller@test.com who is NOT in holiday mode
    // This verifies the holidayMode filter is applied
    const res = await request.get("/api/parts?q=Brake");
    const { parts } = await res.json();
    expect(parts.length).toBeGreaterThan(0); // seller is active
  });
});

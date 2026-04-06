/**
 * Messaging: send and retrieve conversations.
 * Runs under the "buyer" Playwright project (buyer messages the seller).
 */
import { test, expect } from "@playwright/test";

test.describe("Messages: send and receive", () => {
  let sellerId: string;
  let brakePartId: string;

  test.beforeAll(async ({ request }) => {
    // Get seller's user ID from a seeded part
    const res = await request.get("/api/parts?q=Brake&limit=1");
    const { parts } = await res.json();
    sellerId = parts[0]?.seller?.id;
    brakePartId = parts[0]?.id;
    expect(sellerId).toBeTruthy();
  });

  test("buyer can send a message to seller", async ({ request }) => {
    const res = await request.post("/api/messages", {
      data: {
        receiverId: sellerId,
        content: "Hi, is this brake pad still available?",
        partId: brakePartId,
      },
    });
    expect(res.status()).toBe(201);
    const msg = await res.json();
    expect(msg.content).toBe("Hi, is this brake pad still available?");
    expect(msg.receiverId).toBe(sellerId);
  });

  test("buyer can list their conversations", async ({ request }) => {
    const res = await request.get("/api/messages");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.conversations)).toBe(true);
    expect(body.conversations.length).toBeGreaterThan(0);
  });

  test("conversation includes last message and unread count", async ({ request }) => {
    const res = await request.get("/api/messages");
    const { conversations } = await res.json();
    const convo = conversations.find((c: { user: { id: string } }) => c.user.id === sellerId);
    expect(convo).toBeDefined();
    expect(convo.lastMessage).toHaveProperty("content");
    expect(typeof convo.unread).toBe("number");
  });

  test("missing receiverId or content returns 400", async ({ request }) => {
    const res = await request.post("/api/messages", {
      data: { receiverId: sellerId }, // missing content
    });
    expect(res.status()).toBe(400);
  });

  test("messages page loads without redirect", async ({ page }) => {
    await page.goto("/messages");
    await expect(page).not.toHaveURL(/signin/);
    await expect(page.locator("main, [role='main']").first()).toBeVisible({ timeout: 8_000 });
  });
});

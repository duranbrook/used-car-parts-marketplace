import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user-1", role: "SELLER" },
  }),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://s3.example.com/presigned-url"),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(),
}));

describe("POST /api/seller/upload-url", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns a presigned URL and the final S3 key", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/seller/upload-url", {
      method: "POST",
      body: JSON.stringify({ filename: "engine.jpg", contentType: "image/jpeg" }),
    });

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("uploadUrl");
    expect(body).toHaveProperty("key");
    expect(body.key).toMatch(/^parts\/user-1\//);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.doMock("@/lib/auth", () => ({
      auth: vi.fn().mockResolvedValue(null),
    }));

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/seller/upload-url", {
      method: "POST",
      body: JSON.stringify({ filename: "engine.jpg", contentType: "image/jpeg" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });
});

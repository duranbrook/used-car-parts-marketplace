import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApiClient } from "./client";

describe("createApiClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("prepends baseUrl to all requests", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ parts: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
    } as Response);

    const client = createApiClient({ baseUrl: "https://api.example.com" });
    await client.parts.search({});

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("https://api.example.com/api/parts"),
      expect.any(Object)
    );
  });

  it("throws on non-ok response", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Unauthorized" }),
    } as Response);

    const client = createApiClient({ baseUrl: "" });
    await expect(client.parts.search({})).rejects.toThrow("Unauthorized");
  });
});

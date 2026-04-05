import { describe, it, expect, vi, beforeEach } from "vitest";

// Test the VIN parsing logic directly
describe("VIN Decoder", () => {
  it("rejects VINs that are not 17 characters", async () => {
    const { GET } = await import("./[vin]/route");
    const req = new Request("http://localhost/api/vin/SHORT");
    const res = await GET(req as never, { params: Promise.resolve({ vin: "SHORT" }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("17 characters");
  });

  it("decodes a valid VIN from NHTSA", async () => {
    // Mock fetch for NHTSA API
    const mockResponse = {
      Results: [{
        ModelYear: "2018",
        Make: "HONDA",
        Model: "Civic",
        Trim: "EX",
        EngineConfiguration: "In-Line",
        DisplacementL: "1.5",
        FuelTypePrimary: "Gasoline",
        TransmissionStyle: "CVT",
        DriveType: "FWD",
        BodyClass: "Sedan",
      }],
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { GET } = await import("./[vin]/route");
    const testVin = "19XFC2F59JE000001";
    const req = new Request(`http://localhost/api/vin/${testVin}`);
    const res = await GET(req as never, { params: Promise.resolve({ vin: testVin }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.year).toBe(2018);
    expect(data.make).toBe("HONDA");
    expect(data.model).toBe("Civic");
    expect(data.trim).toBe("EX");

    globalThis.fetch = originalFetch;
  });
});

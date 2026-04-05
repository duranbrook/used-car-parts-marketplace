/**
 * Shipping Integration (scaffold)
 *
 * To enable ShipEngine, set:
 * - SHIPENGINE_API_KEY
 *
 * Then install: npm install shipengine
 */

export function isShippingConfigured(): boolean {
  return !!process.env.SHIPENGINE_API_KEY;
}

export type ShippingTier = "parcel" | "ground" | "ltl_freight";

export function getShippingTier(weightLbs: number): ShippingTier {
  if (weightLbs < 70) return "parcel";
  if (weightLbs < 150) return "ground";
  return "ltl_freight";
}

export async function getShippingRates(params: {
  fromZip: string;
  toZip: string;
  weightLbs: number;
  lengthIn?: number;
  widthIn?: number;
  heightIn?: number;
}) {
  const tier = getShippingTier(params.weightLbs);

  if (!isShippingConfigured()) {
    // Return estimated rates based on weight and tier
    const baseRates: Record<ShippingTier, number> = {
      parcel: 12.99,
      ground: 29.99,
      ltl_freight: 89.99,
    };
    const weightMultiplier = params.weightLbs / 10;

    return {
      configured: false,
      tier,
      estimates: [
        { carrier: "Estimated", service: tier, rate: Math.round((baseRates[tier] + weightMultiplier) * 100) / 100, days: tier === "parcel" ? "3-5" : tier === "ground" ? "5-7" : "7-14" },
      ],
    };
  }

  // ShipEngine implementation when API key is available
  return { configured: true, tier, estimates: [] };
}

export async function createShippingLabel(params: {
  fromAddress: Record<string, string>;
  toAddress: Record<string, string>;
  weightLbs: number;
  carrierId: string;
  serviceCode: string;
}) {
  if (!isShippingConfigured()) {
    return { error: "Shipping not configured", label: null };
  }
  return { error: "Shipping integration pending", label: null };
}

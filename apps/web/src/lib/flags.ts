import { prisma } from "./prisma";

let cache: Map<string, boolean> = new Map();
let cacheExpiry = 0;
const TTL_MS = 60_000; // 1 minute cache

export async function getFlag(key: string): Promise<boolean> {
  if (Date.now() > cacheExpiry) {
    const flags = await prisma.featureFlag.findMany({ select: { key: true, enabled: true } });
    cache = new Map(flags.map((f) => [f.key, f.enabled]));
    cacheExpiry = Date.now() + TTL_MS;
  }
  return cache.get(key) ?? false;
}

export function invalidateFlagCache() {
  cacheExpiry = 0;
}

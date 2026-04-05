import { createApiClient } from "@car-parts/api-client";

let cachedToken: string | null = null;

export function setCachedToken(token: string | null) {
  cachedToken = token;
}

export const api = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
  getToken: () => cachedToken,
});

export async function initApiToken() {
  const { getToken } = await import("./auth");
  cachedToken = await getToken();
}

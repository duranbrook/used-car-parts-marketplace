import { createApiClient } from "@car-parts/api-client";
import { getToken } from "./auth";

// getToken is async, but the api-client expects a sync getter.
// We cache the token on app start and refresh it after login.
let cachedToken: string | null = null;

export function setCachedToken(token: string | null) {
  cachedToken = token;
}

export const api = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
  getToken: () => cachedToken,
});

// Call this on app startup to hydrate the cache
export async function initApiToken() {
  cachedToken = await getToken();
}

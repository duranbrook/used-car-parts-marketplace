import { createApiClient } from "@car-parts/api-client";

export const api = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
  getToken: () => {
    // Will be wired up in auth task with SecureStore
    return null;
  },
});

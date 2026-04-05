import { createApiClient } from "@car-parts/api-client";

export const api = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
  getToken: () => null, // wired up in auth task
});

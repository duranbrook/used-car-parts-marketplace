import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "buyer_jwt";
const REFRESH_KEY = "buyer_refresh";

export async function saveTokens(token: string, refresh: string) {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, token),
    SecureStore.setItemAsync(REFRESH_KEY, refresh),
  ]);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}

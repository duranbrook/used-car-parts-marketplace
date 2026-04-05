import type {
  PartSummary,
  PartDetail,
  PartSearchParams,
  CreatePartInput,
  PartIdentificationResult,
  ConditionAssessmentResult,
  PriceSuggestionResult,
  VinDecodeResult,
} from "@car-parts/types";
import type { Order, CreateOrderInput } from "@car-parts/types";

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => string | null | undefined;
}

async function request<T>(
  config: ApiClientConfig,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = config.getToken?.();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${config.baseUrl}${path}`, { ...options, headers });
  const json = await res.json();
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
  return json as T;
}

export function createApiClient(config: ApiClientConfig) {
  return {
    parts: {
      search(params: PartSearchParams) {
        const qs = new URLSearchParams(
          Object.fromEntries(
            Object.entries(params)
              .filter(([, v]) => v !== undefined && v !== "")
              .map(([k, v]) => [k, String(v)])
          )
        ).toString();
        return request<{
          parts: PartSummary[];
          pagination: { page: number; limit: number; total: number; totalPages: number };
        }>(config, `/api/parts${qs ? `?${qs}` : ""}`);
      },
      get(id: string) {
        return request<PartDetail>(config, `/api/parts/${id}`);
      },
      create(data: CreatePartInput) {
        return request<PartDetail>(config, "/api/parts", {
          method: "POST",
          body: JSON.stringify(data),
        });
      },
      my() {
        return request<PartSummary[]>(config, "/api/parts/my");
      },
    },

    orders: {
      list() {
        return request<Order[]>(config, "/api/orders");
      },
      get(id: string) {
        return request<Order>(config, `/api/orders/${id}`);
      },
      create(data: CreateOrderInput) {
        return request<Order>(config, "/api/orders", {
          method: "POST",
          body: JSON.stringify(data),
        });
      },
      updateStatus(id: string, status: string, trackingNumber?: string) {
        return request<Order>(config, `/api/orders/${id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status, trackingNumber }),
        });
      },
    },

    ai: {
      identifyPart(imageUrl: string) {
        return request<PartIdentificationResult>(config, "/api/ai/identify-part", {
          method: "POST",
          body: JSON.stringify({ imageUrl }),
        });
      },
      assessCondition(imageUrls: string[]) {
        return request<ConditionAssessmentResult>(config, "/api/ai/assess-condition", {
          method: "POST",
          body: JSON.stringify({ imageUrls }),
        });
      },
      suggestPrice(data: {
        partType: string;
        conditionGrade: string;
        make?: string;
        model?: string;
        year?: number;
      }) {
        return request<PriceSuggestionResult>(config, "/api/ai/suggest-price", {
          method: "POST",
          body: JSON.stringify(data),
        });
      },
      smartSearch(query: string) {
        return request<PartSearchParams>(config, "/api/ai/smart-search", {
          method: "POST",
          body: JSON.stringify({ query }),
        });
      },
    },

    vin: {
      decode(vin: string) {
        return request<VinDecodeResult>(config, `/api/vin/${vin}`);
      },
    },

    messages: {
      list() {
        return request<unknown[]>(config, "/api/messages");
      },
      thread(userId: string) {
        return request<unknown[]>(config, `/api/messages/${userId}`);
      },
      send(receiverId: string, content: string, partId?: string) {
        return request<unknown>(config, "/api/messages", {
          method: "POST",
          body: JSON.stringify({ receiverId, content, partId }),
        });
      },
    },

    notifications: {
      list() {
        return request<unknown[]>(config, "/api/notifications");
      },
    },

    reviews: {
      create(data: {
        partId?: string;
        sellerId: string;
        rating: number;
        comment?: string;
      }) {
        return request<unknown>(config, "/api/reviews", {
          method: "POST",
          body: JSON.stringify(data),
        });
      },
    },

    cart: {
      get() {
        return request<unknown[]>(config, "/api/cart");
      },
      add(partId: string, quantity = 1) {
        return request<unknown>(config, "/api/cart", {
          method: "POST",
          body: JSON.stringify({ partId, quantity }),
        });
      },
      remove(partId: string) {
        return request<unknown>(config, "/api/cart", {
          method: "DELETE",
          body: JSON.stringify({ partId }),
        });
      },
    },

    seller: {
      analytics() {
        return request<unknown>(config, "/api/seller/analytics");
      },
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

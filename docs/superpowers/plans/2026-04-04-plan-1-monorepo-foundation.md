# Monorepo Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the single Next.js repo into a Turborepo monorepo with `apps/web`, `apps/seller-app`, `apps/buyer-app`, and shared `packages/types`, `packages/api-client`, `packages/db`.

**Architecture:** Root workspace orchestrated by Turborepo. The existing Next.js app moves to `apps/web/` unchanged. Three shared packages extract types, API fetch wrappers, and the Prisma client so all five frontends import from one source. Two Expo apps are scaffolded with tab navigation and the shared API client wired up.

**Tech Stack:** Turborepo 2.x, npm workspaces, Next.js 16.2.1 (existing), Expo SDK 53 (React Native), TypeScript, Zod

---

### Task 1: Set up root package.json and Turborepo

**Files:**
- Create: `package.json` (root — replaces current one, which moves to `apps/web/`)
- Create: `turbo.json`
- Create: `.npmrc` (root)

- [ ] **Step 1: Back up current package.json**

```bash
cp package.json package.json.bak
```

- [ ] **Step 2: Create root package.json with workspaces**

```json
{
  "name": "car-parts-monorepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint"
  },
  "devDependencies": {
    "turbo": "^2.5.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

- [ ] **Step 4: Create root .npmrc to hoist node_modules correctly**

```
legacy-peer-deps=true
```

- [ ] **Step 5: Install Turborepo at root**

```bash
npm install
```

Expected: `node_modules/turbo` installed at root, `turbo` command available via `npx turbo`.

- [ ] **Step 6: Commit**

```bash
git add package.json turbo.json .npmrc
git commit -m "chore: add turborepo root config and npm workspaces"
```

---

### Task 2: Move Next.js app to apps/web/

**Files:**
- Create: `apps/web/` directory containing all current project files
- Modify: `apps/web/tsconfig.json` — update paths
- Modify: `apps/web/vitest.config.ts` — update aliases

- [ ] **Step 1: Create the apps directory and move all project files**

```bash
mkdir -p apps/web
# Move all project files (not node_modules or .git)
mv src apps/web/
mv prisma apps/web/
mv prisma.config.ts apps/web/
mv public apps/web/
mv next.config.ts apps/web/
mv next-env.d.ts apps/web/
mv postcss.config.mjs apps/web/
mv eslint.config.mjs apps/web/
mv vitest.config.ts apps/web/
mv tsconfig.json apps/web/
mv package.json.bak apps/web/package.json
mv AGENTS.md apps/web/
mv CLAUDE.md apps/web/
```

- [ ] **Step 2: Update apps/web/package.json — set name and workspace-relative scripts**

The file at `apps/web/package.json` should be (rename from `partfinder` to `@car-parts/web`):

```json
{
  "name": "@car-parts/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.80.0",
    "@auth/prisma-adapter": "^2.11.1",
    "@prisma/adapter-pg": "^7.6.0",
    "@prisma/adapter-pg-worker": "^6.9.0",
    "@prisma/client": "^7.6.0",
    "@prisma/pg-worker": "^6.9.0",
    "bcryptjs": "^3.0.3",
    "dotenv": "^17.3.1",
    "next": "16.2.1",
    "next-auth": "^5.0.0-beta.30",
    "pg": "^8.20.0",
    "prisma": "^7.6.0",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^9",
    "eslint-config-next": "16.2.1",
    "jsdom": "^29.0.1",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^4.1.2"
  }
}
```

- [ ] **Step 3: Install all workspace dependencies from root**

```bash
npm install
```

Expected: `apps/web/node_modules` populated, root `node_modules` has turbo.

- [ ] **Step 4: Verify the web app still builds**

```bash
cd apps/web && npm run build
```

Expected: Next.js build completes with no errors. If you see `Cannot find module` errors, check that `apps/web/tsconfig.json` paths still point to `./src/*` (they should be unchanged).

- [ ] **Step 5: Run existing tests to confirm nothing broke**

```bash
cd apps/web && npm test
```

Expected: All existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/ package.json turbo.json
git commit -m "chore: move Next.js app to apps/web workspace"
```

---

### Task 3: Create packages/db

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/src/index.ts`
- Modify: `apps/web/src/lib/prisma.ts` — import from `@car-parts/db`

The `packages/db` package re-exports the Prisma client so all future apps (mobile included) can import `{ prisma }` from `@car-parts/db` without each knowing about PrismaPg internals.

- [ ] **Step 1: Create packages/db/package.json**

```json
{
  "name": "@car-parts/db",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@prisma/adapter-pg": "^7.6.0",
    "@prisma/client": "^7.6.0",
    "pg": "^8.20.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create packages/db/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "paths": {
      "@car-parts/web/generated/prisma": ["../web/src/generated/prisma/client.ts"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create packages/db/src/index.ts**

```typescript
import { PrismaClient } from "../../apps/web/src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export type { PrismaClient };
export * from "../../apps/web/src/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: Add @car-parts/db as a dependency in apps/web/package.json**

Add to `dependencies`:
```json
"@car-parts/db": "*"
```

- [ ] **Step 5: Run npm install to link the workspace package**

```bash
npm install
```

Expected: `apps/web/node_modules/@car-parts/db` is a symlink to `packages/db`.

- [ ] **Step 6: Commit**

```bash
git add packages/db apps/web/package.json package-lock.json
git commit -m "chore: add packages/db shared Prisma client"
```

---

### Task 4: Create packages/types

**Files:**
- Create: `packages/types/package.json`
- Create: `packages/types/tsconfig.json`
- Create: `packages/types/src/index.ts`
- Create: `packages/types/src/parts.ts`
- Create: `packages/types/src/orders.ts`
- Create: `packages/types/src/users.ts`
- Create: `packages/types/src/api.ts`

- [ ] **Step 1: Create packages/types/package.json**

```json
{
  "name": "@car-parts/types",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "zod": "^3.25.0"
  }
}
```

- [ ] **Step 2: Create packages/types/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create packages/types/src/users.ts**

```typescript
export type UserRole = "BUYER" | "SELLER" | "ADMIN";
export type SellerTier = "NEW" | "VERIFIED" | "TOP_RATED" | "POWER_SELLER";

export interface UserSummary {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  image: string | null;
}

export interface SellerProfile extends UserSummary {
  location: string | null;
  phone: string | null;
  createdAt: string;
  tier?: SellerTier;
  averageRating?: number;
  reviewCount?: number;
  responseTime?: string;
}
```

- [ ] **Step 4: Create packages/types/src/parts.ts**

```typescript
export type ConditionGrade = "A" | "B" | "C";
export type PartStatus = "DRAFT" | "ACTIVE" | "SOLD" | "RESERVED" | "INACTIVE";

export interface PartImage {
  id: string;
  url: string;
  isPrimary: boolean;
  aiTags: string | null;
  order: number;
}

export interface VehicleSummary {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  vin?: string | null;
}

export interface PartCompatibility {
  id: string;
  vehicleId: string;
  yearStart: number | null;
  yearEnd: number | null;
  vehicle: VehicleSummary;
}

export interface PartSummary {
  id: string;
  title: string;
  partType: string;
  conditionGrade: ConditionGrade;
  price: string;
  status: PartStatus;
  views: number;
  createdAt: string;
  images: PartImage[];
  seller: { id: string; name: string | null };
  donorVehicle: VehicleSummary | null;
}

export interface PartDetail extends PartSummary {
  description: string | null;
  partNumber: string | null;
  hollanderNumber: string | null;
  conditionNotes: string | null;
  suggestedPrice: string | null;
  quantity: number;
  weight: string | null;
  compatibility: PartCompatibility[];
  updatedAt: string;
}

export interface CreatePartInput {
  title: string;
  description?: string;
  partType: string;
  partNumber?: string;
  hollanderNumber?: string;
  conditionGrade: ConditionGrade;
  conditionNotes?: string;
  price: number;
  quantity?: number;
  weight?: number;
  images?: { url: string; aiTags?: string }[];
  compatibility?: { year: number; make: string; model: string; yearStart?: number; yearEnd?: number }[];
  donorVehicle?: {
    vin?: string;
    year: number;
    make: string;
    model: string;
    trim?: string;
    engineType?: string;
  };
}

export interface PartSearchParams {
  q?: string;
  partType?: string;
  make?: string;
  model?: string;
  year?: string;
  minPrice?: string;
  maxPrice?: string;
  conditionGrade?: string;
  page?: number;
  limit?: number;
}
```

- [ ] **Step 5: Create packages/types/src/orders.ts**

```typescript
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SHIPPED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";

export interface OrderItem {
  id: string;
  partId: string;
  quantity: number;
  price: string;
  part: {
    id: string;
    title: string;
    partType: string;
    images: { url: string; isPrimary: boolean }[];
  };
}

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  status: OrderStatus;
  subtotal: string;
  shippingCost: string;
  platformFee: string;
  total: string;
  trackingNumber: string | null;
  shippingCarrier: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  buyer?: { id: string; name: string | null; email: string };
  seller?: { id: string; name: string | null; email: string };
}

export interface CreateOrderInput {
  items: { partId: string; quantity: number }[];
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  notes?: string;
}
```

- [ ] **Step 6: Create packages/types/src/api.ts**

```typescript
export interface ApiError {
  error: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// AI endpoints
export interface PartIdentificationResult {
  partType: string;
  confidence: number;
  compatibleVehicles: { year: number; make: string; model: string }[];
  suggestedTitle: string;
  notes: string;
}

export interface ConditionAssessmentResult {
  grade: "A" | "B" | "C";
  confidence: number;
  defects: { location: string; severity: "minor" | "moderate" | "major"; description: string }[];
  notes: string;
}

export interface PriceSuggestionResult {
  low: number;
  suggested: number;
  high: number;
  reasoning: string;
}

export interface VinDecodeResult {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  engineType: string | null;
  transmission: string | null;
  driveType: string | null;
  bodyType: string | null;
}
```

- [ ] **Step 7: Create packages/types/src/index.ts**

```typescript
export * from "./users";
export * from "./parts";
export * from "./orders";
export * from "./api";
```

- [ ] **Step 8: Install zod in packages/types and run npm install**

```bash
npm install
```

- [ ] **Step 9: Commit**

```bash
git add packages/types
git commit -m "chore: add packages/types shared TypeScript types"
```

---

### Task 5: Create packages/api-client

**Files:**
- Create: `packages/api-client/package.json`
- Create: `packages/api-client/tsconfig.json`
- Create: `packages/api-client/src/index.ts`
- Create: `packages/api-client/src/client.ts`
- Create: `packages/api-client/src/parts.ts`
- Create: `packages/api-client/src/orders.ts`
- Create: `packages/api-client/src/auth.ts`
- Create: `packages/api-client/src/ai.ts`

The API client is a set of typed async functions that wrap `fetch`. Every app (web and mobile) imports from here. The `baseUrl` is passed in at initialization so the web app uses relative paths and mobile apps use the full server URL.

- [ ] **Step 1: Create packages/api-client/package.json**

```json
{
  "name": "@car-parts/api-client",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@car-parts/types": "*"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^4.1.2"
  }
}
```

- [ ] **Step 2: Create packages/api-client/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write failing test for the client factory**

Create `packages/api-client/src/client.test.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to confirm it fails**

```bash
cd packages/api-client && npx vitest run src/client.test.ts
```

Expected: FAIL — `createApiClient` not defined yet.

- [ ] **Step 5: Create packages/api-client/src/client.ts**

```typescript
import type { PartSummary, PartDetail, PartSearchParams, CreatePartInput, PaginatedResponse, PartIdentificationResult, ConditionAssessmentResult, PriceSuggestionResult, VinDecodeResult } from "@car-parts/types";
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
    ...(options.headers as Record<string, string> ?? {}),
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
        return request<{ parts: PartSummary[]; pagination: PaginatedResponse<never>["pagination"] }>(
          config,
          `/api/parts${qs ? `?${qs}` : ""}`,
        );
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
      suggestPrice(data: { partType: string; conditionGrade: string; make?: string; model?: string; year?: number }) {
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
      create(data: { partId?: string; sellerId: string; rating: number; comment?: string }) {
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
```

- [ ] **Step 6: Create packages/api-client/src/index.ts**

```typescript
export { createApiClient } from "./client";
export type { ApiClient, ApiClientConfig } from "./client";
```

- [ ] **Step 7: Run test to confirm it passes**

```bash
cd packages/api-client && npx vitest run src/client.test.ts
```

Expected: PASS — both tests green.

- [ ] **Step 8: Run npm install and commit**

```bash
cd ../.. && npm install
git add packages/api-client package-lock.json
git commit -m "feat(api-client): add shared typed API client package"
```

---

### Task 6: Reorganize Next.js routes into (seller), (buyer), (ops) groups

**Files:**
- Create: `apps/web/src/app/(seller)/` — seller route group
- Create: `apps/web/src/app/(buyer)/` — buyer route group
- Create: `apps/web/src/app/(ops)/` — ops route group
- Move (no content changes): all existing page files to new locations

Route mapping:

| Old path | New path |
|---|---|
| `dashboard/page.tsx` | `(seller)/dashboard/page.tsx` |
| `dashboard/analytics/page.tsx` | `(seller)/dashboard/analytics/page.tsx` |
| `dashboard/inventory/page.tsx` | `(seller)/dashboard/inventory/page.tsx` |
| `dashboard/orders/page.tsx` | `(seller)/dashboard/orders/page.tsx` |
| `parts/new/page.tsx` | `(seller)/parts/new/page.tsx` |
| `parts/bulk/page.tsx` | `(seller)/parts/bulk/page.tsx` |
| `search/page.tsx` | `(buyer)/search/page.tsx` |
| `parts/[id]/page.tsx` | `(buyer)/parts/[id]/page.tsx` |
| `parts/[id]/layout.tsx` | `(buyer)/parts/[id]/layout.tsx` |
| `cart/page.tsx` | `(buyer)/cart/page.tsx` |
| `dashboard/garage/page.tsx` | `(buyer)/garage/page.tsx` |
| `dashboard/watchlist/page.tsx` | `(buyer)/watchlist/page.tsx` |
| `sellers/[id]/page.tsx` | `(buyer)/sellers/[id]/page.tsx` |
| `admin/page.tsx` | `(ops)/admin/page.tsx` |

Stays at root (shared):
- `page.tsx` (landing)
- `layout.tsx`
- `auth/` (sign in / register)
- `messages/` (used by both seller and buyer)
- `api/` (all API routes — NOT moved in this plan)
- `sitemap.ts`

- [ ] **Step 1: Create route group directories**

```bash
cd apps/web/src/app
mkdir -p "(seller)/dashboard/analytics"
mkdir -p "(seller)/dashboard/inventory"
mkdir -p "(seller)/dashboard/orders"
mkdir -p "(seller)/parts/new"
mkdir -p "(seller)/parts/bulk"
mkdir -p "(buyer)/search"
mkdir -p "(buyer)/parts/[id]"
mkdir -p "(buyer)/cart"
mkdir -p "(buyer)/garage"
mkdir -p "(buyer)/watchlist"
mkdir -p "(buyer)/sellers/[id]"
mkdir -p "(ops)/admin"
```

- [ ] **Step 2: Move seller pages**

```bash
cd apps/web/src/app
mv dashboard/page.tsx "(seller)/dashboard/page.tsx"
mv dashboard/analytics/page.tsx "(seller)/dashboard/analytics/page.tsx"
mv dashboard/inventory/page.tsx "(seller)/dashboard/inventory/page.tsx"
mv dashboard/orders/page.tsx "(seller)/dashboard/orders/page.tsx"
mv parts/new/page.tsx "(seller)/parts/new/page.tsx"
mv parts/bulk/page.tsx "(seller)/parts/bulk/page.tsx"
```

- [ ] **Step 3: Move buyer pages**

```bash
cd apps/web/src/app
mv search/page.tsx "(buyer)/search/page.tsx"
mv "parts/[id]/page.tsx" "(buyer)/parts/[id]/page.tsx"
mv "parts/[id]/layout.tsx" "(buyer)/parts/[id]/layout.tsx"
mv cart/page.tsx "(buyer)/cart/page.tsx"
mv dashboard/garage/page.tsx "(buyer)/garage/page.tsx"
mv dashboard/watchlist/page.tsx "(buyer)/watchlist/page.tsx"
mv "sellers/[id]/page.tsx" "(buyer)/sellers/[id]/page.tsx"
```

- [ ] **Step 4: Move ops pages**

```bash
cd apps/web/src/app
mv admin/page.tsx "(ops)/admin/page.tsx"
```

- [ ] **Step 5: Clean up empty directories**

```bash
cd apps/web/src/app
rmdir dashboard/analytics dashboard/inventory dashboard/orders dashboard/garage dashboard/watchlist dashboard 2>/dev/null || true
rmdir parts/new parts/bulk "parts/[id]" parts 2>/dev/null || true
rmdir search cart "sellers/[id]" sellers admin 2>/dev/null || true
```

- [ ] **Step 6: Verify dev server starts and routes resolve**

```bash
cd apps/web && npm run dev
```

Open in browser and verify these URLs still work:
- `http://localhost:3000/` — landing page
- `http://localhost:3000/dashboard` — seller dashboard (redirect to new path automatically — Next.js route groups are transparent to URLs)
- `http://localhost:3000/search` — buyer search
- `http://localhost:3000/admin` — ops admin

Route groups in Next.js (the `(groupname)` syntax) do NOT change the URL. `/dashboard` is still `/dashboard` — only the file location changes. No link or redirect updates needed.

- [ ] **Step 7: Run tests**

```bash
cd apps/web && npm test
```

Expected: All tests pass (tests don't import page files directly).

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app
git commit -m "refactor(web): organize routes into (seller), (buyer), (ops) groups"
```

---

### Task 7: Scaffold apps/seller-app (Expo)

**Files:**
- Create: `apps/seller-app/` — Expo React Native project

- [ ] **Step 1: Create the Expo app**

```bash
cd apps
npx create-expo-app@latest seller-app --template blank-typescript
```

Expected: `apps/seller-app/` created with a working Expo TypeScript project.

- [ ] **Step 2: Add @car-parts/types and @car-parts/api-client as dependencies**

Edit `apps/seller-app/package.json`, add to `dependencies`:

```json
"@car-parts/types": "*",
"@car-parts/api-client": "*"
```

Also set the name:
```json
"name": "@car-parts/seller-app"
```

- [ ] **Step 3: Create apps/seller-app/src/api.ts — configure the shared client**

```typescript
import { createApiClient } from "@car-parts/api-client";
import * as SecureStore from "expo-secure-store";

export const api = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
  getToken: () => {
    // SecureStore.getItem is sync in newer Expo; use a cached token pattern
    return null; // Will be wired up in auth task
  },
});
```

- [ ] **Step 4: Replace apps/seller-app/App.tsx with basic tab shell**

```typescript
import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function App() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: "Inventory" }} />
      <Tabs.Screen name="camera" options={{ title: "List Part" }} />
      <Tabs.Screen name="orders" options={{ title: "Orders" }} />
      <Tabs.Screen name="analytics" options={{ title: "Analytics" }} />
    </Tabs>
  );
}
```

- [ ] **Step 5: Install expo-secure-store and expo-router**

```bash
cd apps/seller-app
npx expo install expo-secure-store expo-router expo-camera expo-barcode-scanner
```

- [ ] **Step 6: Run npm install at root to link packages**

```bash
cd ../.. && npm install
```

- [ ] **Step 7: Verify Expo project starts**

```bash
cd apps/seller-app && npx expo start --no-dev
```

Expected: QR code appears, app loads on simulator/device with the 4-tab shell.

- [ ] **Step 8: Commit**

```bash
cd ../..
git add apps/seller-app package-lock.json
git commit -m "feat(seller-app): scaffold Expo seller app with tab navigation"
```

---

### Task 8: Scaffold apps/buyer-app (Expo)

**Files:**
- Create: `apps/buyer-app/` — Expo React Native project

- [ ] **Step 1: Create the Expo app**

```bash
cd apps
npx create-expo-app@latest buyer-app --template blank-typescript
```

- [ ] **Step 2: Configure package.json**

Edit `apps/buyer-app/package.json`:
```json
"name": "@car-parts/buyer-app",
"dependencies": {
  "@car-parts/types": "*",
  "@car-parts/api-client": "*"
}
```

- [ ] **Step 3: Create apps/buyer-app/src/api.ts**

```typescript
import { createApiClient } from "@car-parts/api-client";

export const api = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
  getToken: () => null, // wired up in auth task
});
```

- [ ] **Step 4: Replace App.tsx with tab shell**

```typescript
import { Tabs } from "expo-router";

export default function App() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: "Search" }} />
      <Tabs.Screen name="garage" options={{ title: "My Garage" }} />
      <Tabs.Screen name="orders" options={{ title: "Orders" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
  );
}
```

- [ ] **Step 5: Install dependencies**

```bash
cd apps/buyer-app
npx expo install expo-secure-store expo-router expo-camera expo-barcode-scanner
```

- [ ] **Step 6: Link workspaces and verify**

```bash
cd ../.. && npm install
cd apps/buyer-app && npx expo start --no-dev
```

Expected: App loads with 4-tab shell.

- [ ] **Step 7: Commit**

```bash
cd ../..
git add apps/buyer-app package-lock.json
git commit -m "feat(buyer-app): scaffold Expo buyer app with tab navigation"
```

---

### Task 9: Add .gitignore entries and finalize

**Files:**
- Modify: `.gitignore` — add monorepo-specific entries

- [ ] **Step 1: Update .gitignore**

Add to root `.gitignore`:

```
# Monorepo
apps/*/node_modules
apps/*/.expo
apps/*/.next
packages/*/node_modules
packages/*/dist

# Superpowers
.superpowers/
```

- [ ] **Step 2: Run full test suite from root**

```bash
npx turbo test
```

Expected: All tests pass across all packages.

- [ ] **Step 3: Run full build from root**

```bash
npx turbo build
```

Expected: `apps/web` builds successfully. Expo apps are not built in CI (they use `expo build` separately).

- [ ] **Step 4: Final commit**

```bash
git add .gitignore
git commit -m "chore: finalize monorepo setup, update .gitignore"
```

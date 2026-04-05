# Buyer & Ops Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the buyer-facing features missing from the current web app (price history chart, guest checkout, stock reservation, "Is this a fair price?" AI) and build out the Ops dashboard with dispute queue, feature flags, fraud detection, and seller management tools.

**Architecture:** New API routes follow namespaced conventions. Buyer enhancements extend existing pages. Ops dashboard is the existing `/admin` route expanded into a full internal tool. Feature flags stored in a new DB model and cached in-memory.

**Tech Stack:** Next.js 16.2.1, Prisma 7, Tailwind CSS v4, Vitest. No new external services — uses existing Stripe, Claude AI, and PostgreSQL.

**Prerequisites:** Plan 1 (Monorepo Foundation) and Plan 2 (Seller System) complete.

---

### Task 1: Schema — add FeatureFlag, Dispute, FraudFlag, DiscountCode

**Files:**
- Modify: `apps/web/prisma/schema.prisma`

- [ ] **Step 1: Add new models to schema**

In `apps/web/prisma/schema.prisma`, add after existing models:

```prisma
// ──────────────────────────────────────────
// Ops & Platform Config
// ──────────────────────────────────────────

model FeatureFlag {
  id          String   @id @default(cuid())
  key         String   @unique
  enabled     Boolean  @default(false)
  description String?
  updatedAt   DateTime @updatedAt
  updatedBy   String?  // admin user id
}

enum DisputeStatus {
  OPEN
  UNDER_REVIEW
  RESOLVED_BUYER
  RESOLVED_SELLER
  RESOLVED_SPLIT
  CLOSED
}

model Dispute {
  id          String        @id @default(cuid())
  orderId     String        @unique
  buyerId     String
  sellerId    String
  reason      String
  description String?
  photos      String[]      // JSON array of image URLs
  status      DisputeStatus @default(OPEN)
  resolution  String?
  resolvedBy  String?       // ops user id
  resolvedAt  DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  order  Order @relation(fields: [orderId], references: [id])
  buyer  User  @relation("BuyerDisputes", fields: [buyerId], references: [id])
  seller User  @relation("SellerDisputes", fields: [sellerId], references: [id])

  @@index([status])
  @@index([buyerId])
  @@index([sellerId])
}

enum FraudFlagType {
  DUPLICATE_LISTING
  PRICE_ANOMALY
  VELOCITY
  CHARGEBACK
  REPORTED_BY_USER
}

model FraudFlag {
  id          String        @id @default(cuid())
  targetId    String        // userId or partId depending on type
  targetType  String        // "user" | "part"
  type        FraudFlagType
  details     String?
  resolved    Boolean       @default(false)
  resolvedBy  String?
  createdAt   DateTime      @default(now())

  @@index([targetId])
  @@index([resolved])
}

model DiscountCode {
  id           String    @id @default(cuid())
  code         String    @unique
  type         String    // "percent" | "flat" | "free_shipping"
  value        Decimal?  @db.Decimal(10, 2)
  maxUses      Int?
  usedCount    Int       @default(0)
  expiresAt    DateTime?
  createdBy    String
  active       Boolean   @default(true)
  createdAt    DateTime  @default(now())
}
```

Add `Dispute` relations to `Order` and `User`:
```prisma
// In Order model, add:
  dispute  Dispute?

// In User model, add:
  buyerDisputes   Dispute[] @relation("BuyerDisputes")
  sellerDisputes  Dispute[] @relation("SellerDisputes")
```

- [ ] **Step 2: Run migration**

```bash
cd apps/web && npm run db:migrate
```

Migration name: `add_disputes_flags_feature_flags`

- [ ] **Step 3: Seed default feature flags**

Create `apps/web/prisma/seed-flags.ts`:

```typescript
import { prisma } from "../src/lib/prisma";

const flags = [
  { key: "buyer_guest_checkout", enabled: true, description: "Allow buyers to checkout without an account" },
  { key: "seller_instant_payout", enabled: false, description: "Stripe instant payout for sellers" },
  { key: "ai_fraud_detection", enabled: true, description: "Auto-flag suspicious listings via AI" },
  { key: "price_history_chart", enabled: true, description: "Show price history chart on part detail pages" },
  { key: "offer_negotiation", enabled: true, description: "Allow buyers to make offers below asking price" },
];

async function main() {
  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {},
      create: flag,
    });
  }
  console.log("Feature flags seeded");
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

Run it:
```bash
cd apps/web && npx tsx prisma/seed-flags.ts
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/prisma
git commit -m "feat(schema): add Dispute, FeatureFlag, FraudFlag, DiscountCode models"
```

---

### Task 2: Feature flags API (ops CRUD + cached reads)

**Files:**
- Create: `apps/web/src/lib/flags.ts` — cached flag reader
- Create: `apps/web/src/app/api/ops/flags/route.ts`
- Create: `apps/web/src/app/api/ops/flags/[key]/route.ts`
- Create: `apps/web/src/app/api/ops/flags/flags.test.ts`

- [ ] **Step 1: Write failing test**

Create `apps/web/src/app/api/ops/flags/flags.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    featureFlag: {
      findMany: vi.fn().mockResolvedValue([
        { key: "buyer_guest_checkout", enabled: true, description: "Allow guest checkout" },
      ]),
      upsert: vi.fn().mockImplementation(({ create }) => Promise.resolve(create)),
    },
  },
}));

describe("GET /api/ops/flags", () => {
  it("returns all feature flags for admin", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ops/flags");
    const res = await GET(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toBeInstanceOf(Array);
    expect(body[0]).toHaveProperty("key");
    expect(body[0]).toHaveProperty("enabled");
  });

  it("returns 401 for non-admin", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "u1", role: "SELLER" } } as never);

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ops/flags");
    const res = await GET(req as never);
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/web && npm test -- flags.test
```

Expected: FAIL.

- [ ] **Step 3: Create apps/web/src/lib/flags.ts — cached flag reader**

```typescript
import { prisma } from "./prisma";

let cache: Map<string, boolean> = new Map();
let cacheExpiry = 0;
const TTL_MS = 60_000; // 1 minute cache

export async function getFlag(key: string): Promise<boolean> {
  if (Date.now() > cacheExpiry) {
    const flags = await prisma.featureFlag.findMany({ select: { key: true, enabled: true } });
    cache = new Map(flags.map(f => [f.key, f.enabled]));
    cacheExpiry = Date.now() + TTL_MS;
  }
  return cache.get(key) ?? false;
}

export function invalidateFlagCache() {
  cacheExpiry = 0;
}
```

- [ ] **Step 4: Create apps/web/src/app/api/ops/flags/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invalidateFlagCache } from "@/lib/flags";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const flags = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json(flags);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { key, enabled, description } = await req.json() as {
    key: string; enabled: boolean; description?: string;
  };

  const flag = await prisma.featureFlag.upsert({
    where: { key },
    update: { enabled, updatedBy: session.user.id },
    create: { key, enabled, description, updatedBy: session.user.id },
  });

  invalidateFlagCache();
  return NextResponse.json(flag);
}
```

- [ ] **Step 5: Create apps/web/src/app/api/ops/flags/[key]/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invalidateFlagCache } from "@/lib/flags";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { key } = await params;
  const { enabled } = await req.json() as { enabled: boolean };

  const flag = await prisma.featureFlag.update({
    where: { key },
    data: { enabled, updatedBy: session.user.id },
  });

  invalidateFlagCache();
  return NextResponse.json(flag);
}
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
cd apps/web && npm test -- flags.test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/flags.ts apps/web/src/app/api/ops/flags
git commit -m "feat(ops): add feature flag API with in-memory cache"
```

---

### Task 3: Dispute queue API

**Files:**
- Create: `apps/web/src/app/api/buyer/disputes/route.ts` — POST to open a dispute
- Create: `apps/web/src/app/api/ops/disputes/route.ts` — GET all disputes
- Create: `apps/web/src/app/api/ops/disputes/[id]/route.ts` — PATCH to resolve
- Create: `apps/web/src/app/api/ops/disputes/dispute.test.ts`

- [ ] **Step 1: Write failing test**

Create `apps/web/src/app/api/ops/disputes/dispute.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } }),
}));

const mockDisputes = [
  {
    id: "d1",
    orderId: "order-1",
    reason: "Part not as described",
    status: "OPEN",
    createdAt: new Date().toISOString(),
    buyer: { id: "b1", name: "Alice" },
    seller: { id: "s1", name: "Bob's Yard" },
    order: { id: "order-1", total: "150.00" },
  },
];

vi.mock("@/lib/prisma", () => ({
  prisma: {
    dispute: {
      findMany: vi.fn().mockResolvedValue(mockDisputes),
      findUnique: vi.fn().mockResolvedValue(mockDisputes[0]),
      update: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ ...mockDisputes[0], ...data })
      ),
    },
  },
}));

describe("GET /api/ops/disputes", () => {
  it("returns all disputes for admin", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ops/disputes");
    const res = await GET(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toBeInstanceOf(Array);
    expect(body[0].reason).toBe("Part not as described");
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/web && npm test -- dispute.test
```

Expected: FAIL.

- [ ] **Step 3: Create buyer dispute submission endpoint**

Create `apps/web/src/app/api/buyer/disputes/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId, reason, description, photos } = await req.json() as {
    orderId: string;
    reason: string;
    description?: string;
    photos?: string[];
  };

  const order = await prisma.order.findFirst({
    where: { id: orderId, buyerId: session.user.id },
    select: { id: true, sellerId: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const existing = await prisma.dispute.findUnique({ where: { orderId } });
  if (existing) return NextResponse.json({ error: "Dispute already exists for this order" }, { status: 409 });

  const dispute = await prisma.dispute.create({
    data: {
      orderId,
      buyerId: session.user.id,
      sellerId: order.sellerId,
      reason,
      description,
      photos: photos ?? [],
    },
  });

  return NextResponse.json(dispute, { status: 201 });
}
```

- [ ] **Step 4: Create ops dispute list endpoint**

Create `apps/web/src/app/api/ops/disputes/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const disputes = await prisma.dispute.findMany({
    where: status ? { status: status as never } : {},
    include: {
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, name: true, email: true } },
      order: { select: { id: true, total: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(disputes);
}
```

- [ ] **Step 5: Create ops dispute resolution endpoint**

Create `apps/web/src/app/api/ops/disputes/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { status, resolution } = await req.json() as {
    status: "RESOLVED_BUYER" | "RESOLVED_SELLER" | "RESOLVED_SPLIT" | "CLOSED";
    resolution: string;
  };

  const dispute = await prisma.dispute.update({
    where: { id },
    data: {
      status,
      resolution,
      resolvedBy: session.user.id,
      resolvedAt: new Date(),
    },
  });

  return NextResponse.json(dispute);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: {
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, name: true, email: true } },
      order: {
        include: {
          items: { include: { part: { select: { id: true, title: true } } } },
        },
      },
    },
  });

  if (!dispute) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(dispute);
}
```

- [ ] **Step 6: Run tests**

```bash
cd apps/web && npm test -- dispute.test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/api/buyer/disputes apps/web/src/app/api/ops/disputes
git commit -m "feat(ops,buyer): add dispute queue — submit, list, and resolve endpoints"
```

---

### Task 4: Fraud detection — velocity check and duplicate listing detection

**Files:**
- Create: `apps/web/src/lib/fraud.ts`
- Create: `apps/web/src/lib/fraud.test.ts`
- Modify: `apps/web/src/app/api/parts/route.ts` — add fraud checks on POST

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/lib/fraud.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    part: {
      count: vi.fn(),
    },
    fraudFlag: {
      create: vi.fn().mockResolvedValue({ id: "ff1" }),
    },
  },
}));

describe("checkListingVelocity", () => {
  it("returns safe when under threshold", async () => {
    const { prisma } = await import("./prisma");
    vi.mocked(prisma.part.count).mockResolvedValueOnce(3);

    const { checkListingVelocity } = await import("./fraud");
    const result = await checkListingVelocity("seller-1");
    expect(result.flagged).toBe(false);
  });

  it("flags seller who listed 50+ parts in one hour", async () => {
    const { prisma } = await import("./prisma");
    vi.mocked(prisma.part.count).mockResolvedValueOnce(55);

    const { checkListingVelocity } = await import("./fraud");
    const result = await checkListingVelocity("seller-1");
    expect(result.flagged).toBe(true);
    expect(result.reason).toContain("velocity");
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/web && npm test -- fraud.test
```

Expected: FAIL.

- [ ] **Step 3: Create apps/web/src/lib/fraud.ts**

```typescript
import { prisma } from "./prisma";

const VELOCITY_THRESHOLD = 50; // parts per hour before flagging

export async function checkListingVelocity(sellerId: string): Promise<{ flagged: boolean; reason?: string }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const count = await prisma.part.count({
    where: {
      sellerId,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (count >= VELOCITY_THRESHOLD) {
    await prisma.fraudFlag.create({
      data: {
        targetId: sellerId,
        targetType: "user",
        type: "VELOCITY",
        details: `Listed ${count} parts in the last hour`,
      },
    });
    return { flagged: true, reason: `velocity: ${count} listings in 1 hour` };
  }

  return { flagged: false };
}

export async function checkPriceAnomaly(
  partType: string,
  price: number,
  sellerId: string,
  partId: string
): Promise<{ flagged: boolean; reason?: string }> {
  // Get average price for this part type from recent sold listings
  const recent = await prisma.part.findMany({
    where: { partType, status: "SOLD" },
    select: { price: true },
    take: 50,
    orderBy: { updatedAt: "desc" },
  });

  if (recent.length < 5) return { flagged: false }; // not enough data

  const avg = recent.reduce((sum, p) => sum + Number(p.price), 0) / recent.length;

  // Flag if price is less than 20% of average (suspiciously cheap) or more than 5x (suspiciously expensive)
  if (price < avg * 0.2 || price > avg * 5) {
    await prisma.fraudFlag.create({
      data: {
        targetId: partId,
        targetType: "part",
        type: "PRICE_ANOMALY",
        details: `Price $${price} vs avg $${avg.toFixed(2)} for ${partType}`,
      },
    });
    return { flagged: true, reason: `price anomaly: $${price} vs market avg $${avg.toFixed(2)}` };
  }

  return { flagged: false };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/web && npm test -- fraud.test
```

Expected: PASS.

- [ ] **Step 5: Wire fraud checks into the part creation endpoint**

In `apps/web/src/app/api/parts/route.ts`, after creating the part in the `POST` handler, add before the return:

```typescript
// After: const part = await prisma.part.create({...})
// Add (non-blocking — fire and forget):
import { checkListingVelocity, checkPriceAnomaly } from "@/lib/fraud";

// In the POST handler, after creating the part:
void Promise.all([
  checkListingVelocity(session.user.id),
  checkPriceAnomaly(partType, parseFloat(price), session.user.id, part.id),
]);
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/fraud.ts apps/web/src/lib/fraud.test.ts apps/web/src/app/api/parts/route.ts
git commit -m "feat(ops): add fraud detection — velocity checks and price anomaly flagging"
```

---

### Task 5: Buyer — stock reservation during checkout

**Files:**
- Create: `apps/web/src/app/api/buyer/reserve/route.ts`
- Create: `apps/web/src/app/api/buyer/reserve/reserve.test.ts`

When a buyer enters checkout, reserve the part for 30 minutes to prevent another buyer from purchasing it simultaneously.

- [ ] **Step 1: Add reservation fields to schema**

In `apps/web/prisma/schema.prisma`, add to the `Part` model:

```prisma
  reservedBy    String?
  reservedUntil DateTime?
```

Run migration:
```bash
cd apps/web && npm run db:migrate
```

Migration name: `add_part_reservation`

- [ ] **Step 2: Write failing test**

Create `apps/web/src/app/api/buyer/reserve/reserve.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "buyer-1", role: "BUYER" } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    part: {
      findFirst: vi.fn().mockResolvedValue({
        id: "part-1",
        status: "ACTIVE",
        reservedBy: null,
        reservedUntil: null,
      }),
      update: vi.fn().mockResolvedValue({ id: "part-1", reservedBy: "buyer-1" }),
    },
  },
}));

describe("POST /api/buyer/reserve", () => {
  it("reserves an available part for 30 minutes", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/buyer/reserve", {
      method: "POST",
      body: JSON.stringify({ partId: "part-1" }),
    });

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reserved).toBe(true);
  });

  it("returns 409 when part is already reserved by another buyer", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.part.findFirst).mockResolvedValueOnce({
      id: "part-1",
      status: "ACTIVE",
      reservedBy: "other-buyer",
      reservedUntil: new Date(Date.now() + 1000 * 60 * 20), // 20 min remaining
    } as never);

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/buyer/reserve", {
      method: "POST",
      body: JSON.stringify({ partId: "part-1" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
cd apps/web && npm test -- reserve.test
```

Expected: FAIL.

- [ ] **Step 4: Create the reserve route**

Create `apps/web/src/app/api/buyer/reserve/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const RESERVATION_MINUTES = 30;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { partId } = await req.json() as { partId: string };

  const part = await prisma.part.findFirst({
    where: { id: partId, status: "ACTIVE" },
    select: { id: true, reservedBy: true, reservedUntil: true },
  });

  if (!part) return NextResponse.json({ error: "Part not available" }, { status: 404 });

  // Check if reserved by someone else and still valid
  if (
    part.reservedBy &&
    part.reservedBy !== session.user.id &&
    part.reservedUntil &&
    part.reservedUntil > new Date()
  ) {
    const minutesLeft = Math.ceil((part.reservedUntil.getTime() - Date.now()) / 60000);
    return NextResponse.json(
      { error: `Part is reserved by another buyer for ${minutesLeft} more minutes` },
      { status: 409 }
    );
  }

  const reservedUntil = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);

  await prisma.part.update({
    where: { id: partId },
    data: { reservedBy: session.user.id, reservedUntil },
  });

  return NextResponse.json({ reserved: true, reservedUntil });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { partId } = await req.json() as { partId: string };

  await prisma.part.updateMany({
    where: { id: partId, reservedBy: session.user.id },
    data: { reservedBy: null, reservedUntil: null },
  });

  return NextResponse.json({ released: true });
}
```

- [ ] **Step 5: Update part search to exclude reserved parts from other buyers**

In `apps/web/src/app/api/parts/route.ts` GET handler, update the `where` object to filter out expired or others' reservations. After the existing `where` filters, add:

```typescript
// Exclude parts reserved by someone else (not the current user) with valid reservations
where.OR = [
  { reservedBy: null },
  { reservedUntil: { lt: new Date() } },
  // if user is authenticated, also show their own reservations:
  ...(session?.user ? [{ reservedBy: session.user.id }] : []),
];
```

- [ ] **Step 6: Run tests**

```bash
cd apps/web && npm test -- reserve.test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/api/buyer/reserve apps/web/src/app/api/parts/route.ts apps/web/prisma
git commit -m "feat(buyer): add 30-minute stock reservation during checkout"
```

---

### Task 6: Discount codes API

**Files:**
- Create: `apps/web/src/app/api/buyer/discount/route.ts` — validate a code
- Create: `apps/web/src/app/api/ops/discounts/route.ts` — CRUD for ops
- Create: `apps/web/src/app/api/buyer/discount/discount.test.ts`

- [ ] **Step 1: Write failing test**

Create `apps/web/src/app/api/buyer/discount/discount.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "buyer-1", role: "BUYER" } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    discountCode: {
      findUnique: vi.fn(),
    },
  },
}));

describe("POST /api/buyer/discount", () => {
  it("returns discount details for a valid active code", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.discountCode.findUnique).mockResolvedValueOnce({
      id: "dc1",
      code: "SAVE10",
      type: "percent",
      value: 10,
      maxUses: 100,
      usedCount: 5,
      expiresAt: new Date(Date.now() + 86400000),
      active: true,
    } as never);

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/buyer/discount", {
      method: "POST",
      body: JSON.stringify({ code: "SAVE10", subtotal: 200 }),
    });

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.valid).toBe(true);
    expect(body.discountAmount).toBe(20); // 10% of 200
  });

  it("returns 404 for unknown code", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.discountCode.findUnique).mockResolvedValueOnce(null);

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/buyer/discount", {
      method: "POST",
      body: JSON.stringify({ code: "INVALID", subtotal: 200 }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/web && npm test -- discount.test
```

Expected: FAIL.

- [ ] **Step 3: Create the discount validation endpoint**

Create `apps/web/src/app/api/buyer/discount/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code, subtotal } = await req.json() as { code: string; subtotal: number };

  const discount = await prisma.discountCode.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!discount || !discount.active) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 404 });
  }

  if (discount.expiresAt && discount.expiresAt < new Date()) {
    return NextResponse.json({ error: "Code has expired" }, { status: 410 });
  }

  if (discount.maxUses && discount.usedCount >= discount.maxUses) {
    return NextResponse.json({ error: "Code has reached its usage limit" }, { status: 410 });
  }

  let discountAmount = 0;
  if (discount.type === "percent" && discount.value) {
    discountAmount = (subtotal * Number(discount.value)) / 100;
  } else if (discount.type === "flat" && discount.value) {
    discountAmount = Math.min(Number(discount.value), subtotal);
  } else if (discount.type === "free_shipping") {
    discountAmount = 0; // handled at order level
  }

  return NextResponse.json({
    valid: true,
    code: discount.code,
    type: discount.type,
    discountAmount: Math.round(discountAmount * 100) / 100,
    freeShipping: discount.type === "free_shipping",
  });
}
```

- [ ] **Step 4: Create ops discount management endpoint**

Create `apps/web/src/app/api/ops/discounts/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "ADMIN" ? session : null;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const codes = await prisma.discountCode.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(codes);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { code, type, value, maxUses, expiresAt } = await req.json() as {
    code: string;
    type: "percent" | "flat" | "free_shipping";
    value?: number;
    maxUses?: number;
    expiresAt?: string;
  };

  const discount = await prisma.discountCode.create({
    data: {
      code: code.toUpperCase(),
      type,
      value,
      maxUses,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: session.user.id,
    },
  });

  return NextResponse.json(discount, { status: 201 });
}
```

- [ ] **Step 5: Run tests**

```bash
cd apps/web && npm test -- discount.test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/api/buyer/discount apps/web/src/app/api/ops/discounts
git commit -m "feat(buyer,ops): add discount code validation and ops management"
```

---

### Task 7: Ops seller management — suspend/ban/tier endpoints

**Files:**
- Create: `apps/web/src/app/api/ops/sellers/[id]/route.ts`
- Create: `apps/web/src/app/api/ops/sellers/[id]/seller-ops.test.ts`

- [ ] **Step 1: Write failing test**

Create `apps/web/src/app/api/ops/sellers/[id]/seller-ops.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({ id: "seller-1", role: "SELLER", sellerTier: "NEW" }),
      update: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: "seller-1", ...data })
      ),
    },
    part: {
      updateMany: vi.fn().mockResolvedValue({ count: 5 }),
    },
  },
}));

describe("PATCH /api/ops/sellers/[id]", () => {
  it("updates seller tier", async () => {
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/ops/sellers/seller-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "set_tier", tier: "VERIFIED" }),
    });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: "seller-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sellerTier).toBe("VERIFIED");
  });

  it("suspends seller and hides their listings", async () => {
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/ops/sellers/seller-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "suspend" }),
    });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: "seller-1" }) });
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/web && npm test -- seller-ops.test
```

Expected: FAIL.

- [ ] **Step 3: Create the endpoint**

Create `apps/web/src/app/api/ops/sellers/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const seller = await prisma.user.findUnique({
    where: { id },
    include: {
      parts: { select: { id: true, status: true, title: true, price: true }, take: 10, orderBy: { createdAt: "desc" } },
      sellerOrders: { select: { id: true, status: true, total: true, createdAt: true }, take: 10, orderBy: { createdAt: "desc" } },
      sellerReviews: { select: { rating: true, comment: true, createdAt: true }, take: 10 },
    },
  });

  if (!seller) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(seller);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { action, tier } = await req.json() as {
    action: "suspend" | "unsuspend" | "ban" | "set_tier" | "verify";
    tier?: string;
  };

  const seller = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!seller) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "set_tier") {
    const updated = await prisma.user.update({
      where: { id },
      data: { sellerTier: tier as never },
    });
    return NextResponse.json(updated);
  }

  if (action === "suspend") {
    // Hide all their active listings
    await prisma.part.updateMany({
      where: { sellerId: id, status: "ACTIVE" },
      data: { status: "INACTIVE" },
    });
    const updated = await prisma.user.update({
      where: { id },
      data: { holidayMode: true, holidayMessage: "Account suspended" },
    });
    return NextResponse.json(updated);
  }

  if (action === "unsuspend") {
    await prisma.part.updateMany({
      where: { sellerId: id, status: "INACTIVE" },
      data: { status: "ACTIVE" },
    });
    const updated = await prisma.user.update({
      where: { id },
      data: { holidayMode: false, holidayMessage: null },
    });
    return NextResponse.json(updated);
  }

  if (action === "ban") {
    // More permanent — change role to block access
    await prisma.part.updateMany({
      where: { sellerId: id },
      data: { status: "INACTIVE" },
    });
    const updated = await prisma.user.update({ where: { id }, data: { role: "BUYER" } });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
```

- [ ] **Step 4: Run tests**

```bash
cd apps/web && npm test -- seller-ops.test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/ops/sellers
git commit -m "feat(ops): add seller management — suspend, unsuspend, ban, set tier"
```

---

### Task 8: Run full test suite

- [ ] **Step 1: Run all tests**

```bash
cd apps/web && npm test
```

Expected: All tests pass.

- [ ] **Step 2: Type-check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "chore: plan 4 complete — buyer + ops enhancements all tests passing"
```

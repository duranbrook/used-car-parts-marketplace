# Seller System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build out all seller-facing features on the web app: storage locations, yard map, enhanced donor vehicle tracking, S3 image upload, offer negotiation, earnings/payouts, and a seller onboarding flow.

**Architecture:** All new features extend the existing Next.js app at `apps/web`. New API routes follow the namespaced convention `/api/seller/*`. Schema changes are additive migrations. S3 uploads use presigned URLs — the client uploads directly, no server proxy.

**Tech Stack:** Next.js 16.2.1, Prisma 7, PostgreSQL, AWS S3 (or Cloudflare R2), Tailwind CSS v4, Vitest, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`

**Prerequisites:** Plan 1 (Monorepo Foundation) complete.

---

### Task 1: Schema — add StorageLocation, SellerTier, DismantleStatus

**Files:**
- Modify: `apps/web/prisma/schema.prisma`
- Create: `apps/web/prisma/migrations/` (auto-generated)

- [ ] **Step 1: Add SellerTier enum and fields to schema**

In `apps/web/prisma/schema.prisma`, after the `UserRole` enum:

```prisma
enum SellerTier {
  NEW
  VERIFIED
  TOP_RATED
  POWER_SELLER
}

enum DismantleStatus {
  WHOLE
  PARTIAL
  STRIPPED
}
```

Add to `User` model:
```prisma
  sellerTier     SellerTier?
  businessName   String?
  businessLicense String?
  holidayMode    Boolean  @default(false)
  holidayMessage String?
  avgResponseTime Int?    // minutes
```

Add to `Part` model:
```prisma
  storageRow     String?
  storageBin     String?
  storageShelf   String?
```

Add to `Vehicle` model:
```prisma
  dismantleStatus DismantleStatus @default(WHOLE)
  mileage         Int?
  color           String?
  photos          VehiclePhoto[]
```

Add new model after `Vehicle`:
```prisma
model VehiclePhoto {
  id        String   @id @default(cuid())
  vehicleId String
  url       String
  label     String?  // "exterior", "interior", "odometer", "damage"
  createdAt DateTime @default(now())

  vehicle Vehicle @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
}
```

Add `Offer` model:
```prisma
enum OfferStatus {
  PENDING
  ACCEPTED
  DECLINED
  COUNTERED
  EXPIRED
}

model Offer {
  id         String      @id @default(cuid())
  partId     String
  buyerId    String
  sellerId   String
  amount     Decimal     @db.Decimal(10, 2)
  status     OfferStatus @default(PENDING)
  counterAmount Decimal? @db.Decimal(10, 2)
  expiresAt  DateTime
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt

  part   Part @relation(fields: [partId], references: [id])
  buyer  User @relation("BuyerOffers", fields: [buyerId], references: [id])
  seller User @relation("SellerOffers", fields: [sellerId], references: [id])

  @@index([partId])
  @@index([buyerId])
  @@index([sellerId])
}
```

Add `Offer` relations to `Part` and `User`:
```prisma
// In Part model:
  offers  Offer[]

// In User model:
  buyerOffers   Offer[] @relation("BuyerOffers")
  sellerOffers  Offer[] @relation("SellerOffers")
```

- [ ] **Step 2: Run migration**

```bash
cd apps/web && npm run db:migrate
```

When prompted for migration name, enter: `add_seller_tier_storage_offers`

Expected: Migration files created in `prisma/migrations/`, Prisma client regenerated.

- [ ] **Step 3: Commit**

```bash
git add apps/web/prisma
git commit -m "feat(schema): add seller tier, storage locations, offers, vehicle dismantling"
```

---

### Task 2: S3 presigned URL upload endpoint

**Files:**
- Create: `apps/web/src/app/api/seller/upload-url/route.ts`
- Create: `apps/web/src/app/api/seller/upload-url/upload-url.test.ts`

Sellers upload images directly to S3. The flow: client requests a presigned PUT URL from this endpoint → client PUTs the file directly to S3 → client stores the resulting S3 URL in the part listing.

- [ ] **Step 1: Install AWS SDK**

```bash
cd apps/web && npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

- [ ] **Step 2: Write failing test**

Create `apps/web/src/app/api/seller/upload-url/upload-url.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user-1", role: "SELLER" },
  }),
}));

// Mock S3 signer
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://s3.example.com/presigned-url"),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(),
}));

describe("POST /api/seller/upload-url", () => {
  it("returns a presigned URL and the final S3 key", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/seller/upload-url", {
      method: "POST",
      body: JSON.stringify({ filename: "engine.jpg", contentType: "image/jpeg" }),
    });

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("uploadUrl");
    expect(body).toHaveProperty("key");
    expect(body.key).toMatch(/^parts\/user-1\//);
  });

  it("returns 401 when unauthenticated", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null);

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/seller/upload-url", {
      method: "POST",
      body: JSON.stringify({ filename: "engine.jpg", contentType: "image/jpeg" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
cd apps/web && npm test -- upload-url
```

Expected: FAIL — module not found.

- [ ] **Step 4: Create the route**

Create `apps/web/src/app/api/seller/upload-url/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@/lib/auth";
import { randomBytes } from "crypto";

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
});

const BUCKET = process.env.S3_BUCKET ?? "car-parts-media";
const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SELLER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sellers only" }, { status: 403 });
  }

  const { filename, contentType } = await req.json() as { filename: string; contentType: string };

  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
  }

  const ext = filename.split(".").pop() ?? "jpg";
  const key = `parts/${session.user.id}/${randomBytes(16).toString("hex")}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const publicUrl = `https://${BUCKET}.s3.amazonaws.com/${key}`;

  return NextResponse.json({ uploadUrl, key, publicUrl });
}
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
cd apps/web && npm test -- upload-url
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/api/seller/upload-url apps/web/package.json apps/web/package-lock.json
git commit -m "feat(seller): add S3 presigned URL upload endpoint"
```

---

### Task 3: Storage location API — assign bin/shelf to a part

**Files:**
- Create: `apps/web/src/app/api/seller/parts/[id]/location/route.ts`
- Create: `apps/web/src/app/api/seller/parts/[id]/location/location.test.ts`

- [ ] **Step 1: Write failing test**

Create `apps/web/src/app/api/seller/parts/[id]/location/location.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "seller-1", role: "SELLER" } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    part: {
      findFirst: vi.fn().mockResolvedValue({ id: "part-1", sellerId: "seller-1" }),
      update: vi.fn().mockResolvedValue({
        id: "part-1",
        storageRow: "A",
        storageBin: "12",
        storageShelf: "3",
      }),
    },
  },
}));

describe("PATCH /api/seller/parts/[id]/location", () => {
  it("updates storage location for a seller's own part", async () => {
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/seller/parts/part-1/location", {
      method: "PATCH",
      body: JSON.stringify({ row: "A", bin: "12", shelf: "3" }),
    });

    const res = await PATCH(req as never, { params: Promise.resolve({ id: "part-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.storageRow).toBe("A");
    expect(body.storageBin).toBe("12");
  });

  it("returns 404 when part does not belong to seller", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.part.findFirst).mockResolvedValueOnce(null);

    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/seller/parts/part-2/location", {
      method: "PATCH",
      body: JSON.stringify({ row: "B" }),
    });

    const res = await PATCH(req as never, { params: Promise.resolve({ id: "part-2" }) });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/web && npm test -- location.test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the route**

Create `apps/web/src/app/api/seller/parts/[id]/location/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { row, bin, shelf } = await req.json() as { row?: string; bin?: string; shelf?: string };

  const part = await prisma.part.findFirst({
    where: { id, sellerId: session.user.id },
  });
  if (!part) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.part.update({
    where: { id },
    data: {
      storageRow: row ?? part.storageRow,
      storageBin: bin ?? part.storageBin,
      storageShelf: shelf ?? part.storageShelf,
    },
  });

  return NextResponse.json(updated);
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd apps/web && npm test -- location.test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/seller/parts
git commit -m "feat(seller): add storage location assignment endpoint"
```

---

### Task 4: Offer negotiation API

**Files:**
- Create: `apps/web/src/app/api/buyer/offers/route.ts` — POST to make offer
- Create: `apps/web/src/app/api/seller/offers/route.ts` — GET seller's offers
- Create: `apps/web/src/app/api/seller/offers/[id]/route.ts` — PATCH to accept/counter/decline
- Create: `apps/web/src/app/api/seller/offers/[id]/offer.test.ts`

- [ ] **Step 1: Write failing test for seller offer response**

Create `apps/web/src/app/api/seller/offers/[id]/offer.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "seller-1", role: "SELLER" } }),
}));

const mockOffer = {
  id: "offer-1",
  partId: "part-1",
  buyerId: "buyer-1",
  sellerId: "seller-1",
  amount: "80.00",
  status: "PENDING",
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    offer: {
      findFirst: vi.fn().mockResolvedValue(mockOffer),
      update: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ ...mockOffer, ...data })
      ),
    },
  },
}));

describe("PATCH /api/seller/offers/[id]", () => {
  it("accepts an offer", async () => {
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/seller/offers/offer-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "accept" }),
    });

    const res = await PATCH(req as never, { params: Promise.resolve({ id: "offer-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ACCEPTED");
  });

  it("counters an offer with a new amount", async () => {
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/seller/offers/offer-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "counter", counterAmount: 95 }),
    });

    const res = await PATCH(req as never, { params: Promise.resolve({ id: "offer-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("COUNTERED");
    expect(body.counterAmount).toBe(95);
  });

  it("declines an offer", async () => {
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/seller/offers/offer-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "decline" }),
    });

    const res = await PATCH(req as never, { params: Promise.resolve({ id: "offer-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("DECLINED");
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/web && npm test -- offer.test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create seller offer response route**

Create `apps/web/src/app/api/seller/offers/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { action, counterAmount } = await req.json() as {
    action: "accept" | "decline" | "counter";
    counterAmount?: number;
  };

  const offer = await prisma.offer.findFirst({
    where: { id, sellerId: session.user.id, status: "PENDING" },
  });
  if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });

  const statusMap = { accept: "ACCEPTED", decline: "DECLINED", counter: "COUNTERED" } as const;

  const updated = await prisma.offer.update({
    where: { id },
    data: {
      status: statusMap[action],
      ...(action === "counter" && counterAmount ? { counterAmount } : {}),
    },
  });

  return NextResponse.json(updated);
}
```

- [ ] **Step 4: Create buyer offer creation route**

Create `apps/web/src/app/api/buyer/offers/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { partId, amount } = await req.json() as { partId: string; amount: number };

  if (!partId || !amount || amount <= 0) {
    return NextResponse.json({ error: "partId and positive amount required" }, { status: 400 });
  }

  const part = await prisma.part.findUnique({
    where: { id: partId, status: "ACTIVE" },
    select: { sellerId: true, price: true },
  });
  if (!part) return NextResponse.json({ error: "Part not found" }, { status: 404 });

  if (part.sellerId === session.user.id) {
    return NextResponse.json({ error: "Cannot offer on your own listing" }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  const offer = await prisma.offer.create({
    data: {
      partId,
      buyerId: session.user.id,
      sellerId: part.sellerId,
      amount,
      expiresAt,
    },
  });

  return NextResponse.json(offer, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const offers = await prisma.offer.findMany({
    where: { buyerId: session.user.id },
    include: { part: { select: { id: true, title: true, price: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(offers);
}
```

- [ ] **Step 5: Create seller offers list route**

Create `apps/web/src/app/api/seller/offers/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const offers = await prisma.offer.findMany({
    where: { sellerId: session.user.id },
    include: {
      part: { select: { id: true, title: true, price: true } },
      buyer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(offers);
}
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
cd apps/web && npm test -- offer.test
```

Expected: PASS — all 3 tests green.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/api/seller/offers apps/web/src/app/api/buyer/offers
git commit -m "feat(seller,buyer): add offer negotiation API endpoints"
```

---

### Task 5: Seller onboarding checklist API

**Files:**
- Create: `apps/web/src/app/api/seller/onboarding/route.ts`
- Create: `apps/web/src/app/api/seller/onboarding/onboarding.test.ts`

The onboarding checklist returns which setup steps the seller has completed so the UI can show progress and prompt the next action.

- [ ] **Step 1: Write failing test**

Create `apps/web/src/app/api/seller/onboarding/onboarding.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "seller-1", role: "SELLER" },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: "seller-1",
        name: "Joe",
        image: "https://example.com/photo.jpg",
        phone: null,
        location: null,
        businessName: null,
      }),
    },
    part: {
      count: vi.fn().mockResolvedValue(0),
    },
    order: {
      count: vi.fn().mockResolvedValue(0),
    },
  },
}));

describe("GET /api/seller/onboarding", () => {
  it("returns checklist with completed steps", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/seller/onboarding");

    const res = await GET(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("steps");
    expect(body.steps).toBeInstanceOf(Array);
    expect(body.percentComplete).toBeGreaterThanOrEqual(0);

    const profileStep = body.steps.find((s: { id: string }) => s.id === "profile");
    expect(profileStep).toBeDefined();
    expect(profileStep.completed).toBe(true); // has name and image
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/web && npm test -- onboarding.test
```

Expected: FAIL.

- [ ] **Step 3: Create the route**

Create `apps/web/src/app/api/seller/onboarding/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  href: string;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user, partCount, orderCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, image: true, phone: true, location: true, businessName: true },
    }),
    prisma.part.count({ where: { sellerId: session.user.id } }),
    prisma.order.count({ where: { sellerId: session.user.id } }),
  ]);

  const steps: OnboardingStep[] = [
    {
      id: "profile",
      title: "Complete your profile",
      description: "Add your name and profile photo so buyers trust you",
      completed: !!(user?.name && user?.image),
      href: "/dashboard/settings",
    },
    {
      id: "location",
      title: "Add your location",
      description: "Buyers filter by distance — your location improves visibility",
      completed: !!(user?.location),
      href: "/dashboard/settings",
    },
    {
      id: "phone",
      title: "Add a phone number",
      description: "Required for Stripe payouts and order notifications",
      completed: !!(user?.phone),
      href: "/dashboard/settings",
    },
    {
      id: "first_listing",
      title: "Create your first listing",
      description: "List a part to start selling",
      completed: partCount > 0,
      href: "/parts/new",
    },
    {
      id: "first_sale",
      title: "Make your first sale",
      description: "Your first order is on its way",
      completed: orderCount > 0,
      href: "/dashboard/orders",
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;

  return NextResponse.json({
    steps,
    percentComplete: Math.round((completedCount / steps.length) * 100),
  });
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd apps/web && npm test -- onboarding.test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/seller/onboarding
git commit -m "feat(seller): add onboarding checklist API endpoint"
```

---

### Task 6: Holiday mode API

**Files:**
- Create: `apps/web/src/app/api/seller/holiday-mode/route.ts`
- Create: `apps/web/src/app/api/seller/holiday-mode/holiday.test.ts`

When holiday mode is on, the seller's listings are hidden from search and buyers see an away message.

- [ ] **Step 1: Write failing test**

Create `apps/web/src/app/api/seller/holiday-mode/holiday.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "seller-1", role: "SELLER" } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: "seller-1", ...data })
      ),
    },
  },
}));

describe("PATCH /api/seller/holiday-mode", () => {
  it("enables holiday mode with message", async () => {
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/seller/holiday-mode", {
      method: "PATCH",
      body: JSON.stringify({ enabled: true, message: "Back in 2 weeks!" }),
    });

    const res = await PATCH(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.holidayMode).toBe(true);
    expect(body.holidayMessage).toBe("Back in 2 weeks!");
  });

  it("disables holiday mode", async () => {
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/seller/holiday-mode", {
      method: "PATCH",
      body: JSON.stringify({ enabled: false }),
    });

    const res = await PATCH(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.holidayMode).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/web && npm test -- holiday.test
```

Expected: FAIL.

- [ ] **Step 3: Create the route**

Create `apps/web/src/app/api/seller/holiday-mode/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SELLER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sellers only" }, { status: 403 });
  }

  const { enabled, message } = await req.json() as { enabled: boolean; message?: string };

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      holidayMode: enabled,
      holidayMessage: enabled ? (message ?? null) : null,
    },
    select: { holidayMode: true, holidayMessage: true },
  });

  return NextResponse.json(user);
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { holidayMode: true, holidayMessage: true },
  });

  return NextResponse.json(user);
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd apps/web && npm test -- holiday.test
```

Expected: PASS.

- [ ] **Step 5: Update the parts search endpoint to filter out holiday-mode sellers**

In `apps/web/src/app/api/parts/route.ts`, add to the `where` object in the `GET` handler:

```typescript
// After: const where: Record<string, unknown> = { status: "ACTIVE" };
// Add:
where.seller = { holidayMode: false };
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/api/seller/holiday-mode apps/web/src/app/api/parts/route.ts
git commit -m "feat(seller): add holiday mode — pauses store visibility"
```

---

### Task 7: Run full test suite and verify

- [ ] **Step 1: Run all tests**

```bash
cd apps/web && npm test
```

Expected: All tests pass.

- [ ] **Step 2: Type-check everything**

```bash
cd apps/web && npx tsc --noEmit
cd ../../packages/types && npx tsc --noEmit
cd ../api-client && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "chore: seller system plan 2 complete — all tests passing"
```

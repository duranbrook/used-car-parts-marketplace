import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searches = await prisma.savedSearch.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ searches });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, query, notify } = await req.json();
  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

  const search = await prisma.savedSearch.create({
    data: {
      userId: session.user.id,
      name: name || null,
      query: typeof query === "string" ? query : JSON.stringify(query),
      notify: notify ?? true,
    },
  });

  return NextResponse.json(search, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await prisma.savedSearch.deleteMany({ where: { id, userId: session.user.id } });

  return NextResponse.json({ ok: true });
}

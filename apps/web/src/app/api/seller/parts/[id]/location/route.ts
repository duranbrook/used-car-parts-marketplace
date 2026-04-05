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
  const { row, bin, shelf } = (await req.json()) as {
    row?: string;
    bin?: string;
    shelf?: string;
  };

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

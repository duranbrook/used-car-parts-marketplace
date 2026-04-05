import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: session.user.id, receiverId: userId },
        { senderId: userId, receiverId: session.user.id },
      ],
    },
    include: {
      sender: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Mark messages as read
  await prisma.message.updateMany({
    where: {
      senderId: userId,
      receiverId: session.user.id,
      read: false,
    },
    data: { read: true },
  });

  const otherUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, image: true },
  });

  return NextResponse.json({ messages, otherUser });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get conversations (grouped by the other user)
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: session.user.id }, { receiverId: session.user.id }],
    },
    include: {
      sender: { select: { id: true, name: true, image: true } },
      receiver: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group into conversations
  const convos = new Map<string, { user: { id: string; name: string | null }; lastMessage: typeof messages[0]; unread: number }>();
  for (const msg of messages) {
    const otherId = msg.senderId === session.user.id ? msg.receiverId : msg.senderId;
    const otherUser = msg.senderId === session.user.id ? msg.receiver : msg.sender;
    if (!convos.has(otherId)) {
      convos.set(otherId, {
        user: otherUser,
        lastMessage: msg,
        unread: 0,
      });
    }
    if (!msg.read && msg.receiverId === session.user.id) {
      convos.get(otherId)!.unread++;
    }
  }

  return NextResponse.json({
    conversations: Array.from(convos.values()),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { receiverId, content, partId } = await req.json();
  if (!receiverId || !content) {
    return NextResponse.json({ error: "receiverId and content are required" }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      senderId: session.user.id,
      receiverId,
      content,
      partId: partId || null,
    },
    include: {
      sender: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(message, { status: 201 });
}

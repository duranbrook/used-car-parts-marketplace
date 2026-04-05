"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Conversation {
  user: { id: string; name: string | null };
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
  };
  unread: number;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/messages")
      .then((r) => r.json())
      .then((data) => {
        setConversations(data.conversations || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">PartFinder</Link>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Messages</h1>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No messages yet</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {conversations.map((convo) => (
              <Link
                key={convo.user.id}
                href={`/messages/${convo.user.id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-blue-600 font-semibold text-lg">
                    {(convo.user.name || "?")[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">{convo.user.name || "Unknown"}</p>
                    <span className="text-xs text-gray-400">
                      {new Date(convo.lastMessage.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-1">{convo.lastMessage.content}</p>
                </div>
                {convo.unread > 0 && (
                  <span className="bg-blue-600 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                    {convo.unread}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

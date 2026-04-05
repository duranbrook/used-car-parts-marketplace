"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface WatchlistItem {
  id: string;
  part: {
    id: string;
    title: string;
    partType: string;
    conditionGrade: string;
    price: string;
    status: string;
    images: { url: string }[];
    seller: { name: string | null };
  };
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((data) => { setItems(data.items || []); setLoading(false); });
  }, []);

  async function remove(partId: string) {
    await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partId }),
    });
    setItems(items.filter((i) => i.part.id !== partId));
  }

  const gradeColors: Record<string, string> = {
    A: "bg-green-100 text-green-800",
    B: "bg-yellow-100 text-yellow-800",
    C: "bg-orange-100 text-orange-800",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">PartFinder</Link>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Watchlist</h1>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No saved parts yet</p>
            <Link href="/search" className="text-blue-600 mt-2 inline-block">Browse parts</Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <Link href={`/parts/${item.part.id}`}>
                  <div className="aspect-[4/3] bg-gray-100">
                    {item.part.images[0]?.url ? (
                      <img src={item.part.images[0].url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">No photo</div>
                    )}
                  </div>
                </Link>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/parts/${item.part.id}`} className="font-semibold text-sm text-gray-900 hover:text-blue-600 line-clamp-2">
                      {item.part.title}
                    </Link>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${gradeColors[item.part.conditionGrade]}`}>
                      {item.part.conditionGrade}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 mt-2">${parseFloat(item.part.price).toFixed(2)}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-500">{item.part.seller.name}</span>
                    <button onClick={() => remove(item.part.id)} className="text-xs text-red-600 hover:text-red-700">
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

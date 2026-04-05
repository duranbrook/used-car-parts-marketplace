"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Part {
  id: string;
  title: string;
  partType: string;
  conditionGrade: string;
  price: string;
  quantity: number;
  status: string;
  views: number;
  createdAt: string;
  images: { url: string }[];
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  DRAFT: "bg-gray-100 text-gray-800",
  SOLD: "bg-blue-100 text-blue-800",
  RESERVED: "bg-yellow-100 text-yellow-800",
  INACTIVE: "bg-red-100 text-red-800",
};

export default function InventoryPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/parts/my")
      .then((r) => r.json())
      .then((data) => {
        setParts(data.parts || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">PartFinder</Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
            <Link href="/parts/new" className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg">
              + List a Part
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Inventory</h1>
          <p className="text-sm text-gray-500">{parts.length} parts listed</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading inventory...</div>
        ) : parts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No parts listed yet</p>
            <Link href="/parts/new" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
              Create your first listing
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Part</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Grade</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Price</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Views</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Listed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parts.map((part) => (
                  <tr key={part.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg shrink-0 overflow-hidden">
                          {part.images[0]?.url ? (
                            <img src={part.images[0].url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              —
                            </div>
                          )}
                        </div>
                        <Link href={`/parts/${part.id}`} className="font-medium text-gray-900 hover:text-blue-600 line-clamp-1">
                          {part.title}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{part.partType}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium">{part.conditionGrade}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      ${parseFloat(part.price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[part.status]}`}>
                        {part.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{part.views}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(part.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

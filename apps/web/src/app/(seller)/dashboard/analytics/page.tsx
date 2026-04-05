"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Analytics {
  summary: {
    totalParts: number;
    activeParts: number;
    soldParts: number;
    totalOrders: number;
    totalViews: number;
    totalRevenue: number;
    avgRating: number;
    reviewCount: number;
    agingParts: number;
    conversionRate: number;
  };
  topParts: {
    id: string;
    title: string;
    price: string;
    views: number;
    status: string;
    conditionGrade: string;
  }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/seller/analytics")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">PartFinder</Link>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Seller Analytics</h1>

        {loading || !data ? (
          <div className="text-center py-12 text-gray-500">Loading analytics...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {[
                { label: "Total Revenue", value: `$${data.summary.totalRevenue.toLocaleString()}`, color: "text-green-600" },
                { label: "Active Listings", value: data.summary.activeParts, color: "text-blue-600" },
                { label: "Parts Sold", value: data.summary.soldParts, color: "text-purple-600" },
                { label: "Total Views", value: data.summary.totalViews.toLocaleString(), color: "text-orange-600" },
                { label: "Avg Rating", value: data.summary.avgRating ? `${data.summary.avgRating}/5` : "N/A", color: "text-yellow-600" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Conversion Rate</p>
                <p className="text-xl font-bold text-gray-900">{data.summary.conversionRate}%</p>
                <p className="text-xs text-gray-400">views to sales</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-xl font-bold text-gray-900">{data.summary.totalOrders}</p>
              </div>
              <div className={`bg-white rounded-xl border p-4 ${data.summary.agingParts > 0 ? "border-orange-200 bg-orange-50" : "border-gray-200"}`}>
                <p className="text-sm text-gray-500">Aging Inventory (30+ days)</p>
                <p className={`text-xl font-bold ${data.summary.agingParts > 0 ? "text-orange-600" : "text-gray-900"}`}>
                  {data.summary.agingParts} parts
                </p>
                {data.summary.agingParts > 0 && (
                  <p className="text-xs text-orange-500">Consider reducing prices</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Top Parts by Views</h2>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                    <th className="pb-3">Part</th>
                    <th className="pb-3">Grade</th>
                    <th className="pb-3">Price</th>
                    <th className="pb-3">Views</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.topParts.map((part) => (
                    <tr key={part.id}>
                      <td className="py-2">
                        <Link href={`/parts/${part.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                          {part.title}
                        </Link>
                      </td>
                      <td className="py-2 text-sm">{part.conditionGrade}</td>
                      <td className="py-2 text-sm font-medium">${parseFloat(part.price).toFixed(2)}</td>
                      <td className="py-2 text-sm text-gray-600">{part.views}</td>
                      <td className="py-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{part.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

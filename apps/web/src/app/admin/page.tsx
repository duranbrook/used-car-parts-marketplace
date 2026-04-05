"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Stats {
  totalUsers: number;
  totalSellers: number;
  totalBuyers: number;
  totalParts: number;
  activeParts: number;
  totalOrders: number;
  pendingOrders: number;
  totalReviews: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Array<Record<string, unknown>>>([]);
  const [recentUsers, setRecentUsers] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => {
        if (r.status === 403) { setError("Access denied. Admin role required."); setLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setStats(data.stats);
          setRecentOrders(data.recentOrders || []);
          setRecentUsers(data.recentUsers || []);
          setLoading(false);
        }
      });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error}</p>
          <Link href="/dashboard" className="text-blue-600 mt-4 inline-block">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const statCards = stats ? [
    { label: "Total Users", value: stats.totalUsers, color: "blue" },
    { label: "Sellers", value: stats.totalSellers, color: "green" },
    { label: "Buyers", value: stats.totalBuyers, color: "purple" },
    { label: "Total Parts", value: stats.totalParts, color: "orange" },
    { label: "Active Listings", value: stats.activeParts, color: "cyan" },
    { label: "Total Orders", value: stats.totalOrders, color: "indigo" },
    { label: "Pending Orders", value: stats.pendingOrders, color: "yellow" },
    { label: "Reviews", value: stats.totalReviews, color: "pink" },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">PartFinder</Link>
          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">ADMIN</span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {statCards.map((card) => (
                <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Recent Users */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Recent Users</h2>
                <div className="space-y-3">
                  {recentUsers.map((user: Record<string, unknown>) => (
                    <div key={user.id as string} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{(user.name as string) || "No name"}</p>
                        <p className="text-xs text-gray-500">{user.email as string}</p>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                        {user.role as string}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Orders */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Recent Orders</h2>
                <div className="space-y-3">
                  {recentOrders.map((order: Record<string, unknown>) => (
                    <div key={order.id as string} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          #{(order.id as string).slice(-8)} &middot; ${parseFloat(order.total as string).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {((order.buyer as Record<string, unknown>)?.name as string) || ((order.buyer as Record<string, unknown>)?.email as string)}
                        </p>
                      </div>
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                        {order.status as string}
                      </span>
                    </div>
                  ))}
                  {recentOrders.length === 0 && (
                    <p className="text-sm text-gray-500">No orders yet</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

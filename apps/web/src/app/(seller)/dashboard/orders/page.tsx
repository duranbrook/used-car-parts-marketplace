"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Order {
  id: string;
  status: string;
  subtotal: string;
  shippingCost: string;
  platformFee: string;
  total: string;
  trackingNumber: string | null;
  createdAt: string;
  buyer: { id: string; name: string | null; email: string };
  seller: { id: string; name: string | null; email: string };
  items: {
    id: string;
    quantity: number;
    price: string;
    part: {
      id: string;
      title: string;
      images: { url: string }[];
    };
  }[];
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  REFUNDED: "bg-gray-100 text-gray-800",
};

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
      <OrdersContent />
    </Suspense>
  );
}

function OrdersContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data) => {
        setOrders(data.orders || []);
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

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Orders</h1>

        {success && (
          <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6">
            Order placed successfully! The seller will be notified.
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No orders yet</p>
            <Link href="/search" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
              Browse parts
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[order.status]}`}>
                      {order.status}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">#{order.id.slice(-8)}</span>
                  </div>
                  <p className="font-semibold text-gray-900">${parseFloat(order.total).toFixed(2)}</p>
                </div>
                <div className="p-4 space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg shrink-0 overflow-hidden">
                        {item.part.images[0]?.url ? (
                          <img src={item.part.images[0].url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            No photo
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <Link href={`/parts/${item.part.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                          {item.part.title}
                        </Link>
                        <p className="text-sm text-gray-500">
                          Qty: {item.quantity} &middot; ${parseFloat(item.price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-gray-100 flex justify-between text-sm text-gray-500">
                    <span>Seller: {order.seller.name || order.seller.email}</span>
                    {order.trackingNumber && <span>Tracking: {order.trackingNumber}</span>}
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

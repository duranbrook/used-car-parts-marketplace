"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CartItem {
  id: string;
  quantity: number;
  part: {
    id: string;
    title: string;
    partType: string;
    conditionGrade: string;
    price: string;
    images: { url: string }[];
    seller: { id: string; name: string | null };
  };
}

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    fetch("/api/cart")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items || []);
        setSubtotal(data.subtotal || 0);
        setLoading(false);
      });
  }, []);

  async function removeItem(partId: string) {
    await fetch("/api/cart", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partId }),
    });
    setItems(items.filter((i) => i.part.id !== partId));
    setSubtotal(
      items
        .filter((i) => i.part.id !== partId)
        .reduce((sum, i) => sum + parseFloat(i.part.price) * i.quantity, 0)
    );
  }

  async function handleCheckout() {
    setCheckingOut(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      router.push("/dashboard/orders?success=true");
    } else {
      setCheckingOut(false);
    }
  }

  const platformFee = Math.round(subtotal * 0.05 * 100) / 100;
  const total = subtotal + platformFee;

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
          <Link href="/search" className="text-sm text-gray-600 hover:text-gray-900">Continue Shopping</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading cart...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Your cart is empty</p>
            <Link href="/search" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
              Browse parts
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4">
                  <div className="w-24 h-24 bg-gray-100 rounded-lg shrink-0 overflow-hidden">
                    {item.part.images[0]?.url ? (
                      <img src={item.part.images[0].url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/parts/${item.part.id}`} className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-1">
                      {item.part.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${gradeColors[item.part.conditionGrade]}`}>
                        {item.part.conditionGrade}
                      </span>
                      <span className="text-xs text-gray-500">{item.part.seller.name || "Unknown"}</span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-lg font-bold text-gray-900">
                        ${parseFloat(item.part.price).toFixed(2)}
                      </p>
                      <button
                        onClick={() => removeItem(item.part.id)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 h-fit sticky top-8">
              <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal ({items.length} items)</span>
                  <span className="text-gray-900">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform fee (5%)</span>
                  <span className="text-gray-900">${platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-gray-500">Calculated at checkout</span>
                </div>
                <hr className="my-3" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                disabled={checkingOut}
                className="w-full mt-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {checkingOut ? "Processing..." : "Place Order"}
              </button>
              <p className="text-xs text-gray-400 mt-3 text-center">
                Payment integration coming soon. Orders are placed directly with sellers.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

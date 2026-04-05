import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const isSeller = session.user.role === "SELLER" || session.user.role === "ADMIN";

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">PartFinder</Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session.user.email}</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
              {session.user.role}
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isSeller && (
            <>
              <Link
                href="/parts/new"
                className="block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">List a Part</h3>
                <p className="text-sm text-gray-600">Create a new part listing with photos and AI identification</p>
              </Link>

              <Link
                href="/dashboard/inventory"
                className="block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition"
              >
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">My Inventory</h3>
                <p className="text-sm text-gray-600">Manage your listed parts and view sales</p>
              </Link>
            </>
          )}

          <Link
            href="/search"
            className="block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Find Parts</h3>
            <p className="text-sm text-gray-600">Search for used car parts by vehicle or part type</p>
          </Link>

          <Link
            href="/dashboard/orders"
            className="block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition"
          >
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Orders</h3>
            <p className="text-sm text-gray-600">View your order history and tracking</p>
          </Link>
        </div>
      </main>
    </div>
  );
}

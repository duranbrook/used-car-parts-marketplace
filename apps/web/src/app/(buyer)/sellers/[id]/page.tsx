import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

const gradeColors: Record<string, string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-yellow-100 text-yellow-800",
  C: "bg-orange-100 text-orange-800",
};

export default async function SellerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const seller = await prisma.user.findUnique({
    where: { id, role: "SELLER" },
    select: { id: true, name: true, location: true, createdAt: true },
  });

  if (!seller) notFound();

  const [reviews, parts] = await Promise.all([
    prisma.review.findMany({ where: { sellerId: id }, select: { rating: true } }),
    prisma.part.findMany({
      where: { sellerId: id, status: "ACTIVE" },
      include: { images: { where: { isPrimary: true }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const avgRating = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">PartFinder</Link>
          <Link href="/search" className="text-sm text-gray-600 hover:text-gray-900">Search</Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
              <span className="text-3xl font-bold text-blue-600">
                {(seller.name || "?")[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{seller.name || "Unknown Seller"}</h1>
              {seller.location && <p className="text-gray-600 mt-1">{seller.location}</p>}
              <div className="flex items-center gap-6 mt-3">
                <div>
                  <span className="text-lg font-bold text-gray-900">{parts.length}</span>
                  <span className="text-sm text-gray-500 ml-1">active listings</span>
                </div>
                {avgRating > 0 && (
                  <div>
                    <span className="text-lg font-bold text-gray-900">{avgRating}</span>
                    <span className="text-sm text-gray-500 ml-1">rating ({reviews.length} reviews)</span>
                  </div>
                )}
                <div>
                  <span className="text-sm text-gray-500">
                    Member since {new Date(seller.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-4">Inventory</h2>
        {parts.length === 0 ? (
          <p className="text-gray-500">No active listings</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {parts.map((part) => (
              <Link key={part.id} href={`/parts/${part.id}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition">
                <div className="aspect-[4/3] bg-gray-100">
                  {part.images[0]?.url ? (
                    <img src={part.images[0].url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">No photo</div>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{part.title}</h3>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${gradeColors[part.conditionGrade]}`}>
                      {part.conditionGrade}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 mt-1">${parseFloat(part.price.toString()).toFixed(2)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

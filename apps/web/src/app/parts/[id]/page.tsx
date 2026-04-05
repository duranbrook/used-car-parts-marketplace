import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

const gradeLabels: Record<string, { label: string; desc: string; color: string }> = {
  A: { label: "Grade A — Excellent", desc: "Minimal wear, less than 60K miles", color: "bg-green-100 text-green-800" },
  B: { label: "Grade B — Good", desc: "Moderate wear, 60K-200K miles", color: "bg-yellow-100 text-yellow-800" },
  C: { label: "Grade C — Fair", desc: "Significant wear, 200K+ miles", color: "bg-orange-100 text-orange-800" },
};

export default async function PartDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const part = await prisma.part.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: "asc" } },
      seller: { select: { id: true, name: true, email: true, createdAt: true } },
      donorVehicle: true,
      compatibility: { include: { vehicle: true } },
    },
  });

  if (!part) notFound();

  // Increment views
  await prisma.part.update({ where: { id }, data: { views: { increment: 1 } } });

  const grade = gradeLabels[part.conditionGrade] || gradeLabels.B;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">PartFinder</Link>
          <div className="flex items-center gap-4">
            <Link href="/search" className="text-sm text-gray-600 hover:text-gray-900">Search</Link>
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4">
          <Link href="/search" className="text-sm text-blue-600 hover:text-blue-700">
            &larr; Back to search
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Photos */}
          <div>
            <div className="aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden mb-4">
              {part.images[0]?.url ? (
                <img
                  src={part.images[0].url}
                  alt={part.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No photos available
                </div>
              )}
            </div>
            {part.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {part.images.slice(1).map((img) => (
                  <div key={img.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wide">{part.partType}</p>
              <h1 className="text-2xl font-bold text-gray-900 mt-1">{part.title}</h1>
            </div>

            <div className="flex items-baseline gap-4">
              <p className="text-3xl font-bold text-gray-900">
                ${parseFloat(part.price.toString()).toFixed(2)}
              </p>
              {part.suggestedPrice && (
                <p className="text-sm text-gray-500">
                  Suggested: ${parseFloat(part.suggestedPrice.toString()).toFixed(2)}
                </p>
              )}
            </div>

            {/* Condition */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Condition</h3>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${grade.color}`}>
                {grade.label}
              </span>
              <p className="text-sm text-gray-500 mt-2">{grade.desc}</p>
              {part.conditionNotes && (
                <p className="text-sm text-gray-600 mt-2 border-t border-gray-100 pt-2">
                  {part.conditionNotes}
                </p>
              )}
            </div>

            {/* Donor Vehicle */}
            {part.donorVehicle && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Donor Vehicle</h3>
                <p className="text-gray-900">
                  {part.donorVehicle.year} {part.donorVehicle.make} {part.donorVehicle.model}
                  {part.donorVehicle.trim && ` ${part.donorVehicle.trim}`}
                </p>
                {part.donorVehicle.engineType && (
                  <p className="text-sm text-gray-500">{part.donorVehicle.engineType}</p>
                )}
                {part.donorVehicle.vin && (
                  <p className="text-xs text-gray-400 font-mono mt-1">VIN: {part.donorVehicle.vin}</p>
                )}
              </div>
            )}

            {/* Compatibility */}
            {part.compatibility.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Compatible Vehicles</h3>
                <ul className="space-y-1">
                  {part.compatibility.map((c) => (
                    <li key={c.id} className="text-sm text-gray-600">
                      {c.yearStart && c.yearEnd
                        ? `${c.yearStart}-${c.yearEnd}`
                        : c.vehicle.year}{" "}
                      {c.vehicle.make} {c.vehicle.model}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Part numbers */}
            {(part.partNumber || part.hollanderNumber) && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Part Numbers</h3>
                {part.partNumber && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">OEM:</span> {part.partNumber}
                  </p>
                )}
                {part.hollanderNumber && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Hollander:</span> {part.hollanderNumber}
                  </p>
                )}
              </div>
            )}

            {/* Description */}
            {part.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{part.description}</p>
              </div>
            )}

            {/* Seller Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Seller</h3>
              <p className="font-semibold text-gray-900">{part.seller.name || "Unknown"}</p>
              <p className="text-sm text-gray-500">
                Member since {new Date(part.seller.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button className="flex-1 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition">
                Add to Cart
              </button>
              <button className="px-4 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition">
                Message Seller
              </button>
              <button className="px-4 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition">
                Save
              </button>
            </div>

            <p className="text-xs text-gray-400">
              {part.views + 1} views &middot; Listed {new Date(part.createdAt).toLocaleDateString()}
              {part.quantity > 1 && ` · ${part.quantity} available`}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

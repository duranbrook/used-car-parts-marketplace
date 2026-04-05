"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Part {
  id: string;
  title: string;
  partType: string;
  conditionGrade: string;
  price: string;
  views: number;
  createdAt: string;
  images: { url: string }[];
  seller: { id: string; name: string | null };
  donorVehicle: { year: number; make: string; model: string } | null;
}

interface SearchResults {
  parts: Part[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export default function SearchPage() {
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [partType, setPartType] = useState("");
  const [conditionGrade, setConditionGrade] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (year) params.set("year", year);
    if (make) params.set("make", make);
    if (model) params.set("model", model);
    if (partType) params.set("partType", partType);
    if (conditionGrade) params.set("conditionGrade", conditionGrade);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    params.set("page", page.toString());

    const res = await fetch(`/api/parts?${params}`);
    if (res.ok) {
      setResults(await res.json());
    }
    setLoading(false);
  }, [q, year, make, model, partType, conditionGrade, minPrice, maxPrice, page]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);

    // If query looks like natural language (more than 3 words), use AI parsing
    if (q.trim().split(/\s+/).length >= 3) {
      try {
        const aiRes = await fetch("/api/ai/smart-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
        });
        if (aiRes.ok) {
          const parsed = await aiRes.json();
          if (parsed.year) setYear(parsed.year);
          if (parsed.make) setMake(parsed.make);
          if (parsed.model) setModel(parsed.model);
          if (parsed.partType) setPartType(parsed.partType);
          if (parsed.conditionGrade) setConditionGrade(parsed.conditionGrade);
          if (parsed.minPrice) setMinPrice(parsed.minPrice);
          if (parsed.maxPrice) setMaxPrice(parsed.maxPrice);
          if (parsed.q) setQ(parsed.q);
        }
      } catch {
        // Fall through to regular search
      }
    }

    fetchResults();
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
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
            <Link href="/auth/signin" className="text-sm text-gray-600 hover:text-gray-900">Sign In</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search for parts (e.g., headlight, engine, bumper)..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-lg"
            />
            <button
              type="submit"
              className="px-8 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
            >
              Search
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="Year"
              min={1980}
              max={2027}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              placeholder="Make"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Model"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={partType}
              onChange={(e) => setPartType(e.target.value)}
              placeholder="Part Type"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={conditionGrade}
              onChange={(e) => setConditionGrade(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Any Condition</option>
              <option value="A">Grade A</option>
              <option value="B">Grade B</option>
              <option value="C">Grade C</option>
            </select>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Min $"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max $"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </form>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Searching...</div>
        ) : results?.parts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No parts found</p>
            <p className="text-gray-400 mt-2">Try adjusting your search filters</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                {results?.pagination.total || 0} parts found
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {results?.parts.map((part) => (
                <Link
                  key={part.id}
                  href={`/parts/${part.id}`}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition"
                >
                  <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center">
                    {part.images[0]?.url ? (
                      <img
                        src={part.images[0].url}
                        alt={part.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-400">No photo</span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{part.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${gradeColors[part.conditionGrade]}`}>
                        {part.conditionGrade}
                      </span>
                    </div>
                    {part.donorVehicle && (
                      <p className="text-xs text-gray-500 mt-1">
                        From: {part.donorVehicle.year} {part.donorVehicle.make} {part.donorVehicle.model}
                      </p>
                    )}
                    <p className="text-lg font-bold text-gray-900 mt-2">
                      ${parseFloat(part.price).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {part.seller.name || "Unknown Seller"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {results && results.pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  Page {page} of {results.pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(results.pagination.totalPages, page + 1))}
                  disabled={page === results.pagination.totalPages}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

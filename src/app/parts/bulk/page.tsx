"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface BulkPart {
  partType: string;
  suggestedTitle: string;
  category: string;
  estimatedWeight: number | null;
  avgPriceGradeA: number;
  avgPriceGradeB: number;
  avgPriceGradeC: number;
  demandLevel: string;
  notes: string;
  selected: boolean;
  conditionGrade: "A" | "B" | "C";
}

const categoryColors: Record<string, string> = {
  powertrain: "bg-red-100 text-red-800",
  body: "bg-blue-100 text-blue-800",
  electrical: "bg-yellow-100 text-yellow-800",
  interior: "bg-purple-100 text-purple-800",
  suspension: "bg-green-100 text-green-800",
  brakes: "bg-orange-100 text-orange-800",
  cooling: "bg-cyan-100 text-cyan-800",
  exhaust: "bg-gray-100 text-gray-800",
  fuel: "bg-amber-100 text-amber-800",
  other: "bg-slate-100 text-slate-800",
};

export default function BulkListingPage() {
  const router = useRouter();
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [vin, setVin] = useState("");
  const [parts, setParts] = useState<BulkPart[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [vinLoading, setVinLoading] = useState(false);

  async function decodeVin() {
    if (vin.length !== 17) return;
    setVinLoading(true);
    const res = await fetch(`/api/vin/${vin}`);
    if (res.ok) {
      const data = await res.json();
      if (data.year) setYear(data.year.toString());
      if (data.make) setMake(data.make);
      if (data.model) setModel(data.model);
    }
    setVinLoading(false);
  }

  async function generateParts() {
    setLoading(true);
    const res = await fetch("/api/ai/bulk-listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: parseInt(year), make, model }),
    });
    if (res.ok) {
      const data = await res.json();
      setParts(
        (data.parts || []).map((p: Omit<BulkPart, "selected" | "conditionGrade">) => ({
          ...p,
          selected: true,
          conditionGrade: "B" as const,
        }))
      );
    }
    setLoading(false);
  }

  function toggleAll(selected: boolean) {
    setParts(parts.map((p) => ({ ...p, selected })));
  }

  function togglePart(index: number) {
    const updated = [...parts];
    updated[index].selected = !updated[index].selected;
    setParts(updated);
  }

  function setGrade(index: number, grade: "A" | "B" | "C") {
    const updated = [...parts];
    updated[index].conditionGrade = grade;
    setParts(updated);
  }

  async function createListings() {
    setCreating(true);
    const selectedParts = parts.filter((p) => p.selected);

    for (const part of selectedParts) {
      const price =
        part.conditionGrade === "A"
          ? part.avgPriceGradeA
          : part.conditionGrade === "C"
            ? part.avgPriceGradeC
            : part.avgPriceGradeB;

      await fetch("/api/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: part.suggestedTitle,
          partType: part.partType,
          conditionGrade: part.conditionGrade,
          conditionNotes: part.notes,
          price,
          weight: part.estimatedWeight,
          donorVehicle: {
            vin: vin || undefined,
            year: parseInt(year),
            make,
            model,
          },
        }),
      });
    }

    setCreating(false);
    router.push("/dashboard/inventory");
  }

  const selectedCount = parts.filter((p) => p.selected).length;
  const totalValue = parts
    .filter((p) => p.selected)
    .reduce((sum, p) => {
      const price =
        p.conditionGrade === "A"
          ? p.avgPriceGradeA
          : p.conditionGrade === "C"
            ? p.avgPriceGradeC
            : p.avgPriceGradeB;
      return sum + price;
    }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">PartFinder</Link>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Bulk Listing</h1>
        <p className="text-gray-600 mb-8">Enter a vehicle and AI will generate all harvestable parts with pricing.</p>

        {/* Vehicle Input */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">VIN (auto-fills vehicle details)</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
                maxLength={17}
                placeholder="Enter 17-character VIN"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono"
              />
              <button
                onClick={decodeVin}
                disabled={vin.length !== 17 || vinLoading}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                {vinLoading ? "Decoding..." : "Decode VIN"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2018" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
              <input type="text" value={make} onChange={(e) => setMake(e.target.value)} placeholder="Honda" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Civic" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>
          </div>

          <button
            onClick={generateParts}
            disabled={!year || !make || !model || loading}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "AI is generating parts list..." : "Generate Parts List"}
          </button>
        </div>

        {/* Parts List */}
        {parts.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-600">
                  {selectedCount} of {parts.length} parts selected
                </p>
                <button onClick={() => toggleAll(true)} className="text-sm text-blue-600 hover:text-blue-700">Select All</button>
                <button onClick={() => toggleAll(false)} className="text-sm text-blue-600 hover:text-blue-700">Deselect All</button>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Estimated total value</p>
                <p className="text-2xl font-bold text-gray-900">${totalValue.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              {parts.map((part, i) => (
                <div
                  key={i}
                  className={`bg-white rounded-xl border p-4 flex items-center gap-4 transition ${
                    part.selected ? "border-blue-200 bg-blue-50/30" : "border-gray-200 opacity-60"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={part.selected}
                    onChange={() => togglePart(i)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{part.suggestedTitle}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[part.category] || categoryColors.other}`}>
                        {part.category}
                      </span>
                      {part.demandLevel === "high" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">High Demand</span>
                      )}
                    </div>
                    {part.notes && <p className="text-xs text-gray-500">{part.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {(["A", "B", "C"] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setGrade(i, g)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                          part.conditionGrade === g
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  <div className="text-right w-24">
                    <p className="font-bold text-gray-900">
                      ${(part.conditionGrade === "A" ? part.avgPriceGradeA : part.conditionGrade === "C" ? part.avgPriceGradeC : part.avgPriceGradeB).toLocaleString()}
                    </p>
                    {part.estimatedWeight && (
                      <p className="text-xs text-gray-400">{part.estimatedWeight} lbs</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-4 flex items-center justify-between">
              <p className="text-gray-600">
                <span className="font-semibold text-gray-900">{selectedCount}</span> parts &middot;{" "}
                <span className="font-semibold text-gray-900">${totalValue.toLocaleString()}</span> estimated value
              </p>
              <button
                onClick={createListings}
                disabled={selectedCount === 0 || creating}
                className="px-8 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? `Creating ${selectedCount} listings...` : `Create ${selectedCount} Listings`}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

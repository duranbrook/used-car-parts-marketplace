"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PART_TYPES = [
  "Engine", "Transmission", "Door", "Hood", "Fender", "Bumper",
  "Headlight", "Taillight", "Mirror", "Wheel/Rim", "Tire",
  "Radiator", "Alternator", "Starter", "AC Compressor",
  "Window", "Seat", "Dashboard", "Steering Column",
  "Axle", "Differential", "Transfer Case", "ECU/Computer",
  "Fuel Pump", "Intake Manifold", "Exhaust", "Catalytic Converter",
  "Brake Caliper", "Brake Rotor", "Suspension", "Strut/Shock",
  "Other",
];

const CONDITION_INFO = {
  A: { label: "Grade A — Excellent", desc: "Minimal wear. Less than 60K miles. No visible damage.", color: "green" },
  B: { label: "Grade B — Good", desc: "Moderate wear. 60K-200K miles. Minor cosmetic issues.", color: "yellow" },
  C: { label: "Grade C — Fair", desc: "Significant wear. 200K+ miles. Functional but worn.", color: "orange" },
};

export default function NewPartPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [partType, setPartType] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [conditionGrade, setConditionGrade] = useState<"A" | "B" | "C">("B");
  const [conditionNotes, setConditionNotes] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [weight, setWeight] = useState("");

  // Donor vehicle
  const [donorYear, setDonorYear] = useState("");
  const [donorMake, setDonorMake] = useState("");
  const [donorModel, setDonorModel] = useState("");
  const [donorVin, setDonorVin] = useState("");

  // Image URLs (simplified — real app would have upload)
  const [imageUrls, setImageUrls] = useState<string[]>([""]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const images = imageUrls.filter(Boolean).map((url) => ({ url }));
    const donorVehicle =
      donorYear && donorMake && donorModel
        ? {
            vin: donorVin || undefined,
            year: parseInt(donorYear),
            make: donorMake,
            model: donorModel,
          }
        : undefined;

    const res = await fetch("/api/parts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        partType: partType.toLowerCase(),
        partNumber: partNumber || undefined,
        conditionGrade,
        conditionNotes: conditionNotes || undefined,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        weight: weight ? parseFloat(weight) : undefined,
        images,
        donorVehicle,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create listing");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-gray-900">PartFinder</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">List a Part</h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
          )}

          {/* Part Details */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Part Details</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Part Type</label>
              <select
                value={partType}
                onChange={(e) => setPartType(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">Select part type...</option>
                {PART_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., 2018 Honda Civic Driver Side Headlight Assembly"
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe the part condition, any damage, included hardware..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OEM Part Number</label>
                <input
                  type="text"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight (lbs)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="For shipping estimate"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
          </section>

          {/* Condition */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Condition</h2>
            <div className="grid grid-cols-3 gap-3">
              {(["A", "B", "C"] as const).map((grade) => {
                const info = CONDITION_INFO[grade];
                return (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => setConditionGrade(grade)}
                    className={`p-4 rounded-lg border-2 text-left transition ${
                      conditionGrade === grade
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <p className="font-semibold text-gray-900">{info.label}</p>
                    <p className="text-xs text-gray-600 mt-1">{info.desc}</p>
                  </button>
                );
              })}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condition Notes</label>
              <textarea
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                rows={2}
                placeholder="Any specific damage, repairs, or notes about condition..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
          </section>

          {/* Donor Vehicle */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Donor Vehicle</h2>
            <p className="text-sm text-gray-600">What vehicle did this part come from?</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VIN (optional — auto-fills details)</label>
              <input
                type="text"
                value={donorVin}
                onChange={(e) => setDonorVin(e.target.value)}
                maxLength={17}
                placeholder="Enter 17-character VIN"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input
                  type="number"
                  value={donorYear}
                  onChange={(e) => setDonorYear(e.target.value)}
                  min={1980}
                  max={2027}
                  placeholder="2018"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                <input
                  type="text"
                  value={donorMake}
                  onChange={(e) => setDonorMake(e.target.value)}
                  placeholder="Honda"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <input
                  type="text"
                  value={donorModel}
                  onChange={(e) => setDonorModel(e.target.value)}
                  placeholder="Civic"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Pricing</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
          </section>

          {/* Photos */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Photos</h2>
            <p className="text-sm text-gray-600">Add image URLs for your part (file upload coming soon)</p>

            {imageUrls.map((url, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => {
                    const updated = [...imageUrls];
                    updated[i] = e.target.value;
                    setImageUrls(updated);
                  }}
                  placeholder="https://example.com/photo.jpg"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
                />
                {imageUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setImageUrls(imageUrls.filter((_, j) => j !== i))}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setImageUrls([...imageUrls, ""])}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add another photo
            </button>
          </section>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? "Creating..." : "Create Listing"}
            </button>
            <Link
              href="/dashboard"
              className="px-8 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

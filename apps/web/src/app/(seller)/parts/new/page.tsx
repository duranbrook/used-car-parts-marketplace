"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Maps Prisma PartType enum values to display labels
const PART_TYPES: { value: string; label: string }[] = [
  { value: "ENGINE", label: "Engine" },
  { value: "ENGINE_LUBRICATION", label: "Engine Lubrication" },
  { value: "ENGINE_COOLING", label: "Engine Cooling" },
  { value: "FUEL_AND_AIR", label: "Fuel & Air" },
  { value: "IGNITION", label: "Ignition" },
  { value: "EXHAUST", label: "Exhaust" },
  { value: "TURBOCHARGER", label: "Turbocharger" },
  { value: "BELT_DRIVE", label: "Belt Drive" },
  { value: "TRANSMISSION", label: "Transmission" },
  { value: "DRIVETRAIN", label: "Drivetrain / Axle" },
  { value: "TRANSFER_CASE", label: "Transfer Case" },
  { value: "BRAKES", label: "Brakes" },
  { value: "SUSPENSION", label: "Suspension" },
  { value: "STEERING", label: "Steering" },
  { value: "WHEELS_AND_TIRES", label: "Wheels & Tires" },
  { value: "ELECTRICAL_CHARGING", label: "Electrical / Charging (Alternator, Battery)" },
  { value: "ELECTRICAL_WIRING", label: "Electrical / Wiring" },
  { value: "ECU_AND_MODULES", label: "ECU & Modules" },
  { value: "SENSORS", label: "Sensors" },
  { value: "SWITCHES_AND_RELAYS", label: "Switches & Relays" },
  { value: "HVAC", label: "HVAC / AC" },
  { value: "BODY_PANELS", label: "Body Panels (Hood, Fender, Bumper)" },
  { value: "DOORS", label: "Doors" },
  { value: "GLASS", label: "Glass / Windshield" },
  { value: "WINDOWS", label: "Windows" },
  { value: "LIGHTING", label: "Lighting (Headlight, Taillight)" },
  { value: "MIRRORS", label: "Mirrors" },
  { value: "INTERIOR", label: "Interior" },
  { value: "SEATS", label: "Seats" },
  { value: "AIRBAGS", label: "Airbags" },
  { value: "INSTRUMENT_CLUSTER", label: "Instrument Cluster" },
  { value: "AUDIO_AND_INFOTAINMENT", label: "Audio & Infotainment" },
  { value: "WIPERS", label: "Wipers" },
  { value: "SUNROOF", label: "Sunroof" },
  { value: "TOWING", label: "Towing" },
  { value: "EV_AND_HYBRID", label: "EV & Hybrid Parts" },
  { value: "ADAS", label: "ADAS / Safety Sensors" },
  { value: "HARDWARE", label: "Hardware / Misc" },
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

  const [images, setImages] = useState<{ file: File; previewUrl: string; publicUrl: string | null; uploading: boolean; error: string | null }[]>([]);

  async function uploadFile(file: File, index: number) {
    setImages((prev) => prev.map((img, i) => i === index ? { ...img, uploading: true, error: null } : img));
    try {
      const res = await fetch("/api/seller/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      if (!res.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, publicUrl } = await res.json();

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload to storage failed");

      setImages((prev) => prev.map((img, i) => i === index ? { ...img, publicUrl, uploading: false } : img));
    } catch (err) {
      setImages((prev) => prev.map((img, i) => i === index ? { ...img, uploading: false, error: (err as Error).message } : img));
    }
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    const newImages = Array.from(files).slice(0, 8 - images.length).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      publicUrl: null,
      uploading: false,
      error: null,
    }));
    const startIndex = images.length;
    setImages((prev) => [...prev, ...newImages]);
    newImages.forEach((img, i) => uploadFile(img.file, startIndex + i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const uploadedImages = images.filter((img) => img.publicUrl).map((img) => ({ url: img.publicUrl! }));
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
        partType,
        partNumber: partNumber || undefined,
        conditionGrade,
        conditionNotes: conditionNotes || undefined,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        weight: weight ? parseFloat(weight) : undefined,
        images: uploadedImages,
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
                  <option key={t.value} value={t.value}>{t.label}</option>
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
            <p className="text-sm text-gray-600">Upload up to 8 photos. Files upload directly to cloud storage.</p>

            {/* Drop zone */}
            <label
              className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
            >
              <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className="text-sm text-gray-500">Drag & drop photos or <span className="text-blue-600 font-medium">click to browse</span></span>
              <span className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP — up to 8 photos</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </label>

            {/* Preview grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                    <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                    {/* Upload state overlay */}
                    {img.uploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {img.publicUrl && !img.uploading && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    {img.error && (
                      <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center p-2">
                        <span className="text-white text-xs text-center">Upload failed</span>
                      </div>
                    )}
                    {i === 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5">Primary</div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(img.previewUrl);
                        setImages((prev) => prev.filter((_, j) => j !== i));
                      }}
                      className="absolute top-1 left-1 w-5 h-5 bg-black/50 rounded-full text-white text-xs flex items-center justify-center hover:bg-black/70"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
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

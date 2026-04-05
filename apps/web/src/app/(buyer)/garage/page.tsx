"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface GarageVehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  vin?: string;
  nickname?: string;
}

export default function GaragePage() {
  const [vehicles, setVehicles] = useState<GarageVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [nickname, setNickname] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch("/api/garage")
      .then((r) => r.json())
      .then((data) => { setVehicles(data.vehicles || []); setLoading(false); });
  }, []);

  async function addVehicle(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    const res = await fetch("/api/garage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: parseInt(year), make, model, nickname: nickname || undefined }),
    });
    if (res.ok) {
      const v = await res.json();
      setVehicles([v, ...vehicles]);
      setShowForm(false);
      setYear(""); setMake(""); setModel(""); setNickname("");
    }
    setAdding(false);
  }

  async function removeVehicle(id: string) {
    await fetch("/api/garage", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setVehicles(vehicles.filter((v) => v.id !== id));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">PartFinder</Link>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Garage</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            + Add Vehicle
          </button>
        </div>

        {showForm && (
          <form onSubmit={addVehicle} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="Year" required className="rounded-lg border border-gray-300 px-3 py-2" />
              <input type="text" value={make} onChange={(e) => setMake(e.target.value)} placeholder="Make" required className="rounded-lg border border-gray-300 px-3 py-2" />
              <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Model" required className="rounded-lg border border-gray-300 px-3 py-2" />
            </div>
            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Nickname (optional)" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            <button type="submit" disabled={adding} className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50">
              {adding ? "Adding..." : "Add to Garage"}
            </button>
          </form>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No vehicles saved</p>
            <p className="text-sm text-gray-400 mt-2">Add your vehicles to quickly find compatible parts</p>
          </div>
        ) : (
          <div className="space-y-4">
            {vehicles.map((v) => (
              <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 text-lg">
                    {v.year} {v.make} {v.model}
                  </p>
                  {v.nickname && <p className="text-sm text-gray-500">{v.nickname}</p>}
                  {v.vin && <p className="text-xs text-gray-400 font-mono mt-1">VIN: {v.vin}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/search?year=${v.year}&make=${v.make}&model=${v.model}`}
                    className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100"
                  >
                    Find Parts
                  </Link>
                  <button onClick={() => removeVehicle(v.id)} className="text-sm text-red-600 hover:text-red-700">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

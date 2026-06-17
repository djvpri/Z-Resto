"use client";
import { useState, useEffect } from "react";
import { formatRupiah } from "@/lib/format";

type Settings = { id: string; name: string; slug: string; taxRate: number };

const PRESETS = [
  { label: "0%", value: 0, desc: "Tidak ada PPN" },
  { label: "10%", value: 10, desc: "PPN lama" },
  { label: "11%", value: 11, desc: "PPN 2022" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [taxRate, setTaxRate] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setSettings(d.settings);
        setTaxRate(d.settings?.taxRate ?? 10);
        setLoading(false);
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taxRate }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Gagal menyimpan"); return; }
    setSettings(data.settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const examplePrice = 100000;
  const exampleTax = Math.round(examplePrice * (taxRate / 100));
  const exampleTotal = examplePrice + exampleTax;

  if (loading) return <div className="p-6 text-center py-16 text-gray-400 text-sm">Memuat...</div>;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-sm text-gray-500 mt-0.5">{settings?.name}</p>
      </div>

      {/* Info restoran */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Info Restoran</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-gray-400 mb-1">Nama Restoran</div>
            <div className="font-medium text-gray-800">{settings?.name}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Slug</div>
            <div className="font-mono text-gray-600 text-xs bg-gray-50 px-2 py-1 rounded-lg">{settings?.slug}</div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">Untuk mengubah nama/slug restoran, hubungi administrator.</p>
      </section>

      {/* PPN Settings */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-900 mb-1">Pajak (PPN)</h2>
        <p className="text-sm text-gray-400 mb-4">PPN ditambahkan ke subtotal saat checkout di POS.</p>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Quick presets */}
          <div>
            <div className="text-xs font-medium text-gray-500 mb-2">Pilih cepat</div>
            <div className="flex gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setTaxRate(p.value)}
                  className={`flex-1 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-colors ${
                    taxRate === p.value
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div>{p.label}</div>
                  <div className="text-xs font-normal opacity-70">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom input */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Atau masukkan custom (%)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-xl p-4 text-sm">
            <div className="text-xs text-gray-400 mb-2">Contoh perhitungan (harga item Rp 100.000)</div>
            <div className="space-y-1">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatRupiah(examplePrice)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>PPN {taxRate}%</span>
                <span>{formatRupiah(exampleTax)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
                <span>Total</span>
                <span>{formatRupiah(exampleTotal)}</span>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {saved && <p className="text-sm text-emerald-600">✓ Pengaturan berhasil disimpan</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Pengaturan"}
          </button>
        </form>
      </section>
    </div>
  );
}

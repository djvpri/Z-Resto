"use client";
import { useState, useEffect, useCallback } from "react";
import { formatRupiah } from "@/lib/format";

type ShiftUser = { id: string; name: string; role: string };
type Shift = {
  id: string;
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  closingCash: number | null;
  totalSales: number;
  totalOrders: number;
  notes: string | null;
  user: ShiftUser;
};

function duration(from: string, to: string | null) {
  const ms = (to ? new Date(to) : new Date()).getTime() - new Date(from).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}j ${m}m` : `${m} menit`;
}

function fmt(dt: string) {
  return new Date(dt).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ShiftPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [active, setActive] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Shift | null>(null);

  // buka shift
  const [showOpen, setShowOpen] = useState(false);
  const [openingCash, setOpeningCash] = useState("");
  const [openLoading, setOpenLoading] = useState(false);

  // tutup shift
  const [showClose, setShowClose] = useState(false);
  const [closingCash, setClosingCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [closeLoading, setCloseLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/shifts");
    const d = await res.json();
    setShifts(d.shifts || []);
    setActive(d.active || null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openShift() {
    setOpenLoading(true);
    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingCash: Number(openingCash) || 0 }),
    });
    if (res.ok) {
      setShowOpen(false);
      setOpeningCash("");
      load();
    }
    setOpenLoading(false);
  }

  async function closeShift() {
    if (!active) return;
    setCloseLoading(true);
    const res = await fetch(`/api/shifts/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closingCash: Number(closingCash) || 0, notes: closeNotes }),
    });
    if (res.ok) {
      setShowClose(false);
      setClosingCash("");
      setCloseNotes("");
      load();
    }
    setCloseLoading(false);
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Shift Kasir</h1>
          <p className="text-sm text-gray-500 mt-0.5">Rekap buka & tutup shift harian</p>
        </div>
        <div className="flex gap-2">
          {active ? (
            <button
              onClick={() => setShowClose(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm"
            >
              Tutup Shift
            </button>
          ) : (
            <button
              onClick={() => setShowOpen(true)}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              + Buka Shift
            </button>
          )}
        </div>
      </div>

      {/* Active shift banner */}
      {active && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-emerald-600 font-semibold mb-1">SHIFT AKTIF</div>
            <div className="text-sm font-medium text-gray-800">
              {active.user.name} · Dibuka {fmt(active.openedAt)}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Durasi: {duration(active.openedAt, null)} · Modal awal: {formatRupiah(active.openingCash)}
            </div>
          </div>
          <button
            onClick={() => setSelected(active)}
            className="text-xs text-emerald-700 font-semibold hover:underline"
          >
            Lihat Detail →
          </button>
        </div>
      )}

      {/* Shift history */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Memuat...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Kasir</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Buka</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Tutup</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Order</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Total Penjualan</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shifts.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.user.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmt(s.openedAt)}</td>
                  <td className="px-4 py-3 text-xs">
                    {s.closedAt ? (
                      <span className="text-gray-500">{fmt(s.closedAt)}</span>
                    ) : (
                      <span className="text-emerald-600 font-semibold">Aktif · {duration(s.openedAt, null)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{s.totalOrders}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatRupiah(s.totalSales)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(s)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
              {shifts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                    Belum ada shift
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Buka Shift Modal */}
      {showOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Buka Shift</h2>
              <p className="text-xs text-gray-500 mt-0.5">Hitung uang tunai di laci kasir sebelum mulai</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Modal Awal (Rp)
                </label>
                <input
                  type="number"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-gray-400 mt-1">Jumlah uang tunai di laci saat shift dimulai</p>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => setShowOpen(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={openShift}
                disabled={openLoading}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
              >
                {openLoading ? "Membuka..." : "Buka Shift"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutup Shift Modal */}
      {showClose && active && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Tutup Shift</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Durasi: {duration(active.openedAt, null)}
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Uang Tunai di Laci (Rp)
                </label>
                <input
                  type="number"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Catatan (opsional)
                </label>
                <textarea
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Misal: ada selisih Rp5.000..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => setShowClose(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={closeShift}
                disabled={closeLoading}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50"
              >
                {closeLoading ? "Menutup..." : "Tutup Shift"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Shift Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Detail Shift</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <Row label="Kasir" value={selected.user.name} />
              <Row label="Buka" value={fmt(selected.openedAt)} />
              <Row
                label="Tutup"
                value={selected.closedAt ? fmt(selected.closedAt) : "Masih aktif"}
              />
              <Row label="Durasi" value={duration(selected.openedAt, selected.closedAt)} />
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <Row label="Modal Awal" value={formatRupiah(selected.openingCash)} />
                <Row label="Uang Penutup" value={selected.closingCash !== null ? formatRupiah(selected.closingCash) : "-"} />
                {selected.closingCash !== null && (
                  <Row
                    label="Selisih Tunai"
                    value={formatRupiah(selected.closingCash - selected.openingCash)}
                    highlight
                  />
                )}
              </div>
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <Row label="Total Order" value={`${selected.totalOrders} order`} />
                <Row label="Total Penjualan" value={formatRupiah(selected.totalSales)} highlight />
              </div>
              {selected.notes && (
                <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-600">
                  Catatan: {selected.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={highlight ? "font-bold text-gray-900" : "text-gray-800"}>{value}</span>
    </div>
  );
}

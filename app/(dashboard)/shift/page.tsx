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
  paymentBreakdown?: {
    CASH: number;
    QRIS: number;
    TRANSFER: number;
    CARD: number;
  };
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

function fmtDate(dt: string) {
  return new Date(dt).toLocaleString("id-ID", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Tunai",
  QRIS: "QRIS",
  TRANSFER: "Transfer",
  CARD: "Kartu",
};

export default function ShiftPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [active, setActive] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Shift | null>(null);
  const [showRecap, setShowRecap] = useState<Shift | null>(null);

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

  function handleRecap(shift: Shift) {
    setShowRecap(shift);
  }

  function printRecap() {
    window.print();
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .recap-print, .recap-print * { visibility: visible !important; }
          .recap-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 20px !important;
            background: white !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

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
            onClick={() => handleRecap(active)}
            className="text-xs text-emerald-700 font-semibold hover:underline"
          >
            Lihat Rekap →
          </button>
        </div>
      )}

      {/* Shift history */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Memuat...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Kasir</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Buka</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Tutup</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Order</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Total</th>
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
                        onClick={() => handleRecap(s)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Rekap
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
        </div>
      )}

      {/* Buka Shift Modal */}
      {showOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50 p-0 lg:p-4">
          <div className="bg-white rounded-t-2xl lg:rounded-2xl w-full max-w-sm shadow-xl">
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
        <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50 p-0 lg:p-4">
          <div className="bg-white rounded-t-2xl lg:rounded-2xl w-full max-w-sm shadow-xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Tutup Shift</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Durasi: {duration(active.openedAt, null)}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Input Uang Tunai */}
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

              {/* Rekap Singkat */}
              {closingCash && Number(closingCash) > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Rekap Shift</div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500">Modal Awal</span>
                    <span>{formatRupiah(active.openingCash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Penjualan Tunai</span>
                    <span>{formatRupiah(active.paymentBreakdown?.CASH || 0)}</span>
                  </div>
                  <div className="flex justify-between font-medium pt-2 border-t border-gray-200">
                    <span className="text-gray-700">Kas Akhir (Harusnya)</span>
                    <span className="text-emerald-600">
                      {formatRupiah(active.openingCash + (active.paymentBreakdown?.CASH || 0))}
                    </span>
                  </div>

                  <div className="border-t border-dashed border-gray-300 my-2" />

                  <div className="flex justify-between">
                    <span className="text-gray-500">Uang di Laci</span>
                    <span className="font-medium">{formatRupiah(Number(closingCash))}</span>
                  </div>
                  
                  {(() => {
                    const expected = active.openingCash + (active.paymentBreakdown?.CASH || 0);
                    const actual = Number(closingCash);
                    const diff = actual - expected;
                    return (
                      <div className="flex justify-between pt-2 border-t border-gray-200">
                        <span className="font-medium text-gray-700">Selisih</span>
                        <span className={`font-bold text-base ${diff === 0 ? "text-gray-600" : diff > 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {diff === 0 ? "Sesuai ✓" : formatRupiah(diff)}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Catatan */}
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
                onClick={() => { setShowClose(false); setClosingCash(""); }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={closeShift}
                disabled={closeLoading || !closingCash}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50"
              >
                {closeLoading ? "Menutup..." : "Tutup Shift"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rekap Shift Modal */}
      {showRecap && (
        <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50 p-0 lg:p-4">
          <div className="bg-white rounded-t-2xl lg:rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between no-print">
              <h2 className="font-semibold text-gray-900">Rekap Shift</h2>
              <button onClick={() => setShowRecap(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 recap-print">
              {/* Header Struk */}
              <div className="text-center mb-4">
                <div className="font-bold text-lg text-gray-900">Z-RESTO</div>
                <div className="text-xs text-gray-500">Rekap Shift Harian</div>
              </div>

              <div className="border-t border-dashed border-gray-300 my-3" />

              {/* Info Shift */}
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Kasir</span>
                  <span className="font-medium">{showRecap.user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Shift Buka</span>
                  <span>{fmtDate(showRecap.openedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Shift Tutup</span>
                  <span>{showRecap.closedAt ? fmtDate(showRecap.closedAt) : "Masih Aktif"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Durasi</span>
                  <span className="font-medium">{duration(showRecap.openedAt, showRecap.closedAt)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-300 my-3" />

              {/* Ringkasan Keuangan */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Ringkasan Keuangan</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Modal Awal</span>
                    <span>{formatRupiah(showRecap.openingCash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Penjualan Tunai</span>
                    <span className="font-medium">{formatRupiah(showRecap.paymentBreakdown?.CASH || 0)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="text-gray-500 font-medium">Kas Akhir Tunai</span>
                    <span className="font-bold text-emerald-600">
                      {formatRupiah(showRecap.openingCash + (showRecap.paymentBreakdown?.CASH || 0))}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 italic">
                    (Modal Awal + Penjualan Tunai)
                  </div>
                </div>
              </div>

              {/* Metode Pembayaran */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Metode Pembayaran</div>
                <div className="space-y-2 text-sm">
                  {showRecap.paymentBreakdown ? (
                    <>
                      {Object.entries(showRecap.paymentBreakdown).map(([method, amount]) => (
                        <div key={method} className="flex justify-between">
                          <span className="text-gray-500">{PAYMENT_LABEL[method] || method}</span>
                          <span>{formatRupiah(amount)}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="text-gray-400 text-xs italic">Data breakdown belum tersedia</div>
                  )}
                </div>
              </div>

              <div className="border-t border-dashed border-gray-300 my-3" />

              {/* Selisih Kas */}
              {showRecap.closingCash !== null && (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Penyesuaian Kas</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Kas Akhir Tunai (Harusnya)</span>
                      <span>{formatRupiah(showRecap.openingCash + (showRecap.paymentBreakdown?.CASH || 0))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Uang Tunai di Laci (Seharusnya)</span>
                      <span className="font-medium">{formatRupiah(showRecap.closingCash)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="text-gray-500 font-medium">Selisih</span>
                      {(() => {
                        const expected = showRecap.openingCash + (showRecap.paymentBreakdown?.CASH || 0);
                        const actual = showRecap.closingCash;
                        const diff = actual - expected;
                        return (
                          <span className={`font-bold ${diff === 0 ? "text-gray-600" : diff > 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {diff === 0 ? "Sesuai ✓" : formatRupiah(diff)}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Catatan */}
              {showRecap.notes && (
                <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-600 mb-4">
                  <span className="font-medium">Catatan:</span> {showRecap.notes}
                </div>
              )}

              <div className="border-t border-dashed border-gray-300 my-3" />

              {/* Footer */}
              <div className="text-center text-xs text-gray-400 space-y-1">
                <div>Dicetak: {fmtDate(new Date().toISOString())}</div>
                <div className="font-medium text-gray-500">★ Terima kasih ★</div>
                <div className="text-gray-300">Powered by Z-Resto</div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="p-4 border-t border-gray-100 flex gap-2 no-print">
              <button
                onClick={() => setShowRecap(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Tutup
              </button>
              <button
                onClick={printRecap}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                🖨️ Cetak Rekap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

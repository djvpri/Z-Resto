"use client";
import { useState, useEffect, useCallback } from "react";
import { formatRupiah, formatDate } from "@/lib/format";

type SubRequest = {
  id: string;
  plan: string;
  status: string;
  amount: number;
  paymentCode: string | null;
  notes: string | null;
  createdAt: string;
  confirmedAt: string | null;
  confirmedBy: string | null;
  tenant: { name: string; slug: string };
};

const PLAN_LABEL: Record<string, string> = {
  TRIAL: "Trial",
  MONTHLY: "Bulanan",
  YEARLY: "Tahunan",
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  EXPIRED: "bg-red-100 text-red-600",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default function PaymentsPage() {
  const [subs, setSubs] = useState<SubRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/subscriptions?status=${filter}`);
    const d = await res.json();
    setSubs(d.subscriptions || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirm(id: string) {
    if (!confirm("Konfirmasi pembayaran ini?")) return;
    setConfirming(id);
    await fetch(`/api/admin/subscriptions/${id}/confirm`, { method: "POST" });
    setConfirming(null);
    load();
  }

  async function reject(id: string) {
    if (!confirm("Tolak pembayaran ini?")) return;
    setConfirming(id);
    await fetch(`/api/admin/subscriptions/${id}/reject`, { method: "POST" });
    setConfirming(null);
    load();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kelola Pembayaran</h1>
          <p className="text-sm text-gray-500 mt-0.5">Konfirmasi pembayaran langganan tenant</p>
        </div>
        <button
          onClick={load}
          className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {["PENDING", "ACTIVE", "ALL"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === s
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300"
            }`}
          >
            {s === "PENDING" ? "Menunggu Konfirmasi" : s === "ACTIVE" ? "Sudah Aktif" : "Semua"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Memuat...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Tenant</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Waktu Request</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Paket</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Nominal</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Catatan</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {subs.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{sub.tenant.name}</div>
                    <div className="text-xs text-gray-400">{sub.tenant.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {formatDate(sub.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-700">
                    {PLAN_LABEL[sub.plan] || sub.plan}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatRupiah(sub.amount)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                    {sub.notes || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        STATUS_COLOR[sub.status] || "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {sub.status === "PENDING"
                        ? "Menunggu"
                        : sub.status === "ACTIVE"
                        ? "Aktif"
                        : sub.status}
                    </span>
                    {sub.confirmedBy && (
                      <div className="text-xs text-gray-400 mt-0.5">by {sub.confirmedBy}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {sub.status === "PENDING" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirm(sub.id)}
                          disabled={confirming === sub.id}
                          className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                          {confirming === sub.id ? "..." : "Konfirmasi"}
                        </button>
                        <button
                          onClick={() => reject(sub.id)}
                          disabled={confirming === sub.id}
                          className="text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          Tolak
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {subs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                    Tidak ada data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

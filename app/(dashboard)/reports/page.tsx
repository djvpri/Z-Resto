"use client";
import { useState, useEffect, useCallback } from "react";
import { formatRupiah } from "@/lib/format";

type Stats = {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  topItems: { name: string; count: number }[];
};

export default function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.role === "CASHIER") {
          setForbidden(true);
        }
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reports?date=${date}`);
    const d = await res.json();
    setStats(d);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const statCards = [
    {
      label: "Total Pendapatan",
      value: stats ? formatRupiah(stats.totalRevenue) : "-",
      emoji: "💰",
      color: "bg-emerald-50 border-emerald-100",
      textColor: "text-emerald-700",
    },
    {
      label: "Jumlah Order",
      value: stats ? `${stats.totalOrders} order` : "-",
      emoji: "📦",
      color: "bg-blue-50 border-blue-100",
      textColor: "text-blue-700",
    },
    {
      label: "Rata-rata Order",
      value: stats ? formatRupiah(stats.avgOrderValue) : "-",
      emoji: "📈",
      color: "bg-purple-50 border-purple-100",
      textColor: "text-purple-700",
    },
  ];

  if (forbidden) {
    return (
      <div className="p-6">
        <div className="text-center py-20">
          <div className="text-4xl mb-3">🔒</div>
          <p className="text-gray-500 text-sm">Anda tidak memiliki akses ke halaman ini</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Laporan Harian</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ringkasan penjualan per hari</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={load}
            className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Lihat
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Memuat laporan...</div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {statCards.map((card) => (
              <div
                key={card.label}
                className={`border rounded-2xl p-5 ${card.color}`}
              >
                <div className="text-2xl mb-2">{card.emoji}</div>
                <div className="text-sm text-gray-500 mb-1">{card.label}</div>
                <div className={`text-xl font-bold ${card.textColor}`}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* Top items */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Menu Terlaris</h2>
            {stats.topItems.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                Belum ada data untuk tanggal ini
              </div>
            ) : (
              <div className="space-y-3">
                {stats.topItems.map((item, i) => {
                  const max = stats.topItems[0]?.count || 1;
                  const pct = Math.round((item.count / max) * 100);
                  return (
                    <div key={item.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                          <span className="font-medium text-gray-800">{item.name}</span>
                        </div>
                        <span className="text-gray-500 text-xs">{item.count} porsi</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400 text-sm">Pilih tanggal untuk melihat laporan</div>
      )}
    </div>
  );
}

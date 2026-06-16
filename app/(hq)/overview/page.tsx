"use client";
import { useState, useEffect } from "react";
import { formatRupiah } from "@/lib/format";

type Branch = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  isActive: boolean;
  _count: { orders: number; users: number };
};

type Stats = {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  topItems: { name: string; count: number }[];
};

export default function OverviewPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch("/api/branches");
      const d = await res.json();
      const branchList: Branch[] = d.branches || [];
      setBranches(branchList);

      const statsMap: Record<string, Stats> = {};
      await Promise.all(
        branchList.map(async (b) => {
          const r = await fetch(`/api/reports?date=${today}&branchId=${b.id}`);
          if (r.ok) statsMap[b.id] = await r.json();
        })
      );
      setStats(statsMap);
      setLoading(false);
    }
    load();
  }, [today]);

  const totalRevenue = Object.values(stats).reduce((s, st) => s + (st?.totalRevenue || 0), 0);
  const totalOrders = Object.values(stats).reduce((s, st) => s + (st?.totalOrders || 0), 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">HQ Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Ringkasan semua cabang hari ini · {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Global summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-emerald-600 rounded-2xl p-5 text-white">
          <div className="text-sm text-emerald-100 mb-1">Total Pendapatan Hari Ini</div>
          <div className="text-2xl font-bold">{formatRupiah(totalRevenue)}</div>
          <div className="text-xs text-emerald-200 mt-1">dari {branches.length} cabang</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="text-sm text-gray-500 mb-1">Total Order Hari Ini</div>
          <div className="text-2xl font-bold text-gray-900">{totalOrders}</div>
          <div className="text-xs text-gray-400 mt-1">semua cabang gabungan</div>
        </div>
      </div>

      {/* Branches */}
      <h2 className="font-semibold text-gray-900 mb-3">Performa Per Cabang</h2>
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Memuat data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {branches.map((branch) => {
            const s = stats[branch.id];
            return (
              <div key={branch.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{branch.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{branch.city || "—"}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      branch.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {branch.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-500">Pendapatan</div>
                    <div className="font-bold text-gray-900 text-sm mt-0.5">
                      {s ? formatRupiah(s.totalRevenue) : "—"}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-500">Order</div>
                    <div className="font-bold text-gray-900 text-sm mt-0.5">
                      {s ? `${s.totalOrders}` : "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                  <span>{branch._count.users} pengguna</span>
                  <span>{branch._count.orders} order total</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

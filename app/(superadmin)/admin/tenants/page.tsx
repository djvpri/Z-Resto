"use client";
import { useState, useEffect } from "react";
import { formatDate } from "@/lib/format";
import { daysUntil } from "@/lib/pricing";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  _count: { users: number; branches: number; orders: number };
  subscriptions: {
    id: string;
    plan: string;
    status: string;
    endDate: string | null;
    confirmedAt: string | null;
  }[];
};

const PLAN_LABEL: Record<string, string> = {
  TRIAL: "Trial",
  MONTHLY: "Bulanan",
  YEARLY: "Tahunan",
};

function getSubStatus(tenant: Tenant) {
  const subs = tenant.subscriptions;
  if (subs.length === 0) return { label: "Belum ada", color: "bg-gray-100 text-gray-500" };

  const active = subs.find(
    (s) => s.status === "ACTIVE" && (!s.endDate || daysUntil(s.endDate) >= 0)
  );
  if (active) {
    const days = active.endDate ? daysUntil(active.endDate) : null;
    if (days !== null && days <= 3) {
      return {
        label: `${PLAN_LABEL[active.plan]} · ${days}h tersisa`,
        color: "bg-red-100 text-red-600",
      };
    }
    return {
      label: `${PLAN_LABEL[active.plan]} · Aktif`,
      color: "bg-emerald-100 text-emerald-700",
    };
  }

  const pending = subs.find((s) => s.status === "PENDING");
  if (pending) return { label: "Menunggu Bayar", color: "bg-amber-100 text-amber-700" };

  return { label: "Expired", color: "bg-red-100 text-red-600" };
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/tenants")
      .then((r) => r.json())
      .then((d) => {
        setTenants(d.tenants || []);
        setLoading(false);
      });
  }, []);

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Daftar Tenant</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tenants.length} restoran terdaftar</p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama restoran..."
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Memuat...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Restoran</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Daftar</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Langganan</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Cabang</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Users</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((tenant) => {
                const sub = getSubStatus(tenant);
                return (
                  <tr key={tenant.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{tenant.name}</div>
                      <div className="text-xs text-gray-400">{tenant.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDate(tenant.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${sub.color}`}>
                        {sub.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 font-medium">
                      {tenant._count.branches}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 font-medium">
                      {tenant._count.users}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 font-medium">
                      {tenant._count.orders}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                    Tidak ada tenant
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

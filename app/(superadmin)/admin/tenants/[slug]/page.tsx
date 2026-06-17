"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah, formatDate } from "@/lib/format";
import { daysUntil } from "@/lib/pricing";

type Subscription = {
  id: string;
  plan: string;
  status: string;
  amount: number;
  startDate: string | null;
  endDate: string | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  notes: string | null;
  createdAt: string;
};

type Branch = {
  id: string;
  name: string;
  city: string | null;
  isActive: boolean;
  _count: { orders: number; users: number };
};

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  branch: { name: string } | null;
};

type Tenant = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  subscriptions: Subscription[];
  branches: Branch[];
  users: User[];
  _count: { branches: number; users: number };
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

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Pemilik",
  MANAGER: "Manajer",
  CASHIER: "Kasir",
};

export default function TenantDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/admin/tenants/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        setTenant(d.tenant || null);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return <div className="p-6 text-center text-gray-400 text-sm py-16">Memuat...</div>;
  }
  if (!tenant) {
    return <div className="p-6 text-center text-gray-500">Tenant tidak ditemukan.</div>;
  }

  const latestSub = tenant.subscriptions[0];
  const isActive =
    latestSub?.status === "ACTIVE" &&
    (!latestSub.endDate || daysUntil(latestSub.endDate) >= 0);
  const daysLeft = latestSub?.endDate ? daysUntil(latestSub.endDate) : null;

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-600 text-sm mt-1"
        >
          ← Kembali
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{tenant.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
              {tenant.slug}
            </span>
            <span>Daftar {formatDate(tenant.createdAt)}</span>
            <span>{tenant._count.branches} cabang</span>
            <span>{tenant._count.users} pengguna</span>
          </div>
        </div>
        <div
          className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
            isActive
              ? "bg-emerald-100 text-emerald-700"
              : latestSub?.status === "PENDING"
              ? "bg-amber-100 text-amber-700"
              : "bg-red-100 text-red-600"
          }`}
        >
          {isActive
            ? daysLeft !== null
              ? `Aktif · ${daysLeft} hari`
              : "Aktif"
            : latestSub?.status === "PENDING"
            ? "Menunggu Bayar"
            : "Tidak Aktif"}
        </div>
      </div>

      {/* Subscription history */}
      <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Riwayat Langganan</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Paket</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Nominal</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Periode</th>
              <th className="text-center px-4 py-3 text-gray-500 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Dikonfirmasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {tenant.subscriptions.map((sub) => (
              <tr key={sub.id}>
                <td className="px-4 py-3 font-medium text-gray-800">
                  {PLAN_LABEL[sub.plan] || sub.plan}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {sub.amount > 0 ? formatRupiah(sub.amount) : "Gratis"}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {sub.startDate ? formatDate(sub.startDate) : "—"}
                  {sub.endDate ? ` → ${formatDate(sub.endDate)}` : ""}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      STATUS_COLOR[sub.status] || "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {sub.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {sub.confirmedAt ? (
                    <>
                      {formatDate(sub.confirmedAt)}
                      {sub.confirmedBy && (
                        <div className="text-gray-300">by {sub.confirmedBy}</div>
                      )}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {tenant.subscriptions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                  Belum ada riwayat langganan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Branches & Users side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branches */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">
              Cabang ({tenant.branches.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {tenant.branches.map((branch) => (
              <div key={branch.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-800">{branch.name}</div>
                  <div className="text-xs text-gray-400">{branch.city || "—"}</div>
                </div>
                <div className="text-right text-xs text-gray-400">
                  <div>{branch._count.orders} order</div>
                  <div>{branch._count.users} staf</div>
                </div>
              </div>
            ))}
            {tenant.branches.length === 0 && (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">
                Belum ada cabang
              </div>
            )}
          </div>
        </section>

        {/* Users */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">
              Pengguna ({tenant.users.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {tenant.users.map((u) => (
              <div key={u.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{u.name}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                      {ROLE_LABEL[u.role] || u.role}
                    </span>
                    {!u.isActive && (
                      <span className="text-xs bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">
                        Nonaktif
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{u.email}</div>
                </div>
                <div className="text-xs text-gray-400 text-right">
                  {u.branch?.name || "HQ"}
                </div>
              </div>
            ))}
            {tenant.users.length === 0 && (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">
                Belum ada pengguna
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

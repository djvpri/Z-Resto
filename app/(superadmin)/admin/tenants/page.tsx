"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { daysUntil } from "@/lib/pricing";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
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

const PLAN_LABEL: Record<string, string> = { TRIAL: "Trial", MONTHLY: "Bulanan", YEARLY: "Tahunan" };

function getSubStatus(tenant: Tenant) {
  if (!tenant.isActive) return { label: "Ditangguhkan", color: "bg-gray-200 text-gray-600" };
  const subs = tenant.subscriptions;
  if (subs.length === 0) return { label: "Belum ada", color: "bg-gray-100 text-gray-500" };
  const active = subs.find((s) => s.status === "ACTIVE" && (!s.endDate || daysUntil(s.endDate) >= 0));
  if (active) {
    const days = active.endDate ? daysUntil(active.endDate) : null;
    if (days !== null && days <= 3) return { label: `${PLAN_LABEL[active.plan]} · ${days}h tersisa`, color: "bg-red-100 text-red-600" };
    return { label: `${PLAN_LABEL[active.plan]} · Aktif`, color: "bg-emerald-100 text-emerald-700" };
  }
  const pending = subs.find((s) => s.status === "PENDING");
  if (pending) return { label: "Menunggu Bayar", color: "bg-amber-100 text-amber-700" };
  return { label: "Expired", color: "bg-red-100 text-red-600" };
}

const EMPTY_FORM = { name: "", slug: "", ownerName: "", ownerEmail: "", ownerPassword: "" };

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function loadTenants() {
    setLoading(true);
    fetch("/api/admin/tenants")
      .then((r) => r.json())
      .then((d) => { setTenants(d.tenants || []); setLoading(false); });
  }

  useEffect(() => { loadTenants(); }, []);

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Gagal menambah tenant"); return; }
    setShowModal(false);
    setForm(EMPTY_FORM);
    loadTenants();
  }

  function handleExport() {
    window.open("/api/admin/export", "_blank");
  }

  const filtered = tenants.filter(
    (t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Daftar Tenant</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tenants.length} restoran terdaftar</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama restoran..."
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
          <button
            onClick={handleExport}
            className="border border-gray-200 text-gray-600 px-3 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={() => { setShowModal(true); setError(""); setForm(EMPTY_FORM); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            + Tambah Tenant
          </button>
        </div>
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
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((tenant) => {
                const sub = getSubStatus(tenant);
                return (
                  <tr key={tenant.id} className={`hover:bg-gray-50/50 ${!tenant.isActive ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{tenant.name}</div>
                      <div className="text-xs text-gray-400">{tenant.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(tenant.createdAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${sub.color}`}>
                        {sub.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 font-medium">{tenant._count.branches}</td>
                    <td className="px-4 py-3 text-center text-gray-700 font-medium">{tenant._count.users}</td>
                    <td className="px-4 py-3 text-center text-gray-700 font-medium">{tenant._count.orders}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/tenants/${tenant.slug}`}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Detail →
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                    Tidak ada tenant
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tambah Tenant Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Tambah Tenant Baru</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nama Restoran</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value, slug: autoSlug(e.target.value) })}
                  required placeholder="cth. Warung Padang Jaya"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Slug (URL)</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: autoSlug(e.target.value) })}
                  required placeholder="warung-padang-jaya"
                />
              </div>
              <hr className="border-gray-100" />
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nama Owner</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.ownerName}
                  onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                  required placeholder="Nama lengkap pemilik"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email Owner</label>
                <input
                  type="email"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.ownerEmail}
                  onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                  required placeholder="owner@restoran.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Password Owner</label>
                <input
                  type="password"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.ownerPassword}
                  onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })}
                  required minLength={6} placeholder="Min. 6 karakter"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {saving ? "Menyimpan..." : "Tambah"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

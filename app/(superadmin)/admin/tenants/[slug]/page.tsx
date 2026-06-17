"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah, formatDate } from "@/lib/format";
import { daysUntil } from "@/lib/pricing";

type Subscription = {
  id: string; plan: string; status: string; amount: number;
  startDate: string | null; endDate: string | null;
  confirmedAt: string | null; confirmedBy: string | null;
  notes: string | null; createdAt: string;
};
type Branch = { id: string; name: string; city: string | null; isActive: boolean; _count: { orders: number; users: number } };
type StaffUser = { id: string; name: string; email: string; role: string; isActive: boolean; branch: { name: string } | null };
type Tenant = {
  id: string; name: string; slug: string; isActive: boolean; createdAt: string;
  subscriptions: Subscription[]; branches: Branch[]; users: StaffUser[];
  _count: { branches: number; users: number };
};

const PLAN_LABEL: Record<string, string> = { TRIAL: "Trial", MONTHLY: "Bulanan", YEARLY: "Tahunan" };
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700", PENDING: "bg-amber-100 text-amber-700",
  EXPIRED: "bg-red-100 text-red-600", CANCELLED: "bg-gray-100 text-gray-500",
};
const ROLE_LABEL: Record<string, string> = { OWNER: "Pemilik", MANAGER: "Manajer", CASHIER: "Kasir" };

type ModalType = "edit" | "reset-pw" | "subscription" | "impersonate" | "delete" | null;

export default function TenantDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editForm, setEditForm] = useState({ name: "", newSlug: "" });
  const [newPassword, setNewPassword] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("MONTHLY");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const router = useRouter();

  function loadTenant() {
    fetch(`/api/admin/tenants/${slug}`)
      .then((r) => r.json())
      .then((d) => { setTenant(d.tenant || null); setLoading(false); });
  }

  useEffect(() => { loadTenant(); }, [slug]);

  function openModal(type: ModalType) {
    setError(""); setSuccess("");
    if (type === "edit" && tenant) setEditForm({ name: tenant.name, newSlug: tenant.slug });
    if (type === "reset-pw") setNewPassword("");
    if (type === "subscription") setSelectedPlan("MONTHLY");
    if (type === "delete") setDeleteConfirm("");
    setActiveModal(type);
  }

  async function callApi(path: string, method: string, body?: object) {
    setSaving(true); setError(""); setSuccess("");
    const res = await fetch(path, {
      method, headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Terjadi kesalahan"); return null; }
    return data;
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    const data = await callApi(`/api/admin/tenants/${slug}`, "PATCH", editForm);
    if (!data) return;
    setSuccess("Info tenant berhasil diperbarui");
    const newSlugValue = editForm.newSlug !== slug ? editForm.newSlug : slug;
    setActiveModal(null);
    if (newSlugValue !== slug) router.replace(`/admin/tenants/${newSlugValue}`);
    else loadTenant();
  }

  async function handleSuspend() {
    if (!tenant) return;
    const data = await callApi(`/api/admin/tenants/${slug}`, "PATCH", { isActive: !tenant.isActive });
    if (!data) return;
    setSuccess(tenant.isActive ? "Tenant berhasil ditangguhkan" : "Tenant berhasil diaktifkan");
    loadTenant();
  }

  async function handleResetPw(e: React.FormEvent) {
    e.preventDefault();
    const data = await callApi(`/api/admin/tenants/${slug}/reset-password`, "POST", { newPassword });
    if (!data) return;
    setSuccess("Password owner berhasil direset");
    setActiveModal(null);
  }

  async function handleManualSub(e: React.FormEvent) {
    e.preventDefault();
    const data = await callApi(`/api/admin/tenants/${slug}/subscription`, "POST", { plan: selectedPlan });
    if (!data) return;
    setSuccess(`Langganan ${PLAN_LABEL[selectedPlan]} berhasil diaktifkan`);
    setActiveModal(null);
    loadTenant();
  }

  async function handleImpersonate() {
    const data = await callApi(`/api/admin/tenants/${slug}/impersonate`, "POST");
    if (!data) return;
    setActiveModal(null);
    window.open(`/api/admin/impersonate-enter?token=${data.token}`, "_blank");
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant || deleteConfirm !== tenant.slug) { setError("Slug tidak cocok"); return; }
    const data = await callApi(`/api/admin/tenants/${slug}`, "DELETE");
    if (!data) return;
    router.push("/admin/tenants");
  }

  if (loading) return <div className="p-6 text-center text-gray-400 text-sm py-16">Memuat...</div>;
  if (!tenant) return <div className="p-6 text-center text-gray-500">Tenant tidak ditemukan.</div>;

  const latestSub = tenant.subscriptions[0];
  const isSubActive = latestSub?.status === "ACTIVE" && (!latestSub.endDate || daysUntil(latestSub.endDate) >= 0);
  const daysLeft = latestSub?.endDate ? daysUntil(latestSub.endDate) : null;

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm mt-1">← Kembali</button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">{tenant.name}</h1>
            {!tenant.isActive && (
              <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full font-medium">Ditangguhkan</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{tenant.slug}</span>
            <span>Daftar {formatDate(tenant.createdAt)}</span>
            <span>{tenant._count.branches} cabang · {tenant._count.users} pengguna</span>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${isSubActive ? "bg-emerald-100 text-emerald-700" : latestSub?.status === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>
          {isSubActive ? (daysLeft !== null ? `Aktif · ${daysLeft} hari` : "Aktif") : latestSub?.status === "PENDING" ? "Menunggu Bayar" : "Tidak Aktif"}
        </div>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm text-emerald-700">{success}</div>
      )}

      {/* Action panel */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Aksi Admin</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => openModal("edit")}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
            ✏️ Edit Info
          </button>
          <button onClick={handleSuspend} disabled={saving}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${tenant.isActive ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`}>
            {tenant.isActive ? "🔒 Tangguhkan" : "✅ Aktifkan Kembali"}
          </button>
          <button onClick={() => openModal("reset-pw")}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-200 transition-colors">
            🔑 Reset Password
          </button>
          <button onClick={() => openModal("subscription")}
            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-xl text-sm font-medium hover:bg-purple-200 transition-colors">
            💳 Beri Langganan
          </button>
          <button onClick={() => openModal("impersonate")}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">
            👤 Login sebagai Owner
          </button>
          <button onClick={() => openModal("delete")}
            className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-sm font-medium hover:bg-red-200 transition-colors ml-auto">
            🗑️ Hapus Tenant
          </button>
        </div>
        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
      </div>

      {/* Subscription history */}
      <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Riwayat Langganan</h2></div>
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
                <td className="px-4 py-3 font-medium text-gray-800">{PLAN_LABEL[sub.plan] || sub.plan}</td>
                <td className="px-4 py-3 text-gray-700">{sub.amount > 0 ? formatRupiah(sub.amount) : "Gratis"}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {sub.startDate ? formatDate(sub.startDate) : "—"}{sub.endDate ? ` → ${formatDate(sub.endDate)}` : ""}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[sub.status] || "bg-gray-100 text-gray-500"}`}>{sub.status}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {sub.confirmedAt ? <>{formatDate(sub.confirmedAt)}{sub.confirmedBy && <div className="text-gray-300">by {sub.confirmedBy}</div>}</> : "—"}
                </td>
              </tr>
            ))}
            {tenant.subscriptions.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">Belum ada riwayat langganan</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Branches & Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Cabang ({tenant.branches.length})</h2></div>
          <div className="divide-y divide-gray-50">
            {tenant.branches.map((branch) => (
              <div key={branch.id} className="px-5 py-3 flex items-center justify-between">
                <div><div className="text-sm font-medium text-gray-800">{branch.name}</div><div className="text-xs text-gray-400">{branch.city || "—"}</div></div>
                <div className="text-right text-xs text-gray-400"><div>{branch._count.orders} order</div><div>{branch._count.users} staf</div></div>
              </div>
            ))}
            {tenant.branches.length === 0 && <div className="px-5 py-8 text-center text-gray-400 text-sm">Belum ada cabang</div>}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Pengguna ({tenant.users.length})</h2></div>
          <div className="divide-y divide-gray-50">
            {tenant.users.map((u) => (
              <div key={u.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{u.name}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{ROLE_LABEL[u.role] || u.role}</span>
                    {!u.isActive && <span className="text-xs bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">Nonaktif</span>}
                  </div>
                  <div className="text-xs text-gray-400">{u.email}</div>
                </div>
                <div className="text-xs text-gray-400 text-right">{u.branch?.name || "HQ"}</div>
              </div>
            ))}
            {tenant.users.length === 0 && <div className="px-5 py-8 text-center text-gray-400 text-sm">Belum ada pengguna</div>}
          </div>
        </section>
      </div>

      {/* ─── Modals ─── */}

      {/* Edit Info */}
      {activeModal === "edit" && (
        <Modal title="Edit Info Tenant" onClose={() => setActiveModal(null)}>
          <form onSubmit={handleEdit} className="space-y-3">
            <Field label="Nama Restoran">
              <input className={INPUT} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            </Field>
            <Field label="Slug">
              <input className={`${INPUT} font-mono`} value={editForm.newSlug} onChange={(e) => setEditForm({ ...editForm, newSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} required />
            </Field>
            <ModalButtons onCancel={() => setActiveModal(null)} saving={saving} label="Simpan" />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </form>
        </Modal>
      )}

      {/* Reset Password */}
      {activeModal === "reset-pw" && (
        <Modal title="Reset Password Owner" onClose={() => setActiveModal(null)}>
          <form onSubmit={handleResetPw} className="space-y-3">
            <Field label="Password Baru">
              <input type="password" className={INPUT} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} placeholder="Min. 6 karakter" />
            </Field>
            <ModalButtons onCancel={() => setActiveModal(null)} saving={saving} label="Reset Password" />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </form>
        </Modal>
      )}

      {/* Manual Subscription */}
      {activeModal === "subscription" && (
        <Modal title="Beri Langganan Manual" onClose={() => setActiveModal(null)}>
          <form onSubmit={handleManualSub} className="space-y-3">
            <Field label="Paket">
              <select className={INPUT} value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)}>
                <option value="TRIAL">Trial (14 hari)</option>
                <option value="MONTHLY">Bulanan (30 hari)</option>
                <option value="YEARLY">Tahunan (365 hari)</option>
              </select>
            </Field>
            <p className="text-xs text-gray-400">Langganan akan langsung AKTIF. Subscription PENDING sebelumnya akan dibatalkan.</p>
            <ModalButtons onCancel={() => setActiveModal(null)} saving={saving} label="Aktifkan" />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </form>
        </Modal>
      )}

      {/* Impersonate */}
      {activeModal === "impersonate" && (
        <Modal title="Login sebagai Owner" onClose={() => setActiveModal(null)}>
          <p className="text-sm text-gray-600 mb-4">
            Membuka tab baru sebagai Owner dari <strong>{tenant.name}</strong>. Setelah selesai, tutup tab tersebut dan login kembali sebagai SuperAdmin.
          </p>
          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
          <ModalButtons onCancel={() => setActiveModal(null)} saving={saving} label="Buka Tab Baru" onConfirm={handleImpersonate} />
        </Modal>
      )}

      {/* Delete */}
      {activeModal === "delete" && (
        <Modal title="Hapus Tenant" onClose={() => setActiveModal(null)}>
          <form onSubmit={handleDelete} className="space-y-3">
            <p className="text-sm text-gray-600">
              Tindakan ini <strong>tidak bisa dibatalkan</strong>. Semua data cabang, menu, order, dan pengguna akan dihapus permanen.
            </p>
            <Field label={`Ketik slug "${tenant.slug}" untuk konfirmasi`}>
              <input className={`${INPUT} font-mono`} value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder={tenant.slug} />
            </Field>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setActiveModal(null)} className="flex-1 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Batal</button>
              <button type="submit" disabled={saving || deleteConfirm !== tenant.slug} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40">
                {saving ? "Menghapus..." : "Hapus Permanen"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

const INPUT = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function ModalButtons({ onCancel, saving, label, onConfirm }: { onCancel: () => void; saving: boolean; label: string; onConfirm?: () => void }) {
  return (
    <div className="flex gap-2 pt-1">
      <button type="button" onClick={onCancel} className="flex-1 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Batal</button>
      <button type={onConfirm ? "button" : "submit"} onClick={onConfirm} disabled={saving} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
        {saving ? "Memproses..." : label}
      </button>
    </div>
  );
}

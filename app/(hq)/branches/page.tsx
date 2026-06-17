"use client";
import { useState, useEffect } from "react";

type Branch = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  _count: { orders: number; users: number };
};

const EMPTY_FORM = { name: "", city: "", address: "", phone: "" };

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function loadBranches() {
    setLoading(true);
    fetch("/api/branches")
      .then((r) => r.json())
      .then((d) => {
        setBranches(d.branches || []);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadBranches();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Gagal menambah cabang");
      return;
    }
    setShowModal(false);
    setForm(EMPTY_FORM);
    loadBranches();
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kelola Cabang</h1>
          <p className="text-sm text-gray-500 mt-0.5">{branches.length} cabang terdaftar</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setError(""); setForm(EMPTY_FORM); }}
          className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
        >
          + Tambah Cabang
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Memuat...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <div key={branch.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">{branch.name}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{branch.city || "—"}</div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ml-2 ${
                    branch.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {branch.isActive ? "Aktif" : "Nonaktif"}
                </span>
              </div>

              {branch.address && (
                <div className="text-xs text-gray-400 mb-3 leading-relaxed">{branch.address}</div>
              )}
              {branch.phone && (
                <div className="text-xs text-gray-500 mb-3">📞 {branch.phone}</div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-50">
                <div className="text-center py-2 bg-gray-50 rounded-xl">
                  <div className="text-lg font-bold text-gray-900">{branch._count.users}</div>
                  <div className="text-xs text-gray-400">Pengguna</div>
                </div>
                <div className="text-center py-2 bg-gray-50 rounded-xl">
                  <div className="text-lg font-bold text-gray-900">{branch._count.orders}</div>
                  <div className="text-xs text-gray-400">Total Order</div>
                </div>
              </div>
            </div>
          ))}

          {branches.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400 text-sm">
              Belum ada cabang. Klik "+ Tambah Cabang" untuk mulai.
            </div>
          )}
        </div>
      )}

      {/* Add modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Tambah Cabang Baru</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nama Cabang <span className="text-red-400">*</span>
                </label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="cth. Cabang Selatan"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kota</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="cth. Jakarta"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Alamat</label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                  placeholder="Alamat lengkap"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">No. Telepon</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="cth. 0812-3456-7890"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Tambah Cabang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

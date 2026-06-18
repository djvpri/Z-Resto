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
  tables?: TableInfo[];
};

type TableInfo = {
  id: string;
  number: string;
  capacity: number;
  status: string;
  activeOrderCount: number;
};

const EMPTY_FORM = { name: "", city: "", address: "", phone: "" };

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Table management state
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [branchTables, setBranchTables] = useState<TableInfo[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState("4");
  const [tableError, setTableError] = useState("");
  const [addingTable, setAddingTable] = useState(false);

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

  async function openTableManager(branch: Branch) {
    setSelectedBranch(branch);
    setLoadingTables(true);
    setNewTableNumber("");
    setNewTableCapacity("4");
    setTableError("");
    try {
      const res = await fetch(`/api/branches/${branch.id}/tables`);
      const data = await res.json();
      setBranchTables(data.tables || []);
    } catch {
      setBranchTables([]);
    }
    setLoadingTables(false);
  }

  async function addTable() {
    if (!newTableNumber.trim() || !selectedBranch) return;
    setAddingTable(true);
    setTableError("");
    const res = await fetch(`/api/branches/${selectedBranch.id}/tables`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: newTableNumber.trim(), capacity: Number(newTableCapacity) || 4 }),
    });
    const data = await res.json();
    setAddingTable(false);
    if (!res.ok) {
      setTableError(data.error || "Gagal menambah meja");
      return;
    }
    setBranchTables((prev) => [...prev, { ...data.table, status: "AVAILABLE", activeOrderCount: 0 }]);
    setNewTableNumber("");
  }

  async function deleteTable(tableId: string) {
    if (!selectedBranch) return;
    const res = await fetch(`/api/branches/${selectedBranch.id}/tables/${tableId}`, { method: "DELETE" });
    if (res.ok) {
      setBranchTables((prev) => prev.filter((t) => t.id !== tableId));
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kelola Cabang</h1>
          <p className="text-sm text-gray-500 mt-0.5">{branches.length} cabang terdaftar</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setError(""); setForm(EMPTY_FORM); }}
          className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors self-start"
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

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-50">
                <div className="text-center py-2 bg-gray-50 rounded-xl">
                  <div className="text-lg font-bold text-gray-900">{branch._count.users}</div>
                  <div className="text-xs text-gray-400">Staf</div>
                </div>
                <div className="text-center py-2 bg-gray-50 rounded-xl">
                  <div className="text-lg font-bold text-gray-900">{branch._count.orders}</div>
                  <div className="text-xs text-gray-400">Order</div>
                </div>
                <button
                  onClick={() => openTableManager(branch)}
                  className="text-center py-2 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  <div className="text-lg font-bold text-emerald-700">Meja →</div>
                  <div className="text-xs text-emerald-600">Kelola</div>
                </button>
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

      {/* ========= TABLE MANAGER MODAL ========= */}
      {selectedBranch && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg shadow-xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="p-4 md:p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-semibold text-gray-900">Meja — {selectedBranch.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{branchTables.length} meja terdaftar</p>
              </div>
              <button onClick={() => setSelectedBranch(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>

            {/* Add table form */}
            <div className="p-4 md:p-5 border-b border-gray-100 bg-gray-50 shrink-0">
              <div className="text-xs font-medium text-gray-600 mb-2">Tambah Meja Baru</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  placeholder="Nomor meja (1, VIP-A, dll)"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
                <input
                  type="number"
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(e.target.value)}
                  min="1"
                  placeholder="Kursi"
                  className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
                <button
                  onClick={addTable}
                  disabled={!newTableNumber.trim() || addingTable}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-40 transition-colors shrink-0"
                >
                  {addingTable ? "..." : "+ Tambah"}
                </button>
              </div>
              {tableError && <div className="text-xs text-red-500 mt-2">{tableError}</div>}
            </div>

            {/* Table list */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5">
              {loadingTables ? (
                <div className="text-center py-8 text-gray-400 text-sm">Memuat meja...</div>
              ) : branchTables.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <div className="text-3xl mb-2">🪑</div>
                  Belum ada meja. Tambah meja baru di atas.
                </div>
              ) : (
                <div className="space-y-2">
                  {branchTables.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full shrink-0 ${
                          t.status === "OCCUPIED" ? "bg-amber-400" : "bg-emerald-400"
                        }`} />
                        <div>
                          <div className="text-sm font-medium text-gray-800">Meja {t.number}</div>
                          <div className="text-[10px] text-gray-500">{t.capacity} kursi</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {t.activeOrderCount > 0 && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                            {t.activeOrderCount} order
                          </span>
                        )}
                        {t.activeOrderCount === 0 && (
                          <button
                            onClick={() => {
                              if (confirm(`Hapus meja ${t.number}?`)) deleteTable(t.id);
                            }}
                            className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 shrink-0">
              <button
                onClick={() => setSelectedBranch(null)}
                className="w-full py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========= ADD BRANCH MODAL ========= */}
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

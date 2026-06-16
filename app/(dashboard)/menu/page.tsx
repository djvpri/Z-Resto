"use client";
import { useState, useEffect } from "react";
import { formatRupiah } from "@/lib/format";

type Category = { id: string; name: string };
type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isAvailable: boolean;
  isActive: boolean;
  category: Category | null;
};

const EMPTY_FORM = { name: "", description: "", price: "", categoryId: "", isAvailable: true };

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState("Semua");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/menu");
    const d = await res.json();
    const all: MenuItem[] = d.items || [];
    setItems(all);
    const cats = Array.from(
      new Map(
        all.filter((i) => i.category).map((i) => [i.category!.id, i.category!])
      ).values()
    );
    setCategories(cats);
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowModal(true);
  }

  function openEdit(item: MenuItem) {
    setEditItem(item);
    setForm({
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      categoryId: item.category?.id || "",
      isAvailable: item.isAvailable,
    });
    setError("");
    setShowModal(true);
  }

  async function save() {
    if (!form.name.trim() || !form.price) return;
    setSaving(true);
    setError("");
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: parseInt(form.price, 10),
        categoryId: form.categoryId || null,
        isAvailable: form.isAvailable,
      };
      const res = editItem
        ? await fetch(`/api/menu/${editItem.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/menu", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Gagal menyimpan");
        return;
      }
      setShowModal(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailable(item: MenuItem) {
    await fetch(`/api/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !item.isAvailable }),
    });
    load();
  }

  async function deleteItem(item: MenuItem) {
    if (!confirm(`Hapus "${item.name}"?`)) return;
    await fetch(`/api/menu/${item.id}`, { method: "DELETE" });
    load();
  }

  const filtered =
    filter === "Semua"
      ? items
      : items.filter((i) => (i.category?.name || "Lainnya") === filter);

  const catLabels = ["Semua", ...categories.map((c) => c.name), "Lainnya"].filter(
    (v, i, a) => a.indexOf(v) === i
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kelola Menu</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} item menu</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
        >
          + Tambah Menu
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {catLabels.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
              filter === c
                ? "bg-emerald-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-emerald-300"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Menu list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Nama</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Kategori</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">Harga</th>
              <th className="text-center px-4 py-3 text-gray-500 font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((item) => (
              <tr key={item.id} className={`hover:bg-gray-50/50 ${!item.isActive ? "opacity-40" : ""}`}>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{item.name}</div>
                  {item.description && (
                    <div className="text-xs text-gray-400 truncate max-w-xs">{item.description}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                    {item.category?.name || "Lainnya"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  {formatRupiah(item.price)}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleAvailable(item)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      item.isAvailable
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {item.isAvailable ? "Tersedia" : "Habis"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => openEdit(item)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteItem(item)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">
                  Tidak ada menu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                {editItem ? "Edit Menu" : "Tambah Menu"}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Menu</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Contoh: Nasi Goreng Spesial"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Opsional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Harga (Rp)
                </label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="25000"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Kategori</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Tanpa Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="available"
                  checked={form.isAvailable}
                  onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                  className="w-4 h-4 accent-emerald-600"
                />
                <label htmlFor="available" className="text-sm text-gray-700">
                  Tersedia (tampil di POS)
                </label>
              </div>
              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl">{error}</div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

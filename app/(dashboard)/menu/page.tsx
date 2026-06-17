"use client";
import { useState, useEffect } from "react";
import { formatRupiah } from "@/lib/format";

type Category = { id: string; name: string; _count?: { menuItems: number } };
type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isActive: boolean;
  category: Category | null;
};

const EMPTY_FORM = { name: "", description: "", price: "", categoryId: "", isAvailable: true };

function compressImage(file: File, maxPx = 400, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState("Semua");
  const [showModal, setShowModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState("");
  const [editCat, setEditCat] = useState<{ id: string; name: string } | null>(null);

  async function loadCategories() {
    const res = await fetch("/api/categories");
    const d = await res.json();
    setCategories(d.categories || []);
  }

  async function load() {
    const res = await fetch("/api/menu");
    const d = await res.json();
    setItems(d.items || []);
    await loadCategories();
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setImagePreview(null);
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
    setImagePreview(item.imageUrl || null);
    setError("");
    setShowModal(true);
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Ukuran foto max 5MB"); return; }
    try {
      const compressed = await compressImage(file);
      setImagePreview(compressed);
    } catch {
      setError("Gagal memproses foto");
    }
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
        imageUrl: imagePreview,
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

  async function addCategory() {
    if (!newCatName.trim()) return;
    setCatSaving(true); setCatError("");
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName }),
    });
    const d = await res.json();
    setCatSaving(false);
    if (!res.ok) { setCatError(d.error || "Gagal menambah kategori"); return; }
    setNewCatName("");
    loadCategories();
  }

  async function saveEditCat() {
    if (!editCat || !editCat.name.trim()) return;
    setCatSaving(true); setCatError("");
    const res = await fetch(`/api/categories/${editCat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editCat.name }),
    });
    const d = await res.json();
    setCatSaving(false);
    if (!res.ok) { setCatError(d.error || "Gagal menyimpan"); return; }
    setEditCat(null);
    loadCategories();
  }

  async function deleteCategory(id: string, name: string) {
    if (!confirm(`Hapus kategori "${name}"? Menu yang ada akan dipindah ke "Tanpa Kategori".`)) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    loadCategories();
    load();
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
          <p className="text-sm text-gray-500 mt-0.5">{items.length} item menu · {categories.length} kategori</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowCatModal(true); setCatError(""); setNewCatName(""); setEditCat(null); }}
            className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            🏷️ Kategori
          </button>
          <button
            onClick={openAdd}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            + Tambah Menu
          </button>
        </div>
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
                  <div className="flex items-center gap-3">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0 bg-gray-100" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center text-gray-300 text-lg">🍽️</div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-gray-400 truncate max-w-xs">{item.description}</div>
                      )}
                    </div>
                  </div>
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

      {/* Kategori Modal */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Kelola Kategori</h2>
              <button onClick={() => setShowCatModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <div className="p-5 space-y-4 max-h-96 overflow-y-auto">
              {/* List */}
              {categories.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Belum ada kategori</p>
              )}
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2">
                  {editCat?.id === cat.id ? (
                    <>
                      <input
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={editCat.name}
                        onChange={(e) => setEditCat({ ...editCat, name: e.target.value })}
                        onKeyDown={(e) => e.key === "Enter" && saveEditCat()}
                        autoFocus
                      />
                      <button onClick={saveEditCat} disabled={catSaving} className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50">
                        Simpan
                      </button>
                      <button onClick={() => setEditCat(null)} className="text-xs text-gray-400 hover:text-gray-600">Batal</button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                        <span className="text-xs text-gray-400 ml-2">{cat._count?.menuItems ?? 0} item</span>
                      </div>
                      <button onClick={() => setEditCat({ id: cat.id, name: cat.name })} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                      <button onClick={() => deleteCategory(cat.id, cat.name)} className="text-xs text-red-500 hover:text-red-700 font-medium">Hapus</button>
                    </>
                  )}
                </div>
              ))}
            </div>
            {catError && <p className="text-sm text-red-500 px-5">{catError}</p>}
            {/* Add new */}
            <div className="p-5 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">Tambah Kategori Baru</p>
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="cth. Minuman, Makanan Berat..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                />
                <button
                  onClick={addCategory}
                  disabled={catSaving || !newCatName.trim()}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {catSaving ? "..." : "Tambah"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu Modal */}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Foto Menu</label>
                <div className="flex items-center gap-3">
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="preview" className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
                      <button
                        type="button"
                        onClick={() => setImagePreview(null)}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-600"
                      >✕</button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-gray-300 text-2xl shrink-0">🍽️</div>
                  )}
                  <label className="cursor-pointer flex-1">
                    <div className="border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 text-center hover:border-emerald-400 transition-colors">
                      <div className="text-sm text-gray-500">Klik untuk pilih foto</div>
                      <div className="text-xs text-gray-400 mt-0.5">JPG/PNG, max 5MB — dikompres otomatis</div>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                </div>
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

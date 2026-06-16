"use client";
import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/cart";
import { formatRupiah } from "@/lib/format";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  category: { name: string } | null;
};

type DiningTable = {
  id: string;
  number: string;
  capacity: number;
};

export default function POSPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [orderNotes, setOrderNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const { items, tableId, addItem, updateQty, clearCart, setTable, setNotes, subtotal, tax, total } =
    useCartStore();

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then((d) => setMenuItems(d.items || []));
    fetch("/api/tables")
      .then((r) => r.json())
      .then((d) => setTables(d.tables || []));
  }, []);

  const categories = [
    "Semua",
    ...Array.from(new Set(menuItems.map((m) => m.category?.name || "Lainnya"))),
  ];

  const filtered =
    activeCategory === "Semua"
      ? menuItems.filter((m) => m.isAvailable)
      : menuItems.filter((m) => m.isAvailable && (m.category?.name || "Lainnya") === activeCategory);

  async function placeOrder() {
    if (items.length === 0) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId,
          paymentMethod,
          notes: orderNotes,
          items: items.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            unitPrice: i.price,
            notes: i.notes,
          })),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Gagal memproses order");
        return;
      }
      clearCart();
      setOrderNotes("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full">
      {/* Left: Menu */}
      <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 shrink-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                activeCategory === cat
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-emerald-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 content-start">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => addItem({ menuItemId: item.id, name: item.name, price: item.price })}
              className="bg-white rounded-xl border border-gray-100 p-3 text-left hover:border-emerald-400 hover:shadow-md active:scale-[0.97] transition-all"
            >
              <div className="bg-emerald-50 rounded-lg h-14 flex items-center justify-center text-2xl mb-2.5">
                🍽️
              </div>
              <div className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight">
                {item.name}
              </div>
              <div className="text-emerald-600 font-bold text-xs mt-1.5">{formatRupiah(item.price)}</div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-gray-400 text-sm py-16">
              Tidak ada menu untuk kategori ini
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-72 bg-white border-l border-gray-100 flex flex-col shrink-0">
        {/* Cart header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Pesanan</h2>
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Batal
              </button>
            )}
          </div>
          <select
            value={tableId || ""}
            onChange={(e) => setTable(e.target.value || null)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">🥡 Takeaway</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                🪑 Meja {t.number} ({t.capacity} orang)
              </option>
            ))}
          </select>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🛒</div>
              <p className="text-sm text-gray-400">Pilih menu untuk mulai pesanan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.menuItemId} className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 leading-tight line-clamp-2">
                      {item.name}
                    </div>
                    <div className="text-xs text-emerald-600 font-semibold mt-0.5">
                      {formatRupiah(item.price * item.quantity)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => updateQty(item.menuItemId, item.quantity - 1)}
                      className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.menuItemId, item.quantity + 1)}
                      className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart footer */}
        <div className="p-4 border-t border-gray-100 space-y-3">
          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3 py-2 rounded-lg font-medium">
              ✓ Order berhasil dibuat!
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{formatRupiah(subtotal())}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>PPN 10%</span>
              <span>{formatRupiah(tax())}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1.5 border-t border-gray-100 mt-1.5">
              <span>Total</span>
              <span className="text-emerald-600">{formatRupiah(total())}</span>
            </div>
          </div>

          {/* Notes */}
          <input
            type="text"
            value={orderNotes}
            onChange={(e) => {
              setOrderNotes(e.target.value);
              setNotes(e.target.value);
            }}
            placeholder="Catatan pesanan..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          {/* Payment method */}
          <div className="grid grid-cols-2 gap-1.5">
            {(["CASH", "QRIS", "TRANSFER", "CARD"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setPaymentMethod(m)}
                className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  paymentMethod === m
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {m === "CASH" ? "Tunai" : m === "QRIS" ? "QRIS" : m === "TRANSFER" ? "Transfer" : "Kartu"}
              </button>
            ))}
          </div>

          {/* Place order */}
          <button
            onClick={placeOrder}
            disabled={loading || items.length === 0}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? "Memproses..." : `Bayar ${formatRupiah(total())}`}
          </button>
        </div>
      </div>
    </div>
  );
}

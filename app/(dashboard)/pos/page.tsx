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

type ReceiptItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type Receipt = {
  orderNumber: string;
  paidAt: string;
  paymentMethod: string;
  tableNumber: string | null;
  items: ReceiptItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  taxRate: number;
  tenantName: string;
  notes?: string;
};

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Tunai",
  QRIS: "QRIS",
  TRANSFER: "Transfer Bank",
  CARD: "Kartu Debit/Kredit",
};

export default function POSPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [orderNotes, setOrderNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tenantName, setTenantName] = useState("Z-Resto");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const { items, tableId, addItem, updateQty, clearCart, setTable, setNotes, setTaxRate, subtotal, tax, total, taxRate } =
    useCartStore();

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then((d) => setMenuItems(d.items || []));
    fetch("/api/tables")
      .then((r) => r.json())
      .then((d) => setTables(d.tables || []));
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.taxRate !== undefined) setTaxRate(d.settings.taxRate);
        if (d.settings?.name) setTenantName(d.settings.name);
      });
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
      const data = await res.json();
      const order = data.order;
      const selectedTable = tables.find((t) => t.id === tableId);

      setReceipt({
        orderNumber: order.orderNumber,
        paidAt: order.paidAt,
        paymentMethod: order.paymentMethod,
        tableNumber: selectedTable?.number ?? null,
        items: order.items.map(
          (i: { menuItem: { name: string }; quantity: number; unitPrice: number; subtotal: number }) => ({
            name: i.menuItem.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            subtotal: i.subtotal,
          })
        ),
        subtotal: order.subtotal,
        taxAmount: order.taxAmount,
        totalAmount: order.totalAmount,
        taxRate,
        tenantName,
        notes: order.notes,
      });

      clearCart();
      setOrderNotes("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .receipt-content, .receipt-content * { visibility: visible !important; }
          .receipt-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            padding: 4mm !important;
          }
        }
      `}</style>

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
                <span>PPN {taxRate}%</span>
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

      {/* Receipt Modal */}
      {receipt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800 text-sm">Struk Pembayaran</h2>
              <button
                onClick={() => setReceipt(null)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {/* Receipt content — this area is printed */}
            <div className="receipt-content px-5 py-4 font-mono text-[11px] text-gray-800 max-h-[60vh] overflow-y-auto">
              {/* Header */}
              <div className="text-center mb-3">
                <div className="font-bold text-sm tracking-wide">{receipt.tenantName}</div>
                <div className="text-gray-500 text-[10px] mt-0.5">
                  {new Date(receipt.paidAt).toLocaleString("id-ID", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              <div className="border-t border-dashed border-gray-300 my-2.5" />

              {/* Order info */}
              <div className="space-y-0.5 mb-2.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">No. Order</span>
                  <span className="font-semibold">{receipt.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Meja</span>
                  <span>{receipt.tableNumber ? `Meja ${receipt.tableNumber}` : "Takeaway"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pembayaran</span>
                  <span>{PAYMENT_LABEL[receipt.paymentMethod] || receipt.paymentMethod}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-300 my-2.5" />

              {/* Items */}
              <div className="space-y-2 mb-2.5">
                {receipt.items.map((item, i) => (
                  <div key={i}>
                    <div className="font-medium leading-tight">{item.name}</div>
                    <div className="flex justify-between text-gray-500 mt-0.5">
                      <span>
                        {item.quantity} x {formatRupiah(item.unitPrice)}
                      </span>
                      <span className="text-gray-800 font-medium">{formatRupiah(item.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-gray-300 my-2.5" />

              {/* Totals */}
              <div className="space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatRupiah(receipt.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">PPN {receipt.taxRate}%</span>
                  <span>{formatRupiah(receipt.taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1.5 mt-1 border-t border-gray-200">
                  <span>TOTAL</span>
                  <span>{formatRupiah(receipt.totalAmount)}</span>
                </div>
              </div>

              {receipt.notes && (
                <>
                  <div className="border-t border-dashed border-gray-300 my-2.5" />
                  <div className="text-gray-500 text-[10px]">Catatan: {receipt.notes}</div>
                </>
              )}

              <div className="border-t border-dashed border-gray-300 my-2.5" />

              <div className="text-center text-gray-400 text-[10px] leading-relaxed">
                Terima kasih atas kunjungan Anda
                <br />
                Powered by Z-Resto
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 p-4 border-t border-gray-100">
              <button
                onClick={() => setReceipt(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                🖨️ Cetak
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

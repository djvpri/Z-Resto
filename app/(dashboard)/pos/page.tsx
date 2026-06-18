"use client";
import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/cart";
import { formatRupiah } from "@/lib/format";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  category: { name: string } | null;
};

type DiningTable = {
  id: string;
  number: string;
  capacity: number;
  status: string;
  activeOrderCount: number;
  activeOrderTotal: number;
  firstOrderAt: string | null;
};

type ReceiptItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type ActiveShift = {
  id: string;
  openedAt: string;
  user: { name: string };
  openingCash: number;
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
  paidAmount?: number;
  change?: number;
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
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [showOpenShift, setShowOpenShift] = useState(false);
  const [openingCash, setOpeningCash] = useState("");
  const [shiftLoading, setShiftLoading] = useState(false);
  const [paidAmount, setPaidAmount] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [view, setView] = useState<"menu" | "tables">("menu");
  const [showTableDetail, setShowTableDetail] = useState<DiningTable | null>(null);
  const [tableHistory, setTableHistory] = useState<any[]>([]);
  const [showManageTables, setShowManageTables] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState("4");
  const [tableError, setTableError] = useState("");
  const [userRole, setUserRole] = useState<string>("");
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [reserveForm, setReserveForm] = useState({ customerName: "", phone: "", partySize: "2", tableId: "", reserveAt: "", duration: "120", notes: "" });
  const [reserveError, setReserveError] = useState("");
  const [tableTab, setTableTab] = useState<"layout" | "reservations">("layout");

  const { items, tableId, tableInfo, addItem, updateQty, clearCart, setTable, setNotes, setTaxRate, subtotal, tax, total, taxRate, activeOrderId, setActiveOrderId } =
    useCartStore();

  function tableDuration(firstOrderAt: string | null) {
    if (!firstOrderAt) return null;
    const ms = Date.now() - new Date(firstOrderAt).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (h > 0) return `${h}j ${m}m`;
    if (m > 0) return `${m}m ${s}d`;
    return `${s}d`;
  }

  function handleSelectTable(table: DiningTable) {
    if (table.status === "OCCUPIED" && table.activeOrderCount > 0) {
      setShowTableDetail(table);
    } else {
      startNewOrder(table);
    }
  }

  function startNewOrder(table: DiningTable) {
    setTable(table.id, table);
    setActiveOrderId(null);
    clearCart();
    setTable(table.id, table);
    setView("menu");
    setShowCart(true);
    setShowTableDetail(null);
  }

  function addMoreToOrder(table: DiningTable) {
    // Load order aktif dari meja ini
    setTable(table.id, table);
    clearCart();
    setTable(table.id, table);
    // Ambil order PENDING dari meja
    fetch(`/api/orders?tableId=${table.id}`)
      .then((r) => r.json())
      .then((d) => {
        const pending = d.orders?.find((o: any) => o.status === "PENDING");
        setActiveOrder(pending || null);
      });
    setView("menu");
    setShowCart(true);
    setShowTableDetail(null);
  }

  async function cancelOrderItem(orderId: string, itemId: string) {
    if (!confirm("Batalkan item ini?")) return;
    const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      const d = await res.json();
      if (d.cancelled) {
        // Order dibatalkan (tidak ada item tersisa)
        setActiveOrder(null);
        refreshTables();
      } else if (d.order) {
        setActiveOrder(d.order);
        refreshTables();
      }
    } else {
      const d = await res.json();
      alert(d.error || "Gagal membatalkan item");
    }
  }

  async function voidEntireOrder(orderId: string) {
    if (!confirm("Batalkan SEMUA pesanan di meja ini?")) return;
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "void", reason: "Dibatalkan oleh kasir" }),
    });
    if (res.ok) {
      setActiveOrder(null);
      refreshTables();
    } else {
      const d = await res.json();
      alert(d.error || "Gagal membatalkan order");
    }
  }

  async function addTable() {
    if (!newTableNumber.trim()) return;
    setTableError("");
    const res = await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: newTableNumber.trim(), capacity: Number(newTableCapacity) || 4 }),
    });
    if (res.ok) {
      const d = await res.json();
      setTables((prev) => [...prev, { ...d.table, status: "AVAILABLE", activeOrderCount: 0, activeOrderTotal: 0, firstOrderAt: null }]);
      setNewTableNumber("");
      setNewTableCapacity("4");
    } else {
      const d = await res.json();
      setTableError(d.error || "Gagal tambah meja");
    }
  }

  async function deleteTable(tableId: string) {
    const res = await fetch(`/api/tables/${tableId}`, { method: "DELETE" });
    if (res.ok) {
      setTables((prev) => prev.filter((t) => t.id !== tableId));
      setShowTableDetail(null);
    } else {
      const d = await res.json();
      alert(d.error || "Gagal hapus meja");
    }
  }

  function refreshTables() {
    fetch("/api/tables")
      .then((r) => r.json())
      .then((d) => setTables(d.tables || []));
  }

  function loadReservations() {
    const today = new Date().toISOString().slice(0, 10);
    fetch(`/api/reservations?date=${today}`)
      .then((r) => r.json())
      .then((d) => setReservations(d.reservations || []));
  }

  async function createReservation() {
    setReserveError("");
    const { customerName, phone, partySize, tableId, reserveAt, duration, notes } = reserveForm;
    if (!customerName || !reserveAt || !partySize) {
      setReserveError("Nama, waktu, dan jumlah tamu wajib diisi");
      return;
    }
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName,
        phone: phone || undefined,
        partySize: Number(partySize),
        tableId: tableId || undefined,
        reserveAt: new Date(reserveAt).toISOString(),
        duration: Number(duration),
        notes: notes || undefined,
      }),
    });
    if (res.ok) {
      setShowReserveModal(false);
      setReserveForm({ customerName: "", phone: "", partySize: "2", tableId: "", reserveAt: "", duration: "120", notes: "" });
      loadReservations();
      refreshTables();
    } else {
      const d = await res.json();
      setReserveError(d.error || "Gagal membuat reservasi");
    }
  }

  async function reservationAction(id: string, action: string) {
    const res = await fetch(`/api/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      loadReservations();
      refreshTables();
    } else {
      const d = await res.json();
      alert(d.error || "Gagal");
    }
  }

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
    fetch("/api/shifts")
      .then((r) => r.json())
      .then((d) => setActiveShift(d.active || null));
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.user?.role) setUserRole(d.user.role); })
      .catch(() => {});
    loadReservations();
  }, []);

  async function openShift() {
    setShiftLoading(true);
    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingCash: Number(openingCash) || 0 }),
    });
    if (res.ok) {
      const d = await res.json();
      setActiveShift(d.shift);
      setShowOpenShift(false);
      setOpeningCash("");
    }
    setShiftLoading(false);
  }

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
          paymentMethod: tableId ? null : paymentMethod,
          notes: orderNotes,
          paidAmount: paymentMethod === "CASH" ? Number(paidAmount) : total(),
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

      // Jika meja (order bertahap) — tampilkan notifikasi saja
      if (tableId) {
        setReceipt({
          orderNumber: order.orderNumber,
          paidAt: new Date().toISOString(),
          paymentMethod: "-",
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
      } else {
        // Takeaway — langsung bayar
        const changeAmount = paymentMethod === "CASH" ? Number(paidAmount) - order.totalAmount : 0;
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
          paidAmount: paymentMethod === "CASH" ? Number(paidAmount) : order.totalAmount,
          change: changeAmount,
        });
      }

      clearCart();
      setOrderNotes("");
      setPaidAmount("");
      refreshTables();
    } finally {
      setLoading(false);
    }
  }

  async function payOrder(orderId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pay",
          paymentMethod,
        }),
      });
      if (res.ok) {
        setReceipt(null);
        refreshTables();
      }
    } finally {
      setLoading(false);
    }
  }

  async function payAllTable() {
    if (!tableId) return;
    setLoading(true);
    try {
      // Cari order PENDING di meja ini
      const ordersRes = await fetch(`/api/orders?tableId=${tableId}`);
      const ordersData = await ordersRes.json();
      const pendingOrders = ordersData.orders?.filter((o: any) => o.status === "PENDING") || [];

      if (pendingOrders.length === 0) {
        setError("Tidak ada order yang perlu dibayar");
        return;
      }

      // Bayar semua
      const payRes = await fetch(`/api/orders/${pendingOrders[0].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "payAll", paymentMethod }),
      });

      if (payRes.ok) {
        const d = await payRes.json();
        const selectedTable = tables.find((t) => t.id === tableId);

        // Tampilkan struk dengan detail semua item
        setReceipt({
          orderNumber: d.orderNumbers.join(", "),
          paidAt: new Date().toISOString(),
          paymentMethod,
          tableNumber: selectedTable?.number ?? null,
          items: d.items || [],
          subtotal: d.totalSubtotal || d.totalAmount,
          taxAmount: d.totalTax || 0,
          totalAmount: d.totalAmount,
          taxRate,
          tenantName,
        });
        clearCart();
        refreshTables();
      }
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

      {/* Shift banner */}
      {!activeShift ? (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center justify-between shrink-0">
          <span className="text-xs text-amber-700 font-medium">Belum ada shift aktif — buka shift sebelum mulai transaksi</span>
          <button
            onClick={() => setShowOpenShift(true)}
            className="text-xs font-bold text-amber-700 hover:text-amber-900 border border-amber-300 px-3 py-1 rounded-lg hover:bg-amber-100 transition-colors ml-4 shrink-0"
          >
            Buka Shift
          </button>
        </div>
      ) : (
        <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 flex items-center justify-between shrink-0">
          <span className="text-xs text-emerald-700">
            Shift aktif · {activeShift.user.name} · sejak{" "}
            {new Date(activeShift.openedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <a href="/shift" className="text-xs font-semibold text-emerald-700 hover:underline ml-4 shrink-0">
            Kelola Shift →
          </a>
        </div>
      )}

      {/* Mobile cart toggle button */}
      <button
        onClick={() => setShowCart(true)}
        className="lg:hidden fixed bottom-4 right-4 z-40 bg-emerald-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-emerald-700 active:scale-95 transition-all"
      >
        <span className="text-xl">🛒</span>
        {items.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
            {items.reduce((s, i) => s + i.quantity, 0)}
          </span>
        )}
      </button>

      {/* View toggle: Menu | Meja */}
      <div className="flex border-b border-gray-100 shrink-0">
        <button
          onClick={() => setView("menu")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            view === "menu" ? "text-emerald-600 border-b-2 border-emerald-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          🍽️ Menu
        </button>
        <button
          onClick={() => setView("tables")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            view === "tables" ? "text-emerald-600 border-b-2 border-emerald-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          🪑 Meja
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* VIEW: MENU */}
        {view === "menu" && (
          <>
            {/* Left: Menu */}
            <div className="flex-1 flex flex-col overflow-hidden p-3 lg:p-4 gap-2 lg:gap-3">
              {/* Category tabs */}
              <div className="flex gap-1.5 lg:gap-2 overflow-x-auto pb-1 shrink-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-2.5 lg:px-3 py-1.5 rounded-full text-xs lg:text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
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
              <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 lg:gap-2.5 content-start">
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addItem({ menuItemId: item.id, name: item.name, price: item.price })}
                    className="bg-white rounded-xl border border-gray-100 p-2 lg:p-3 text-left hover:border-emerald-400 hover:shadow-md active:scale-[0.97] transition-all"
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="rounded-lg h-12 lg:h-14 w-full object-cover mb-2"
                      />
                    ) : (
                      <div className="bg-emerald-50 rounded-lg h-12 lg:h-14 flex items-center justify-center text-xl lg:text-2xl mb-2">
                        🍽️
                      </div>
                    )}
                    <div className="text-[10px] lg:text-xs font-semibold text-gray-800 line-clamp-2 leading-tight">
                      {item.name}
                    </div>
                    <div className="text-emerald-600 font-bold text-[10px] lg:text-xs mt-1 lg:mt-1.5">{formatRupiah(item.price)}</div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="col-span-full text-center text-gray-400 text-sm py-16">
                    Tidak ada menu untuk kategori ini
                  </div>
                )}
              </div>
            </div>

            {/* Right: Cart - Desktop (side panel) */}
            <div className="hidden lg:flex w-72 bg-white border-l border-gray-100 flex-col shrink-0">

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
            {tableInfo ? (
              <div className="bg-emerald-50 rounded-xl px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>🪑</span>
                  <div>
                    <div className="text-sm font-medium text-gray-800">Meja {tableInfo.number}</div>
                    {tableInfo.status === "OCCUPIED" && tableInfo.activeOrderCount > 0 && (
                      <div className="text-[10px] text-amber-600">
                        {tableInfo.activeOrderCount} order aktif · {formatRupiah(tableInfo.activeOrderTotal)}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => { setTable(null); setActiveOrderId(null); }}
                  className="text-xs text-gray-400 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            ) : (
              <select
                value={tableId || ""}
                onChange={(e) => {
                  const t = tables.find((t) => t.id === e.target.value);
                  setTable(e.target.value || null, t || null);
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">🥡 Takeaway</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    🪑 Meja {t.number} ({t.capacity} orang) {t.status === "OCCUPIED" ? "⚠️ Terisi" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Order aktif dari meja (sebelumnya sudah di-order) */}
            {tableId && activeOrder && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                    📋 Order Aktif ({activeOrder.orderNumber})
                  </h3>
                  <span className="text-xs font-bold text-amber-700">
                    {formatRupiah(activeOrder.totalAmount)}
                  </span>
                </div>
                <div className="space-y-2">
                  {activeOrder.items?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-800 truncate">
                          {item.menuItem?.name || item.name} x{item.quantity}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {formatRupiah(item.unitPrice)} × {item.quantity} = {formatRupiah(item.subtotal)}
                        </div>
                      </div>
                      <button
                        onClick={() => cancelOrderItem(activeOrder.id, item.id)}
                        className="text-red-400 hover:text-red-600 text-xs ml-2 shrink-0 px-1"
                        title="Batalkan item ini"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => voidEntireOrder(activeOrder.id)}
                    className="text-[10px] text-red-400 hover:text-red-600"
                  >
                    🗑️ Batalkan Semua
                  </button>
                </div>
                <div className="border-t border-dashed border-gray-200 mt-3 mb-3" />
              </div>
            )}

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

            {/* Paid amount input (CASH only) */}
            {paymentMethod === "CASH" && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-600">Dibayarkan (Rp)</label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {paidAmount && Number(paidAmount) >= total() && (
                  <div className="flex justify-between items-center bg-emerald-50 rounded-xl px-3 py-2">
                    <span className="text-xs font-medium text-emerald-700">Kembali</span>
                    <span className="text-sm font-bold text-emerald-700">
                      {formatRupiah(Number(paidAmount) - total())}
                    </span>
                  </div>
                )}
                {paidAmount && Number(paidAmount) > 0 && Number(paidAmount) < total() && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-xs px-3 py-2 rounded-xl">
                    Nominal kurang dari total
                  </div>
                )}
              </div>
            )}

            {/* Place order */}
            {tableId ? (
              <div className="space-y-2">
                <button
                  onClick={placeOrder}
                  disabled={loading || items.length === 0}
                  className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  {loading ? "Menyimpan..." : `📝 Simpan ke Meja (${formatRupiah(total())})`}
                </button>
                <button
                  onClick={payAllTable}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-40 shadow-sm"
                >
                  {loading ? "Memproses..." : `💳 Bayar Semua`}
                </button>
              </div>
            ) : (
              <button
                onClick={placeOrder}
                disabled={loading || items.length === 0 || (paymentMethod === "CASH" && (!paidAmount || Number(paidAmount) < total()))}
                className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? "Memproses..." : `Bayar ${formatRupiah(total())}`}
              </button>
            )}
          </div>
        </div>
          </>
        )}

        {/* VIEW: TABLES */}
        {view === "tables" && (
          <div className="flex-1 p-4 overflow-y-auto">
            {/* Sub tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTableTab("layout")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  tableTab === "layout" ? "bg-emerald-600 text-white" : "bg-white text-gray-600 border border-gray-200"
                }`}
              >
                🪑 Layout Meja
              </button>
              <button
                onClick={() => { setTableTab("reservations"); loadReservations(); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  tableTab === "reservations" ? "bg-emerald-600 text-white" : "bg-white text-gray-600 border border-gray-200"
                }`}
              >
                📅 Reservasi {reservations.filter((r) => r.status === "PENDING" || r.status === "CONFIRMED").length > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {reservations.filter((r) => r.status === "PENDING" || r.status === "CONFIRMED").length}
                  </span>
                )}
              </button>
              {["OWNER", "MANAGER"].includes(userRole) && (
                <button
                  onClick={() => setShowReserveModal(true)}
                  className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  + Reservasi
                </button>
              )}
            </div>

            {/* Tab: Layout Meja */}
            {tableTab === "layout" && (
              <>
                {/* Legend */}
                <div className="flex gap-4 mb-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    <span className="text-gray-600">Kosong</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <span className="text-gray-600">Terisi</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <span className="text-gray-600">Reservasi</span>
                  </div>
                </div>

            {/* Table grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {tables.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTable(t)}
                  className={`relative p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                    t.status === "OCCUPIED"
                      ? "border-amber-300 bg-amber-50 hover:shadow-md"
                      : t.status === "RESERVED"
                      ? "border-red-300 bg-red-50 hover:shadow-md"
                      : "border-emerald-200 bg-emerald-50 hover:border-emerald-400 hover:shadow-md"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">
                      {t.status === "OCCUPIED" ? "🍽️" : "🪑"}
                    </div>
                    <div className="font-bold text-sm text-gray-800">{t.number}</div>
                    <div className="text-[10px] text-gray-500">{t.capacity} kursi</div>
                    {t.status === "OCCUPIED" && (
                      <div className="mt-2 space-y-0.5">
                        <div className="text-[10px] font-medium text-amber-700">
                          {t.activeOrderCount} order · {formatRupiah(t.activeOrderTotal)}
                        </div>
                        {t.firstOrderAt && (
                          <div className="text-[10px] text-amber-600">
                            ⏱️ {tableDuration(t.firstOrderAt)}
                          </div>
                        )}
                      </div>
                    )}
                    {t.status === "AVAILABLE" && (
                      <div className="text-[10px] text-emerald-600 mt-1">Siap</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
              </>
            )}

            {/* Tab: Reservasi Hari Ini */}
            {tableTab === "reservations" && (
              <div className="space-y-3">
                {reservations.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 text-sm">
                    <div className="text-4xl mb-3">📅</div>
                    Belum ada reservasi hari ini
                  </div>
                ) : (
                  reservations.map((r) => (
                    <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-gray-800">{r.customerName}</div>
                          <div className="text-xs text-gray-500">
                            {r.phone && `${r.phone} · `}{r.partySize} tamu
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          r.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                          r.status === "CONFIRMED" ? "bg-blue-100 text-blue-700" :
                          r.status === "SEATED" ? "bg-emerald-100 text-emerald-700" :
                          r.status === "CANCELLED" ? "bg-red-100 text-red-700" :
                          r.status === "NO_SHOW" ? "bg-gray-100 text-gray-700" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          {r.status === "PENDING" ? "Menunggu" :
                           r.status === "CONFIRMED" ? "Dikonfirmasi" :
                           r.status === "SEATED" ? "Duduk" :
                           r.status === "CANCELLED" ? "Batal" :
                           r.status === "NO_SHOW" ? "Tidak Datang" : r.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        🕐 {new Date(r.reserveAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        {r.table && ` · 🪑 Meja ${r.table.number}`}
                        {` · ${r.duration} menit`}
                      </div>
                      {r.notes && <div className="text-xs text-gray-400 italic">{r.notes}</div>}
                      {/* Aksi */}
                      <div className="flex gap-2 pt-1">
                        {r.status === "PENDING" && (
                          <>
                            <button onClick={() => reservationAction(r.id, "confirm")} className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">✅ Konfirmasi</button>
                            <button onClick={() => reservationAction(r.id, "cancel")} className="text-[10px] px-2 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">✕ Batal</button>
                          </>
                        )}
                        {r.status === "CONFIRMED" && (
                          <>
                            <button onClick={() => reservationAction(r.id, "checkin")} className="text-[10px] px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100">🪑 Check-in</button>
                            <button onClick={() => reservationAction(r.id, "cancel")} className="text-[10px] px-2 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">✕ Batal</button>
                          </>
                        )}
                        {r.status === "PENDING" && (
                          <button onClick={() => reservationAction(r.id, "noShow")} className="text-[10px] px-2 py-1 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200">🚫 Tidak Datang</button>
                        )}
                        {["OWNER", "MANAGER"].includes(userRole) && (r.status === "PENDING" || r.status === "CONFIRMED") && (
                          <button
                            onClick={async () => {
                              if (confirm("Hapus reservasi ini?")) {
                                await fetch(`/api/reservations/${r.id}`, { method: "DELETE" });
                                loadReservations();
                              }
                            }}
                            className="text-[10px] px-2 py-1 text-gray-400 hover:text-red-500 ml-auto"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table Detail Modal */}
      {showTableDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50 p-0 lg:p-4">
          <div className="bg-white rounded-t-2xl lg:rounded-2xl w-full max-w-sm shadow-xl max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Meja {showTableDetail.number}</h2>
                <p className="text-xs text-gray-500">{showTableDetail.capacity} kursi</p>
              </div>
              <button onClick={() => setShowTableDetail(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {showTableDetail.status === "OCCUPIED" && showTableDetail.activeOrderCount > 0 ? (
                <>
                  <div className="bg-amber-50 rounded-xl p-3 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Order Aktif</span>
                      <span className="font-medium">{showTableDetail.activeOrderCount} order</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Belum Bayar</span>
                      <span className="font-bold text-amber-700">{formatRupiah(showTableDetail.activeOrderTotal)}</span>
                    </div>
                    {showTableDetail.firstOrderAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Durasi</span>
                        <span>{tableDuration(showTableDetail.firstOrderAt)}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => addMoreToOrder(showTableDetail)}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
                  >
                    ➕ Tambah Pesanan Lagi
                  </button>
                  <button
                    onClick={() => {
                      setTable(showTableDetail.id, showTableDetail);
                      payAllTable();
                      setShowTableDetail(null);
                    }}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
                  >
                    💳 Bayar Semua ({formatRupiah(showTableDetail.activeOrderTotal)})
                  </button>
                </>
              ) : (
                <button
                  onClick={() => startNewOrder(showTableDetail)}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
                >
                  🪑 Mulai Order di Meja Ini
                </button>
              )}
              {showTableDetail.status !== "OCCUPIED" && ["OWNER", "MANAGER"].includes(userRole) && (
                <button
                  onClick={() => {
                    if (confirm(`Hapus meja ${showTableDetail.number}?`)) {
                      deleteTable(showTableDetail.id);
                    }
                  }}
                  className="w-full py-3 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
                >
                  🗑️ Hapus Meja
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reservasi Modal */}
      {showReserveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50 p-0 lg:p-4">
          <div className="bg-white rounded-t-2xl lg:rounded-2xl w-full max-w-md shadow-xl max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Buat Reservasi</h2>
              <button onClick={() => setShowReserveModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pelanggan *</label>
                <input type="text" value={reserveForm.customerName} onChange={(e) => setReserveForm({ ...reserveForm, customerName: e.target.value })}
                  placeholder="Nama tamu" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No. HP</label>
                  <input type="tel" value={reserveForm.phone} onChange={(e) => setReserveForm({ ...reserveForm, phone: e.target.value })}
                    placeholder="08xxx" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Tamu *</label>
                  <input type="number" value={reserveForm.partySize} onChange={(e) => setReserveForm({ ...reserveForm, partySize: e.target.value })}
                    min="1" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Waktu *</label>
                  <input type="datetime-local" value={reserveForm.reserveAt} onChange={(e) => setReserveForm({ ...reserveForm, reserveAt: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durasi (menit)</label>
                  <select value={reserveForm.duration} onChange={(e) => setReserveForm({ ...reserveForm, duration: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="60">1 jam</option>
                    <option value="90">1.5 jam</option>
                    <option value="120">2 jam</option>
                    <option value="180">3 jam</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Meja (opsional)</label>
                <select value={reserveForm.tableId} onChange={(e) => setReserveForm({ ...reserveForm, tableId: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">Belum ditentukan</option>
                  {tables.filter((t) => t.status === "AVAILABLE").map((t) => (
                    <option key={t.id} value={t.id}>Meja {t.number} ({t.capacity} kursi)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea value={reserveForm.notes} onChange={(e) => setReserveForm({ ...reserveForm, notes: e.target.value })}
                  placeholder="Contoh: Ulang tahun, kursi bayi..." rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>
              {reserveError && <div className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{reserveError}</div>}
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-2">
              <button onClick={() => setShowReserveModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Batal</button>
              <button onClick={createReservation} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors">📅 Simpan Reservasi</button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Tables Modal */}
      {showManageTables && (
        <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50 p-0 lg:p-4">
          <div className="bg-white rounded-t-2xl lg:rounded-2xl w-full max-w-md shadow-xl max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Kelola Meja</h2>
              <button onClick={() => { setShowManageTables(false); refreshTables(); }} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {/* Form tambah meja */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Tambah Meja Baru</h3>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Nomor Meja</label>
                    <input
                      type="text"
                      value={newTableNumber}
                      onChange={(e) => setNewTableNumber(e.target.value)}
                      placeholder="Contoh: 1, VIP-A"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="w-20">
                    <label className="block text-xs text-gray-500 mb-1">Kursi</label>
                    <input
                      type="number"
                      value={newTableCapacity}
                      onChange={(e) => setNewTableCapacity(e.target.value)}
                      min="1"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    onClick={addTable}
                    disabled={!newTableNumber.trim()}
                    className="self-end px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                  >
                    + Tambah
                  </button>
                </div>
                {tableError && (
                  <div className="text-xs text-red-500 mt-2">{tableError}</div>
                )}
              </div>

              {/* Daftar meja */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Daftar Meja ({tables.length})</h3>
                {tables.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        t.status === "OCCUPIED" ? "bg-amber-400" : t.status === "RESERVED" ? "bg-red-400" : "bg-emerald-400"
                      }`} />
                      <div>
                        <div className="text-sm font-medium text-gray-800">Meja {t.number}</div>
                        <div className="text-[10px] text-gray-500">{t.capacity} kursi</div>
                      </div>
                    </div>
                    {t.status === "OCCUPIED" ? (
                      <span className="text-[10px] text-amber-600 font-medium">Terisi</span>
                    ) : ["OWNER", "MANAGER"].includes(userRole) ? (
                      <button
                        onClick={() => {
                          if (confirm(`Hapus meja ${t.number}?`)) {
                            deleteTable(t.id);
                          }
                        }}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50"
                      >
                        Hapus
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Cart - Slide up panel */}
      {showCart && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCart(false)}
          />
          {/* Panel */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-800">Pesanan</h2>
                {items.length > 0 && (
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {items.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Batal
                  </button>
                )}
                <button
                  onClick={() => setShowCart(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Table selector */}
            <div className="px-4 pt-3 pb-2">
              {tableInfo ? (
                <div className="bg-emerald-50 rounded-xl px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>🪑</span>
                    <div>
                      <div className="text-sm font-medium text-gray-800">Meja {tableInfo.number}</div>
                      {tableInfo.status === "OCCUPIED" && tableInfo.activeOrderCount > 0 && (
                        <div className="text-[10px] text-amber-600">
                          {tableInfo.activeOrderCount} order aktif · {formatRupiah(tableInfo.activeOrderTotal)}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => { setTable(null); setActiveOrderId(null); }}
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <select
                  value={tableId || ""}
                  onChange={(e) => {
                    const t = tables.find((t) => t.id === e.target.value);
                    setTable(e.target.value || null, t || null);
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">🥡 Takeaway</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      🪑 Meja {t.number} ({t.capacity} orang) {t.status === "OCCUPIED" ? "⚠️ Terisi" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {/* Order aktif dari meja */}
              {tableId && activeOrder && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                      📋 Order Aktif
                    </h3>
                    <span className="text-xs font-bold text-amber-700">
                      {formatRupiah(activeOrder.totalAmount)}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {activeOrder.items?.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-1.5">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-800 truncate">
                            {item.menuItem?.name || item.name} x{item.quantity}
                          </div>
                        </div>
                        <button
                          onClick={() => cancelOrderItem(activeOrder.id, item.id)}
                          className="text-red-400 hover:text-red-600 text-xs ml-2 shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-dashed border-gray-200 mt-2 mb-2" />
                </div>
              )}

              {items.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">🛒</div>
                  <p className="text-xs text-gray-400">Pilih menu untuk mulai pesanan</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.menuItemId} className="flex items-start gap-2 py-1.5">
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
                          className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.menuItemId, item.quantity + 1)}
                          className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 space-y-2.5">
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

              {/* Paid amount input (CASH only) */}
              {paymentMethod === "CASH" && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600">Dibayarkan (Rp)</label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {paidAmount && Number(paidAmount) >= total() && (
                    <div className="flex justify-between items-center bg-emerald-50 rounded-xl px-3 py-2">
                      <span className="text-xs font-medium text-emerald-700">Kembali</span>
                      <span className="text-sm font-bold text-emerald-700">
                        {formatRupiah(Number(paidAmount) - total())}
                      </span>
                    </div>
                  )}
                  {paidAmount && Number(paidAmount) > 0 && Number(paidAmount) < total() && (
                    <div className="bg-red-50 border border-red-100 text-red-600 text-xs px-3 py-2 rounded-xl">
                      Nominal kurang dari total
                    </div>
                  )}
                </div>
              )}

              {/* Place order */}
              {tableId ? (
                <div className="space-y-2">
                  <button
                    onClick={placeOrder}
                    disabled={loading || items.length === 0}
                    className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    {loading ? "Menyimpan..." : `📝 Simpan ke Meja (${formatRupiah(total())})`}
                  </button>
                  <button
                    onClick={payAllTable}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-40 shadow-sm"
                  >
                    {loading ? "Memproses..." : `💳 Bayar Semua`}
                  </button>
                </div>
              ) : (
                <button
                  onClick={placeOrder}
                  disabled={loading || items.length === 0 || (paymentMethod === "CASH" && (!paidAmount || Number(paidAmount) < total()))}
                  className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  {loading ? "Memproses..." : `Bayar ${formatRupiah(total())}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receipt && (
        <div className="fixed inset-0 bg-black/60 flex items-end lg:items-center justify-center z-50 p-0 lg:p-4">
          <div className="bg-white rounded-t-2xl lg:rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden max-h-[90vh] flex flex-col">
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

              {/* Payment info (CASH only) */}
              {receipt.paymentMethod === "CASH" && receipt.paidAmount !== undefined && (
                <>
                  <div className="border-t border-dashed border-gray-300 my-2.5" />
                  <div className="space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Dibayar</span>
                      <span>{formatRupiah(receipt.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm pt-1.5 mt-1 border-t border-gray-200">
                      <span>Kembali</span>
                      <span>{formatRupiah(receipt.change || 0)}</span>
                    </div>
                  </div>
                </>
              )}

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

      {/* Buka Shift Modal */}
      {showOpenShift && (
        <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50 p-0 lg:p-4">
          <div className="bg-white rounded-t-2xl lg:rounded-2xl w-full max-w-sm shadow-xl">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Buka Shift</h2>
              <p className="text-xs text-gray-500 mt-0.5">Hitung uang di laci sebelum mulai</p>
            </div>
            <div className="p-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Modal Awal (Rp)</label>
              <input
                type="number"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => setShowOpenShift(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={openShift}
                disabled={shiftLoading}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
              >
                {shiftLoading ? "Membuka..." : "Buka Shift"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

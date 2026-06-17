"use client";
import { useState, useEffect, useCallback } from "react";
import { formatRupiah, formatDate } from "@/lib/format";

type OrderItem = {
  id: string;
  menuItem: { name: string };
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string;
  cashier: { name: string };
  table: { number: string } | null;
  items: OrderItem[];
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Menunggu",
  CONFIRMED: "Dikonfirmasi",
  READY: "Siap",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatal",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  READY: "bg-purple-100 text-purple-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-600",
};

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Tunai",
  QRIS: "QRIS",
  TRANSFER: "Transfer",
  CARD: "Kartu",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [userRole, setUserRole] = useState<string>("");

  // void state
  const [voidReason, setVoidReason] = useState("");
  const [voidLoading, setVoidLoading] = useState(false);
  const [voidError, setVoidError] = useState("");
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [ordersRes, meRes] = await Promise.all([
      fetch("/api/orders"),
      fetch("/api/auth/me"),
    ]);
    const ordersData = await ordersRes.json();
    const meData = await meRes.json();
    setOrders(ordersData.orders || []);
    setUserRole(meData.user?.role || "");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered =
    statusFilter === "ALL" ? orders : orders.filter((o) => o.status === statusFilter);

  async function voidOrder() {
    if (!selected) return;
    setVoidLoading(true);
    setVoidError("");
    const res = await fetch(`/api/orders/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "void", reason: voidReason }),
    });
    if (res.ok) {
      const d = await res.json();
      setOrders((prev) => prev.map((o) => (o.id === selected.id ? { ...o, ...d.order } : o)));
      setSelected({ ...selected, status: "CANCELLED" });
      setShowVoidConfirm(false);
      setVoidReason("");
    } else {
      const d = await res.json();
      setVoidError(d.error || "Gagal membatalkan order");
    }
    setVoidLoading(false);
  }

  const canVoid = userRole === "OWNER" || userRole === "MANAGER";

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Riwayat Order</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} order</p>
        </div>
        <button
          onClick={load}
          className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {["ALL", "PENDING", "CONFIRMED", "READY", "COMPLETED", "CANCELLED"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              statusFilter === s
                ? "bg-emerald-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-emerald-300"
            }`}
          >
            {s === "ALL" ? "Semua" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Memuat...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">No. Order</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Waktu</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Kasir</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Meja</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Total</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((order) => (
                <tr
                  key={order.id}
                  className={`hover:bg-gray-50/50 ${order.status === "CANCELLED" ? "opacity-50" : ""}`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {order.status === "CANCELLED" ? (
                      <span className="line-through">{order.orderNumber}</span>
                    ) : order.orderNumber}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-700">{order.cashier.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {order.table ? `Meja ${order.table.number}` : "Takeaway"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatRupiah(order.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        STATUS_COLOR[order.status] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {STATUS_LABEL[order.status] || order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setSelected(order); setVoidError(""); setShowVoidConfirm(false); }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                    Belum ada order
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => { setSelected(null); setShowVoidConfirm(false); }}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className={`font-semibold font-mono text-sm ${selected.status === "CANCELLED" ? "line-through text-gray-400" : "text-gray-900"}`}>
                  {selected.orderNumber}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(selected.createdAt)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[selected.status] || "bg-gray-100 text-gray-600"}`}>
                  {STATUS_LABEL[selected.status] || selected.status}
                </span>
                <button onClick={() => { setSelected(null); setShowVoidConfirm(false); }} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-gray-400">Kasir</div>
                  <div className="font-medium text-gray-800 mt-0.5">{selected.cashier.name}</div>
                </div>
                <div>
                  <div className="text-gray-400">Meja</div>
                  <div className="font-medium text-gray-800 mt-0.5">
                    {selected.table ? `Meja ${selected.table.number}` : "Takeaway"}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Pembayaran</div>
                  <div className="font-medium text-gray-800 mt-0.5">
                    {PAYMENT_LABEL[selected.paymentMethod || ""] || selected.paymentMethod || "-"}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="text-xs font-medium text-gray-500 mb-2">Item Pesanan</div>
                <div className="space-y-2">
                  {selected.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        {item.quantity}× {item.menuItem.name}
                      </span>
                      <span className="text-gray-900 font-medium">{formatRupiah(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-1">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatRupiah(selected.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>PPN</span>
                  <span>{formatRupiah(selected.taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
                  <span>Total</span>
                  <span className="text-emerald-600">{formatRupiah(selected.totalAmount)}</span>
                </div>
              </div>

              {selected.notes && (
                <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-600">
                  {selected.notes}
                </div>
              )}

              {/* Void section */}
              {canVoid && selected.status !== "CANCELLED" && (
                <div className="border-t border-gray-100 pt-4">
                  {!showVoidConfirm ? (
                    <button
                      onClick={() => setShowVoidConfirm(true)}
                      className="w-full py-2 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                      Batalkan / Void Order
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-red-600 font-medium">Konfirmasi pembatalan order ini?</p>
                      <input
                        type="text"
                        value={voidReason}
                        onChange={(e) => setVoidReason(e.target.value)}
                        placeholder="Alasan pembatalan (opsional)"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                      {voidError && <p className="text-xs text-red-500">{voidError}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setShowVoidConfirm(false); setVoidReason(""); }}
                          className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                        >
                          Batal
                        </button>
                        <button
                          onClick={voidOrder}
                          disabled={voidLoading}
                          className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50"
                        >
                          {voidLoading ? "Memproses..." : "Ya, Batalkan"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

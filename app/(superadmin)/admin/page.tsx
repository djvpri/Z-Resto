"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { formatRupiah } from "@/lib/format";

type Stats = {
  totalTenants: number;
  activePaid: number;
  activeTrial: number;
  pendingPayments: number;
  expiredSubs: number;
  revenueThisMonth: number;
  newTenantsThisMonth: number;
};

const STAT_CARDS = (s: Stats) => [
  {
    label: "Total Tenant",
    value: s.totalTenants,
    sub: `+${s.newTenantsThisMonth} bulan ini`,
    emoji: "🏢",
    color: "bg-blue-50 border-blue-100",
    text: "text-blue-700",
  },
  {
    label: "Berlangganan Aktif",
    value: s.activePaid,
    sub: "bayar bulanan / tahunan",
    emoji: "✅",
    color: "bg-emerald-50 border-emerald-100",
    text: "text-emerald-700",
  },
  {
    label: "Trial Aktif",
    value: s.activeTrial,
    sub: "belum bayar",
    emoji: "🕐",
    color: "bg-purple-50 border-purple-100",
    text: "text-purple-700",
  },
  {
    label: "Menunggu Konfirmasi",
    value: s.pendingPayments,
    sub: s.pendingPayments > 0 ? "perlu dikonfirmasi" : "tidak ada yang pending",
    emoji: "⏳",
    color: s.pendingPayments > 0 ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-100",
    text: s.pendingPayments > 0 ? "text-amber-700" : "text-gray-500",
  },
  {
    label: "Expired",
    value: s.expiredSubs,
    sub: "perlu follow-up",
    emoji: "❌",
    color: "bg-red-50 border-red-100",
    text: "text-red-600",
  },
  {
    label: "Revenue Bulan Ini",
    value: formatRupiah(s.revenueThisMonth),
    sub: "dari pembayaran dikonfirmasi",
    emoji: "💰",
    color: "bg-green-50 border-green-100",
    text: "text-green-700",
    isString: true,
  },
];

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        setStats(d);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard Admin</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        {stats?.pendingPayments ? (
          <Link
            href="/admin/payments"
            className="bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors"
          >
            {stats.pendingPayments} Pembayaran Pending →
          </Link>
        ) : null}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Memuat...</div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {STAT_CARDS(stats).map((card) => (
              <div key={card.label} className={`border rounded-2xl p-5 ${card.color}`}>
                <div className="text-2xl mb-3">{card.emoji}</div>
                <div className="text-sm text-gray-500 mb-1">{card.label}</div>
                <div className={`text-2xl font-bold ${card.text}`}>
                  {card.isString ? card.value : card.value.toLocaleString("id-ID")}
                </div>
                <div className="text-xs text-gray-400 mt-1">{card.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/admin/tenants"
              className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition-shadow group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900 mb-1">Daftar Tenant</div>
                  <div className="text-sm text-gray-500">
                    Lihat semua restoran yang terdaftar
                  </div>
                </div>
                <span className="text-gray-300 group-hover:text-gray-500 text-xl transition-colors">
                  →
                </span>
              </div>
            </Link>
            <Link
              href="/admin/payments"
              className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition-shadow group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900 mb-1">Kelola Pembayaran</div>
                  <div className="text-sm text-gray-500">Konfirmasi transfer dari tenant</div>
                </div>
                <span className="text-gray-300 group-hover:text-gray-500 text-xl transition-colors">
                  →
                </span>
              </div>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import { formatRupiah, formatDate } from "@/lib/format";
import { PRICING, BANK_INFO, daysUntil } from "@/lib/pricing";
import type { PlanKey } from "@/lib/pricing";

type Subscription = {
  id: string;
  plan: string;
  status: string;
  amount: number;
  paymentCode: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  confirmedAt: string | null;
};

const PLAN_LABEL: Record<string, string> = {
  TRIAL: "Trial Gratis",
  MONTHLY: "Bulanan",
  YEARLY: "Tahunan",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Aktif",
  PENDING: "Menunggu Konfirmasi",
  EXPIRED: "Expired",
  CANCELLED: "Dibatalkan",
};

export default function SubscriptionPage() {
  const [current, setCurrent] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("MONTHLY");
  const [requesting, setRequesting] = useState(false);
  const [notes, setNotes] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const res = await fetch("/api/subscription");
    const d = await res.json();
    setCurrent(d.subscription || null);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function requestSubscription() {
    setRequesting(true);
    setError("");
    const res = await fetch("/api/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: selectedPlan, notes }),
    });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error || "Gagal membuat permintaan");
    } else {
      setSuccess(
        "Permintaan berhasil dikirim! Lakukan transfer sesuai nominal dan informasikan ke admin."
      );
      setShowPaymentForm(false);
      setNotes("");
      load();
    }
    setRequesting(false);
  }

  const isPending = current?.status === "PENDING";
  const isActive =
    current?.status === "ACTIVE" &&
    (!current.endDate || daysUntil(current.endDate) >= 0);
  const daysLeft = current?.endDate ? daysUntil(current.endDate) : null;

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Langganan</h1>
        <p className="text-sm text-gray-500 mt-0.5">Kelola paket langganan Anda</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>
      ) : (
        <div className="space-y-6">
          {/* Status card */}
          <div
            className={`rounded-2xl border p-6 ${
              isActive
                ? "bg-emerald-50 border-emerald-100"
                : isPending
                ? "bg-amber-50 border-amber-100"
                : "bg-red-50 border-red-100"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div
                  className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                    isActive ? "text-emerald-600" : isPending ? "text-amber-600" : "text-red-600"
                  }`}
                >
                  {isActive ? "✓ Aktif" : isPending ? "⏳ Menunggu Konfirmasi" : "✕ Tidak Aktif"}
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {current ? PLAN_LABEL[current.plan] || current.plan : "Belum Berlangganan"}
                </div>
                {current && (
                  <div className="text-sm text-gray-500 mt-1">
                    Status: {STATUS_LABEL[current.status] || current.status}
                  </div>
                )}
              </div>
              {daysLeft !== null && daysLeft >= 0 && (
                <div
                  className={`text-right ${
                    daysLeft <= 3
                      ? "text-red-600"
                      : daysLeft <= 7
                      ? "text-amber-600"
                      : "text-gray-600"
                  }`}
                >
                  <div className="text-2xl font-bold">{daysLeft}</div>
                  <div className="text-xs">hari tersisa</div>
                </div>
              )}
            </div>

            {current?.endDate && (
              <div className="mt-4 pt-4 border-t border-black/5 text-sm text-gray-600">
                {current.startDate && <span>Mulai: {formatDate(current.startDate)} · </span>}
                Berakhir: {formatDate(current.endDate)}
              </div>
            )}

            {isPending && current?.paymentCode && (
              <div className="mt-4 pt-4 border-t border-amber-200">
                <div className="text-sm font-semibold text-amber-800 mb-2">
                  Instruksi Pembayaran
                </div>
                <div className="bg-white rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bank</span>
                    <span className="font-semibold">{BANK_INFO.bank}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">No. Rekening</span>
                    <span className="font-mono font-semibold">{BANK_INFO.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Atas Nama</span>
                    <span className="font-semibold">{BANK_INFO.accountName}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-100">
                    <span className="text-gray-500">Nominal Transfer</span>
                    <span className="font-bold text-emerald-600 text-base">
                      {formatRupiah(current.amount)}
                    </span>
                  </div>
                  <div className="text-xs text-amber-600 mt-1">
                    ⚠️ Transfer tepat nominal di atas (termasuk 3 digit unik) agar mudah
                    diverifikasi admin.
                  </div>
                </div>
                {current.notes && (
                  <div className="mt-3 text-xs text-gray-500">Catatan Anda: {current.notes}</div>
                )}
              </div>
            )}
          </div>

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl">
              {success}
            </div>
          )}

          {/* Upgrade / Perpanjang */}
          {!isPending && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-4">
                {isActive ? "Perpanjang / Upgrade" : "Pilih Paket"}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {(["MONTHLY", "YEARLY"] as PlanKey[]).map((plan) => {
                  const p = PRICING[plan];
                  return (
                    <button
                      key={plan}
                      onClick={() => setSelectedPlan(plan)}
                      className={`text-left p-4 rounded-2xl border-2 transition-colors ${
                        selectedPlan === plan
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">{p.label}</span>
                        {plan === "YEARLY" && (
                          <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">
                            Hemat {PRICING.YEARLY.savePercent}%
                          </span>
                        )}
                      </div>
                      <div className="text-xl font-bold text-gray-900">
                        {formatRupiah(p.amount)}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {p.days} hari
                        {plan === "YEARLY" &&
                          ` · ${formatRupiah(PRICING.YEARLY.perMonth)}/bulan`}
                      </div>
                    </button>
                  );
                })}
              </div>

              {!showPaymentForm ? (
                <button
                  onClick={() => setShowPaymentForm(true)}
                  className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Lanjut ke Pembayaran
                </button>
              ) : (
                <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 space-y-4">
                  <h3 className="font-semibold text-gray-900">Informasi Transfer</h3>
                  <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Paket</span>
                      <span className="font-semibold">{PRICING[selectedPlan].label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Bank</span>
                      <span className="font-semibold">
                        {BANK_INFO.bank} · {BANK_INFO.accountNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">A/N</span>
                      <span className="font-semibold">{BANK_INFO.accountName}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Nominal pasti (dengan kode unik) akan muncul setelah Anda submit.
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nama Pengirim Transfer (opsional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Nama sesuai rekening yang akan transfer"
                    />
                  </div>
                  {error && (
                    <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl">
                      {error}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowPaymentForm(false)}
                      className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50"
                    >
                      Batal
                    </button>
                    <button
                      onClick={requestSubscription}
                      disabled={requesting}
                      className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {requesting ? "Mengirim..." : "Konfirmasi & Lihat Nominal"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-700">
            <div className="font-semibold mb-1">Cara berlangganan:</div>
            <ol className="list-decimal list-inside space-y-1 text-blue-600">
              <li>Pilih paket (Bulanan / Tahunan) dan klik Lanjut ke Pembayaran</li>
              <li>
                Transfer ke rekening {BANK_INFO.bank} sesuai nominal yang tertera
              </li>
              <li>Admin akan mengkonfirmasi pembayaran dalam 1×24 jam</li>
              <li>Akun Anda langsung aktif setelah dikonfirmasi</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

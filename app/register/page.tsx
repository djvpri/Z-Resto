"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PRICING } from "@/lib/pricing";

export default function RegisterPage() {
  const [form, setForm] = useState({
    restaurantName: "",
    ownerName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Password tidak cocok");
      return;
    }
    if (form.password.length < 8) {
      setError("Password minimal 8 karakter");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantName: form.restaurantName.trim(),
          ownerName: form.ownerName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registrasi gagal");
        return;
      }
      router.push("/pos");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left: Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8">
            ← Kembali
          </Link>

          <div className="mb-8">
            <div className="text-2xl font-bold text-gray-900 mb-1">Daftar Z Resto</div>
            <p className="text-sm text-gray-500">
              Trial gratis {PRICING.TRIAL.days} hari · Tidak perlu kartu kredit
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nama Restoran / Franchise
              </label>
              <input
                type="text"
                value={form.restaurantName}
                onChange={(e) => set("restaurantName", e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Warung Nusantara"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nama Pemilik
              </label>
              <input
                type="text"
                value={form.ownerName}
                onChange={(e) => set("ownerName", e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Budi Santoso"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                required
                autoComplete="email"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="budi@warung.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                required
                autoComplete="new-password"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Minimal 8 karakter"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Konfirmasi Password
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => set("confirmPassword", e.target.value)}
                required
                autoComplete="new-password"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Ulangi password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-2.5 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Membuat akun..." : `Daftar & Mulai Trial ${PRICING.TRIAL.days} Hari`}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Sudah punya akun?{" "}
            <Link href="/login" className="text-emerald-600 font-medium hover:underline">
              Masuk
            </Link>
          </p>
        </div>
      </div>

      {/* Right: Info */}
      <div className="hidden lg:flex w-96 bg-emerald-600 flex-col justify-center p-12 text-white">
        <div className="text-2xl font-bold mb-8">🍽️ Z Resto</div>
        <div className="space-y-6">
          <div>
            <div className="text-lg font-semibold mb-1">Langsung aktif</div>
            <div className="text-emerald-100 text-sm">
              Akun Anda aktif seketika setelah daftar. Langsung bisa masuk dan mulai kelola restoran.
            </div>
          </div>
          <div>
            <div className="text-lg font-semibold mb-1">Trial {PRICING.TRIAL.days} hari gratis</div>
            <div className="text-emerald-100 text-sm">
              Akses semua fitur tanpa batasan selama {PRICING.TRIAL.days} hari. Tidak perlu kartu kredit.
            </div>
          </div>
          <div>
            <div className="text-lg font-semibold mb-1">Multi-cabang siap</div>
            <div className="text-emerald-100 text-sm">
              Atur semua cabang restoran dari satu akun. Tambahkan manajer dan kasir per cabang.
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-emerald-500">
          <div className="text-xs text-emerald-200 mb-2">Setelah trial, mulai dari</div>
          <div className="text-2xl font-bold">Rp 299rb</div>
          <div className="text-emerald-200 text-sm">per bulan · batalkan kapan saja</div>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { formatRupiah } from "@/lib/format";
import { PRICING } from "@/lib/pricing";

const FEATURES = [
  {
    emoji: "🛒",
    title: "POS Kasir",
    desc: "Interface kasir yang cepat dan mudah digunakan. Pilih menu, atur meja, proses pembayaran dalam hitungan detik.",
  },
  {
    emoji: "🏢",
    title: "Multi-Cabang",
    desc: "Kelola semua cabang restoran dari satu dashboard. Pantau performa tiap cabang secara real-time.",
  },
  {
    emoji: "📊",
    title: "Laporan Harian",
    desc: "Laporan penjualan otomatis setiap hari. Ketahui menu terlaris, total pendapatan, dan tren penjualan.",
  },
  {
    emoji: "🍽️",
    title: "Manajemen Menu",
    desc: "Tambah, edit, dan atur ketersediaan menu dengan mudah. Kategorisasi menu untuk navigasi yang lebih cepat.",
  },
  {
    emoji: "👤",
    title: "Manajemen Akses",
    desc: "Atur hak akses per peran: Owner, Manajer, dan Kasir. Setiap peran hanya melihat yang mereka butuhkan.",
  },
  {
    emoji: "🔒",
    title: "Aman & Terpercaya",
    desc: "Autentikasi session HttpOnly. Data restoran Anda aman dan terisolasi dari tenant lain.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="text-base font-bold text-gray-900">🍽️ Z Resto</div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors"
            >
              Coba Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-emerald-100">
          ✨ Gratis {PRICING.TRIAL.days} hari tanpa kartu kredit
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-6">
          Kelola Restoran Franchise
          <br />
          <span className="text-emerald-600">Dari Satu Dashboard</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10">
          Sistem POS dan manajemen multi-cabang untuk restoran franchise. Kasir, manajer, dan pemilik
          — semua dalam satu platform yang mudah digunakan.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="bg-emerald-600 text-white text-base font-semibold px-8 py-3.5 rounded-2xl hover:bg-emerald-700 transition-colors shadow-sm"
          >
            Mulai Trial {PRICING.TRIAL.days} Hari Gratis
          </Link>
          <Link
            href="/login"
            className="border border-gray-200 text-gray-700 text-base font-medium px-8 py-3.5 rounded-2xl hover:bg-gray-50 transition-colors"
          >
            Sudah punya akun? Masuk
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Tidak perlu kartu kredit · Langsung aktif setelah daftar
        </p>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Semua yang Anda butuhkan
            </h2>
            <p className="text-gray-500 mt-3">
              Fitur lengkap untuk operasional restoran sehari-hari
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow"
              >
                <div className="text-3xl mb-4">{f.emoji}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="harga" className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Harga Transparan</h2>
            <p className="text-gray-500 mt-3">Mulai gratis, upgrade kapan saja</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Trial */}
            <div className="border border-gray-200 rounded-2xl p-6">
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Trial
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">Gratis</div>
              <div className="text-sm text-gray-400 mb-6">{PRICING.TRIAL.days} hari</div>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Semua fitur aktif</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Multi-cabang</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Tidak perlu kartu kredit</li>
              </ul>
              <Link
                href="/register"
                className="block text-center bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                Mulai Gratis
              </Link>
            </div>

            {/* Monthly */}
            <div className="border border-emerald-200 rounded-2xl p-6 bg-emerald-50">
              <div className="text-sm font-semibold text-emerald-600 uppercase tracking-wide mb-3">
                Bulanan
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatRupiah(PRICING.MONTHLY.amount)}
              </div>
              <div className="text-sm text-gray-400 mb-6">per bulan</div>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Semua fitur aktif</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Multi-cabang unlimited</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Support via WhatsApp</li>
              </ul>
              <Link
                href="/register"
                className="block text-center bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
              >
                Pilih Bulanan
              </Link>
            </div>

            {/* Yearly */}
            <div className="border border-gray-200 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-1 rounded-full">
                Hemat {PRICING.YEARLY.savePercent}%
              </div>
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Tahunan
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatRupiah(PRICING.YEARLY.amount)}
              </div>
              <div className="text-sm text-gray-400 mb-6">
                per tahun · {formatRupiah(PRICING.YEARLY.perMonth)}/bulan
              </div>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Semua fitur bulanan</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Prioritas support</li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span>
                  Hemat {formatRupiah(PRICING.MONTHLY.amount * 12 - PRICING.YEARLY.amount)}/tahun
                </li>
              </ul>
              <Link
                href="/register"
                className="block text-center bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors"
              >
                Pilih Tahunan
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-emerald-600 py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Siap coba Z Resto?
          </h2>
          <p className="text-emerald-100 mb-8">
            Daftar sekarang dan kelola restoran Anda lebih efisien.
            Trial {PRICING.TRIAL.days} hari gratis, tidak perlu kartu kredit.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-emerald-700 font-bold px-8 py-3.5 rounded-2xl hover:bg-emerald-50 transition-colors"
          >
            Daftar Sekarang — Gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm font-semibold text-gray-700">🍽️ Z Resto</div>
          <div className="text-xs text-gray-400">
            © 2025 Z Resto. Sistem manajemen restoran franchise.
          </div>
          <div className="flex gap-4 text-sm text-gray-500">
            <Link href="/login" className="hover:text-gray-700">Masuk</Link>
            <Link href="/register" className="hover:text-gray-700">Daftar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

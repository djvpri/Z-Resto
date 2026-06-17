export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Akun Ditangguhkan</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Akun restoran Anda telah ditangguhkan oleh administrator. Hubungi tim support untuk informasi lebih lanjut.
        </p>
        <a
          href="/login"
          className="mt-6 inline-block text-sm text-blue-600 hover:underline"
        >
          Kembali ke halaman login
        </a>
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Cek apakah sudah install
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    // Cek localStorage — sudah pernah dismiss?
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const daysSinceDismiss = (Date.now() - Number(dismissed)) / (1000 * 60 * 60 * 24);
      // Tampilkan lagi setelah 7 hari
      if (daysSinceDismiss < 7) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Tampilkan banner setelah 3 detik (biar gak langsung muncul)
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setShowBanner(false);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  }

  function handleDismiss() {
    localStorage.setItem("pwa-install-dismissed", String(Date.now()));
    setShowBanner(false);
  }

  // Sudah install atau belum bisa install → jangan tampilkan apa-apa
  if (installed || !showBanner || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 pointer-events-auto animate-slide-up">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-xl">🍽️</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900">Install Z-Resto</div>
            <div className="text-xs text-gray-500 mt-0.5">
              Pasang sebagai aplikasi di HP kamu — lebih cepat & bisa dipakai offline
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-gray-500 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                Nanti aja
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 text-xs shrink-0"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

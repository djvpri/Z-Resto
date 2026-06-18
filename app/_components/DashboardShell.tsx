"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

type User = {
  id: string;
  name: string;
  role: string;
  branch: { id: string; name: string; city: string | null } | null;
};

const NAV = [
  { href: "/pos", label: "POS Kasir", emoji: "🛒", roles: ["OWNER", "MANAGER", "CASHIER"] },
  { href: "/orders", label: "Riwayat Order", emoji: "📋", roles: ["OWNER", "MANAGER", "CASHIER"] },
  { href: "/shift", label: "Shift Kasir", emoji: "🕐", roles: ["OWNER", "MANAGER", "CASHIER"] },
  { href: "/menu", label: "Kelola Menu", emoji: "🍽️", roles: ["OWNER", "MANAGER"] },
  { href: "/reports", label: "Laporan", emoji: "📊", roles: ["OWNER", "MANAGER"] },
  { href: "/staff", label: "Kelola Staf", emoji: "👥", roles: ["OWNER"] },
  { href: "/overview", label: "HQ Dashboard", emoji: "🏢", roles: ["OWNER"] },
  { href: "/branches", label: "Kelola Cabang", emoji: "🏬", roles: ["OWNER"] },
  { href: "/settings", label: "Pengaturan", emoji: "⚙️", roles: ["OWNER"] },
  { href: "/subscription", label: "Langganan", emoji: "💳", roles: ["OWNER"] },
];

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Pemilik",
  MANAGER: "Manajer",
  CASHIER: "Kasir",
};

export default function DashboardShell({
  user,
  children,
  subscriptionBanner,
}: {
  user: User;
  children: React.ReactNode;
  subscriptionBanner?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = NAV.filter((n) => n.roles.includes(user.role));

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — desktop: fixed | mobile: slide-in */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-60 bg-gray-900 text-white flex flex-col shrink-0 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="px-4 py-5 border-b border-gray-700/60 flex items-center justify-between">
          <div>
            <div className="text-base font-bold text-white">🍽️ Z Resto</div>
            <div className="text-xs text-gray-400 mt-0.5 truncate">
              {user.branch?.name || "Kantor Pusat"}
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white p-1"
          >
            ✕
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-emerald-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <span className="text-base">{item.emoji}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-gray-700/60">
          <div className="px-3 py-1.5 mb-0.5">
            <div className="text-sm font-medium text-white truncate">{user.name}</div>
            <div className="text-xs text-gray-400">{ROLE_LABEL[user.role] || user.role}</div>
          </div>
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            Keluar
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar (mobile) */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-900 p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="text-base font-bold text-gray-800">🍽️ Z Resto</div>
        </div>

        {/* Subscription banner */}
        {subscriptionBanner && (
          <div className="bg-amber-50 border-b border-amber-100 px-4 py-2.5 flex items-center justify-between shrink-0">
            <span className="text-sm text-amber-700 truncate">{subscriptionBanner}</span>
            <Link
              href="/subscription"
              className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline ml-4 shrink-0"
            >
              Perpanjang →
            </Link>
          </div>
        )}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

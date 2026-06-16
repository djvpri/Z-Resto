"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type User = {
  id: string;
  name: string;
  role: string;
  branch: { id: string; name: string; city: string | null } | null;
};

const NAV = [
  { href: "/pos", label: "POS Kasir", emoji: "🛒", roles: ["OWNER", "MANAGER", "CASHIER"] },
  { href: "/orders", label: "Riwayat Order", emoji: "📋", roles: ["OWNER", "MANAGER", "CASHIER"] },
  { href: "/menu", label: "Kelola Menu", emoji: "🍽️", roles: ["OWNER", "MANAGER"] },
  { href: "/reports", label: "Laporan", emoji: "📊", roles: ["OWNER", "MANAGER"] },
  { href: "/overview", label: "HQ Dashboard", emoji: "🏢", roles: ["OWNER"] },
  { href: "/branches", label: "Kelola Cabang", emoji: "🏬", roles: ["OWNER"] },
];

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Pemilik",
  MANAGER: "Manajer",
  CASHIER: "Kasir",
};

export default function DashboardShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = NAV.filter((n) => n.roles.includes(user.role));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-gray-700/60">
          <div className="text-base font-bold text-white">🍽️ Z Resto</div>
          <div className="text-xs text-gray-400 mt-0.5 truncate">
            {user.branch?.name || "Kantor Pusat"}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

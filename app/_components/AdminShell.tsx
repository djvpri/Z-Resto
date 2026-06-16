"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type User = { id: string; name: string; email: string };

const ADMIN_NAV = [
  { href: "/admin/tenants", label: "Daftar Tenant", emoji: "🏢" },
  { href: "/admin/payments", label: "Kelola Pembayaran", emoji: "💳" },
];

export default function AdminShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className="w-56 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="px-4 py-5 border-b border-slate-700/60">
          <div className="text-base font-bold text-white">⚙️ Z Resto Admin</div>
          <div className="text-xs text-slate-400 mt-0.5">Panel SuperAdmin</div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {ADMIN_NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span className="text-base">{item.emoji}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-700/60">
          <div className="px-3 py-1.5 mb-0.5">
            <div className="text-sm font-medium text-white truncate">{user.name}</div>
            <div className="text-xs text-slate-400 truncate">{user.email}</div>
          </div>
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            Keluar
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

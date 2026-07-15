import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { daysUntil } from "@/lib/pricing";
import DashboardShell from "@/app/_components/DashboardShell";

async function getSubscriptionBanner(tenantId: string, role: string): Promise<string | undefined> {
  if (role === "CASHIER" || role === "MANAGER") return undefined;

  const sub = await prisma.subscription.findFirst({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  if (!sub) return "⚠️ Akun belum berlangganan.";
  if (sub.status === "PENDING") return "⏳ Menunggu konfirmasi pembayaran dari admin.";
  if (sub.status === "EXPIRED" || sub.status === "CANCELLED") return "⚠️ Langganan Anda telah berakhir.";
  if (sub.status === "ACTIVE" && sub.endDate) {
    const days = daysUntil(sub.endDate);
    if (days < 0) return "⚠️ Langganan Anda telah berakhir.";
    if (days <= 7) return `⚠️ Langganan berakhir dalam ${days} hari.`;
  }
  return undefined;
}

async function hasActiveSubscription(tenantId: string): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  if (!sub) return false;
  if (sub.status === "PENDING") return true; // allow access while waiting for confirmation
  if (sub.status !== "ACTIVE") return false;
  if (!sub.endDate) return true;
  return daysUntil(sub.endDate) >= 0;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.role === "SUPERADMIN") redirect("/admin/tenants");

  // Tenant suspension check
  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
  if (!tenant?.isActive) redirect("/suspended");

  // Demo tenants bypass subscription gate
  if (!tenant?.isDemo) {
    const active = await hasActiveSubscription(user.tenantId);
    if (!active) redirect("/subscription");
  }

  const banner = tenant?.isDemo
    ? undefined
    : await getSubscriptionBanner(user.tenantId, user.role);

  return (
    <DashboardShell
      user={{
        id: user.id,
        name: user.name,
        role: user.role,
        branch: user.branch
          ? { id: user.branch.id, name: user.branch.name, city: user.branch.city }
          : null,
      }}
      isDemo={!!tenant?.isDemo}
      subscriptionBanner={banner}
    >
      {children}
    </DashboardShell>
  );
}

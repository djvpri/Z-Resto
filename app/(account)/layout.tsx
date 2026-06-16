import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";
import DashboardShell from "@/app/_components/DashboardShell";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.role === "SUPERADMIN") redirect("/admin/tenants");

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
    >
      {children}
    </DashboardShell>
  );
}

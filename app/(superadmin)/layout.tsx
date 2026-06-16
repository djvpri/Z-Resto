import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";
import AdminShell from "@/app/_components/AdminShell";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.role !== "SUPERADMIN") redirect("/pos");

  return (
    <AdminShell user={{ id: user.id, name: user.name, email: user.email }}>
      {children}
    </AdminShell>
  );
}

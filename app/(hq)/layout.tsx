import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";
import DashboardShell from "@/app/_components/DashboardShell";

export default async function HQLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/pos");

  return (
    <DashboardShell
      user={{
        id: user.id,
        name: user.name,
        role: user.role,
        branch: null,
      }}
    >
      {children}
    </DashboardShell>
  );
}

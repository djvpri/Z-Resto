import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { daysUntil } from "@/lib/pricing";

function csvEscape(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user || user.role !== "SUPERADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenants = await prisma.tenant.findMany({
    where: { slug: { not: "system" } },
    include: {
      subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
      users: { where: { role: "OWNER" }, take: 1, select: { email: true, name: true } },
      _count: { select: { branches: true, users: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const header = ["Nama Restoran", "Slug", "Status", "Email Owner", "Nama Owner", "Paket", "Status Langganan", "Berakhir", "Sisa Hari", "Cabang", "Pengguna"].join(",");

  const rows = tenants.map((t) => {
    const sub = t.subscriptions[0];
    const owner = t.users[0];
    const daysLeft = sub?.endDate ? daysUntil(sub.endDate) : null;
    return [
      t.name,
      t.slug,
      t.isActive ? "Aktif" : "Ditangguhkan",
      owner?.email ?? "",
      owner?.name ?? "",
      sub?.plan ?? "",
      sub?.status ?? "",
      sub?.endDate ? new Date(sub.endDate).toLocaleDateString("id-ID") : "",
      daysLeft !== null ? daysLeft : "",
      t._count.branches,
      t._count.users,
    ].map(csvEscape).join(",");
  });

  const csv = [header, ...rows].join("\n");
  const date = new Date().toISOString().split("T")[0];

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tenants-${date}.csv"`,
    },
  });
}

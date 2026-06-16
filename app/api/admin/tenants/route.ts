import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user || user.role !== "SUPERADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenants = await prisma.tenant.findMany({
    where: { slug: { not: "system" } }, // exclude system tenant
    include: {
      _count: { select: { users: true, branches: true } },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          plan: true,
          status: true,
          endDate: true,
          confirmedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Manually count orders across branches for each tenant
  const tenantIds = tenants.map((t) => t.id);
  const orderCounts = await prisma.order.groupBy({
    by: ["branchId"],
    where: { branch: { tenantId: { in: tenantIds } } },
    _count: { id: true },
  });

  const branchToTenant = await prisma.branch.findMany({
    where: { tenantId: { in: tenantIds } },
    select: { id: true, tenantId: true },
  });

  const tenantOrderCount: Record<string, number> = {};
  for (const oc of orderCounts) {
    const branch = branchToTenant.find((b) => b.id === oc.branchId);
    if (branch) {
      tenantOrderCount[branch.tenantId] = (tenantOrderCount[branch.tenantId] || 0) + oc._count.id;
    }
  }

  const result = tenants.map((t) => ({
    ...t,
    _count: { ...t._count, orders: tenantOrderCount[t.id] || 0 },
  }));

  return Response.json({ tenants: result });
}

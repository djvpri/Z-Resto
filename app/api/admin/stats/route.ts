import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user || user.role !== "SUPERADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalTenants,
    activePaid,
    activeTrial,
    pendingPayments,
    expiredSubs,
    revenueThisMonth,
    newTenantsThisMonth,
  ] = await Promise.all([
    prisma.tenant.count({ where: { slug: { not: "system" } } }),
    prisma.subscription.count({
      where: {
        status: "ACTIVE",
        plan: { not: "TRIAL" },
        endDate: { gt: now },
        tenant: { slug: { not: "system" } },
      },
    }),
    prisma.subscription.count({
      where: {
        status: "ACTIVE",
        plan: "TRIAL",
        endDate: { gt: now },
        tenant: { slug: { not: "system" } },
      },
    }),
    prisma.subscription.count({
      where: {
        status: "PENDING",
        tenant: { slug: { not: "system" } },
      },
    }),
    prisma.subscription.count({
      where: {
        status: "EXPIRED",
        tenant: { slug: { not: "system" } },
      },
    }),
    prisma.subscription.aggregate({
      where: {
        status: "ACTIVE",
        plan: { not: "TRIAL" },
        confirmedAt: { gte: startOfMonth },
        tenant: { slug: { not: "system" } },
      },
      _sum: { amount: true },
    }),
    prisma.tenant.count({
      where: {
        slug: { not: "system" },
        createdAt: { gte: startOfMonth },
      },
    }),
  ]);

  return Response.json({
    totalTenants,
    activePaid,
    activeTrial,
    pendingPayments,
    expiredSubs,
    revenueThisMonth: revenueThisMonth._sum.amount || 0,
    newTenantsThisMonth,
  });
}

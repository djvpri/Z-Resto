import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubscriptionEndDate } from "@/lib/pricing";

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user || user.role !== "SUPERADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenants = await prisma.tenant.findMany({
    where: { slug: { not: "system" } },
    include: {
      _count: { select: { users: true, branches: true } },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, plan: true, status: true, endDate: true, confirmedAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

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
    if (branch) tenantOrderCount[branch.tenantId] = (tenantOrderCount[branch.tenantId] || 0) + oc._count.id;
  }

  const result = tenants.map((t) => ({
    ...t,
    _count: { ...t._count, orders: tenantOrderCount[t.id] || 0 },
  }));

  return Response.json({ tenants: result });
}

export async function POST(req: NextRequest) {
  const user = await getSession(req);
  if (!user || user.role !== "SUPERADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, slug, ownerName, ownerEmail, ownerPassword } = body;

  if (!name || !slug || !ownerName || !ownerEmail || !ownerPassword) {
    return Response.json({ error: "Semua field wajib diisi" }, { status: 400 });
  }

  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) return Response.json({ error: "Slug sudah digunakan" }, { status: 409 });

  const emailUsed = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (emailUsed) return Response.json({ error: "Email sudah digunakan" }, { status: 409 });

  const passwordHash = await bcrypt.hash(ownerPassword, 10);

  const tenant = await prisma.$transaction(async (tx) => {
    const t = await tx.tenant.create({ data: { name, slug } });
    await tx.user.create({
      data: { tenantId: t.id, name: ownerName, email: ownerEmail, passwordHash, role: "OWNER" },
    });
    await tx.subscription.create({
      data: {
        tenantId: t.id,
        plan: "TRIAL",
        status: "ACTIVE",
        amount: 0,
        startDate: new Date(),
        endDate: getSubscriptionEndDate("TRIAL"),
      },
    });
    return t;
  });

  return Response.json({ tenant }, { status: 201 });
}

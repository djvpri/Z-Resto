import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PRICING, getSubscriptionEndDate } from "@/lib/pricing";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getSession(req);
  if (!user || user.role !== "SUPERADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;
  const { plan } = await req.json();

  const VALID_PLANS = ["TRIAL", "MONTHLY", "YEARLY"] as const;
  type Plan = typeof VALID_PLANS[number];
  if (!VALID_PLANS.includes(plan as Plan)) {
    return Response.json({ error: "Paket tidak valid" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return Response.json({ error: "Tenant tidak ditemukan" }, { status: 404 });

  // Cancel any pending subscriptions
  await prisma.subscription.updateMany({
    where: { tenantId: tenant.id, status: "PENDING" },
    data: { status: "CANCELLED" },
  });

  const pricing = PRICING[plan as Plan];
  const startDate = new Date();
  const endDate = getSubscriptionEndDate(plan as Plan, startDate);

  const sub = await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      plan: plan as Plan,
      status: "ACTIVE",
      amount: pricing.amount,
      startDate,
      endDate,
      confirmedAt: new Date(),
      confirmedBy: user.email,
      notes: "Diberi manual oleh SuperAdmin",
    },
  });

  return Response.json({ subscription: sub }, { status: 201 });
}

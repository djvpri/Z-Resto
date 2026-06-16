import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePaymentCode, getSubscriptionEndDate, PRICING } from "@/lib/pricing";
import type { PlanKey } from "@/lib/pricing";

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const subscription = await prisma.subscription.findFirst({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ subscription });
}

export async function POST(req: NextRequest) {
  const user = await getSession(req);
  if (!user || user.role === "CASHIER" || user.role === "MANAGER") {
    return Response.json({ error: "Hanya Owner yang bisa membeli langganan" }, { status: 403 });
  }

  const { plan, notes } = await req.json() as { plan: PlanKey; notes?: string };
  if (!["MONTHLY", "YEARLY"].includes(plan)) {
    return Response.json({ error: "Plan tidak valid" }, { status: 400 });
  }

  // Cek tidak ada yang masih PENDING
  const existing = await prisma.subscription.findFirst({
    where: { tenantId: user.tenantId, status: "PENDING" },
  });
  if (existing) {
    return Response.json(
      { error: "Masih ada permintaan pembayaran yang menunggu konfirmasi" },
      { status: 409 }
    );
  }

  const baseAmount = PRICING[plan].amount;
  const paymentCode = String(generatePaymentCode(baseAmount));
  const amount = generatePaymentCode(baseAmount);

  const subscription = await prisma.subscription.create({
    data: {
      tenantId: user.tenantId,
      plan,
      status: "PENDING",
      amount,
      paymentCode,
      notes: notes || null,
    },
  });

  return Response.json({ subscription }, { status: 201 });
}

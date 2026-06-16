import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SubscriptionStatus } from "@prisma/client";

const VALID_STATUSES: SubscriptionStatus[] = ["ACTIVE", "PENDING", "EXPIRED", "CANCELLED"];

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user || user.role !== "SUPERADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const status = VALID_STATUSES.find((s) => s === statusParam);

  const subscriptions = await prisma.subscription.findMany({
    where: {
      tenant: { slug: { not: "system" } },
      ...(status ? { status } : {}),
    },
    include: {
      tenant: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return Response.json({ subscriptions });
}

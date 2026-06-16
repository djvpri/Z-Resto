import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user || user.role !== "OWNER")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const branches = await prisma.branch.findMany({
    where: { tenantId: user.tenantId },
    include: { _count: { select: { orders: true, users: true } } },
  });

  return Response.json({ branches });
}

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.menuItem.findMany({
    where: { tenantId: user.tenantId, isActive: true },
    include: { category: true },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
  });

  return Response.json({ items });
}

export async function POST(req: NextRequest) {
  const user = await getSession(req);
  if (!user || user.role === "CASHIER")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const item = await prisma.menuItem.create({
    data: { ...body, tenantId: user.tenantId },
    include: { category: true },
  });

  return Response.json({ item }, { status: 201 });
}

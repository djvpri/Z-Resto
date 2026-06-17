import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.category.findMany({
    where: { tenantId: user.tenantId, isActive: true },
    include: { _count: { select: { menuItems: true } } },
    orderBy: { sortOrder: "asc" },
  });

  return Response.json({ categories });
}

export async function POST(req: NextRequest) {
  const user = await getSession(req);
  if (!user || user.role === "CASHIER")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { name } = await req.json();
  if (!name?.trim()) return Response.json({ error: "Nama kategori wajib diisi" }, { status: 400 });

  const last = await prisma.category.findFirst({
    where: { tenantId: user.tenantId },
    orderBy: { sortOrder: "desc" },
  });

  const category = await prisma.category.create({
    data: {
      tenantId: user.tenantId,
      name: name.trim(),
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
    include: { _count: { select: { menuItems: true } } },
  });

  return Response.json({ category }, { status: 201 });
}

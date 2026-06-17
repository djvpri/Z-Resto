import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(req);
  if (!user || user.role === "CASHIER")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat || cat.tenantId !== user.tenantId)
    return Response.json({ error: "Kategori tidak ditemukan" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

  const updated = await prisma.category.update({
    where: { id },
    data,
    include: { _count: { select: { menuItems: true } } },
  });

  return Response.json({ category: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(req);
  if (!user || user.role === "CASHIER")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const cat = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { menuItems: true } } },
  });

  if (!cat || cat.tenantId !== user.tenantId)
    return Response.json({ error: "Kategori tidak ditemukan" }, { status: 404 });

  if (cat._count.menuItems > 0) {
    // Unlink menu items first, then soft-delete category
    await prisma.menuItem.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });
  }

  await prisma.category.update({ where: { id }, data: { isActive: false } });

  return Response.json({ ok: true });
}

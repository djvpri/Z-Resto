import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { closingCash, notes } = await req.json();

  const shift = await prisma.shift.findUnique({
    where: { id },
    include: { branch: { select: { tenantId: true } } },
  });

  if (!shift) return Response.json({ error: "Shift tidak ditemukan" }, { status: 404 });
  if (shift.branch.tenantId !== user.tenantId) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (shift.closedAt) return Response.json({ error: "Shift sudah ditutup" }, { status: 400 });

  // Hitung total penjualan order selama shift ini
  const orders = await prisma.order.findMany({
    where: {
      branchId: shift.branchId,
      status: "COMPLETED",
      paidAt: { gte: shift.openedAt, lte: new Date() },
    },
    select: { totalAmount: true },
  });

  const totalSales = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalOrders = orders.length;

  const updated = await prisma.shift.update({
    where: { id },
    data: {
      closedAt: new Date(),
      closingCash: closingCash ?? 0,
      totalSales,
      totalOrders,
      notes,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  return Response.json({ shift: updated });
}

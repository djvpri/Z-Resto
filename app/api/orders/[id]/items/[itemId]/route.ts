import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Hapus item dari order PENDING
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const user = await getSession(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id, itemId } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      branch: { select: { tenantId: true } },
      items: true,
    },
  });

  if (!order) return Response.json({ error: "Order tidak ditemukan" }, { status: 404 });
  if (order.branch.tenantId !== user.tenantId) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (order.status !== "PENDING") {
    return Response.json({ error: "Hanya order PENDING yang bisa diubah" }, { status: 400 });
  }

  // Cek item ada di order ini
  const orderItem = order.items.find((i) => i.id === itemId);
  if (!orderItem) {
    return Response.json({ error: "Item tidak ditemukan di order ini" }, { status: 404 });
  }

  // Hapus item
  await prisma.orderItem.delete({ where: { id: itemId } });

  // Hitung ulang total
  const remainingItems = order.items.filter((i) => i.id !== itemId);
  const newSubtotal = remainingItems.reduce((s, i) => s + i.subtotal, 0);

  // Ambil taxRate dari tenant
  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { taxRate: true },
  });
  const taxRate = (tenant?.taxRate ?? 10) / 100;
  const newTaxAmount = Math.round(newSubtotal * taxRate);
  const newTotalAmount = newSubtotal + newTaxAmount;

  // Jika tidak ada item tersisa, void order
  if (remainingItems.length === 0) {
    await prisma.order.update({
      where: { id },
      data: { status: "CANCELLED", subtotal: 0, taxAmount: 0, totalAmount: 0 },
    });
    return Response.json({ cancelled: true, message: "Order dibatalkan (tidak ada item tersisa)" });
  }

  // Update total order
  const updated = await prisma.order.update({
    where: { id },
    data: {
      subtotal: newSubtotal,
      taxAmount: newTaxAmount,
      totalAmount: newTotalAmount,
    },
    include: { items: { include: { menuItem: true } } },
  });

  return Response.json({ order: updated, removed: orderItem });
}

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  if (order.status === "CANCELLED") return Response.json({ error: "Order sudah dibatalkan" }, { status: 400 });

  // Cek apakah item ada di order ini
  const item = order.items.find((i) => i.id === itemId);
  if (!item) return Response.json({ error: "Item tidak ditemukan di order ini" }, { status: 404 });

  // Hapus item
  await prisma.orderItem.delete({ where: { id: itemId } });

  // Hitung ulang total order
  const remainingItems = order.items.filter((i) => i.id !== itemId);
  const newSubtotal = remainingItems.reduce((sum, i) => sum + i.subtotal, 0);
  const newTaxAmount = Math.round(newSubtotal * 0.1); // TODO: ambil tax rate dari settings

  if (remainingItems.length === 0) {
    // Tidak ada item tersisa → batalkan order
    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: "CANCELLED",
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
        notes: order.notes
          ? `[CANCEL: Semua item dihapus] | ${order.notes}`
          : "[CANCEL: Semua item dihapus]",
      },
      include: { items: { include: { menuItem: true } }, cashier: true, table: true },
    });
    return Response.json({ cancelled: true, order: updated });
  }

  // Masih ada item → update total
  const updated = await prisma.order.update({
    where: { id },
    data: {
      subtotal: newSubtotal,
      taxAmount: newTaxAmount,
      totalAmount: newSubtotal + newTaxAmount,
    },
    include: { items: { include: { menuItem: true } }, cashier: true, table: true },
  });

  return Response.json({ cancelled: false, order: updated });
}

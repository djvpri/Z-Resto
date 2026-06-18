import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/branches/[id]/tables/[tableId] — delete a table
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tableId: string }> }
) {
  const user = await getSession(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["OWNER", "MANAGER"].includes(user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: branchId, tableId } = await params;

  // Verify branch
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch || branch.tenantId !== user.tenantId) {
    return Response.json({ error: "Cabang tidak ditemukan" }, { status: 404 });
  }

  // Verify table belongs to this branch
  const table = await prisma.diningTable.findUnique({ where: { id: tableId } });
  if (!table || table.branchId !== branchId) {
    return Response.json({ error: "Meja tidak ditemukan" }, { status: 404 });
  }

  // Check if table has active orders
  const activeOrders = await prisma.order.count({
    where: { tableId, status: { notIn: ["COMPLETED", "CANCELLED"] } },
  });
  if (activeOrders > 0) {
    return Response.json({ error: "Tidak bisa hapus meja yang masih ada order aktif" }, { status: 400 });
  }

  await prisma.diningTable.delete({ where: { id: tableId } });

  return Response.json({ deleted: true });
}

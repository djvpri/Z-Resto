import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Update meja
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { number, capacity, status } = await req.json();

  const table = await prisma.diningTable.findUnique({
    where: { id },
    include: { branch: { select: { tenantId: true } } },
  });

  if (!table) return Response.json({ error: "Meja tidak ditemukan" }, { status: 404 });
  if (table.branch.tenantId !== user.tenantId) return Response.json({ error: "Forbidden" }, { status: 403 });

  // Cek duplikat nomor
  if (number && number !== table.number) {
    const dup = await prisma.diningTable.findFirst({
      where: { branchId: table.branchId, number: String(number), id: { not: id } },
    });
    if (dup) {
      return Response.json({ error: `Nomor meja ${number} sudah ada` }, { status: 409 });
    }
  }

  const updated = await prisma.diningTable.update({
    where: { id },
    data: {
      ...(number && { number: String(number) }),
      ...(capacity && { capacity: Number(capacity) }),
      ...(status && { status: status }),
    },
  });

  return Response.json({ table: updated });
}

// Hapus meja
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const table = await prisma.diningTable.findUnique({
    where: { id },
    include: {
      branch: { select: { tenantId: true } },
      orders: { where: { status: { notIn: ["COMPLETED", "CANCELLED"] } }, select: { id: true } },
    },
  });

  if (!table) return Response.json({ error: "Meja tidak ditemukan" }, { status: 404 });
  if (table.branch.tenantId !== user.tenantId) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (table.orders.length > 0) {
    return Response.json({ error: "Tidak bisa hapus meja yang masih ada order aktif" }, { status: 400 });
  }

  await prisma.diningTable.delete({ where: { id } });

  return Response.json({ success: true });
}

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user || !user.branchId) return Response.json({ tables: [] });

  const tables = await prisma.diningTable.findMany({
    where: { branchId: user.branchId },
    orderBy: [{ number: "asc" }],
    include: {
      orders: {
        where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
        select: { id: true, totalAmount: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const tablesWithInfo = tables.map((t) => {
    const activeOrders = t.orders;
    const hasActiveOrder = activeOrders.length > 0;
    const orderTotal = activeOrders.reduce((s, o) => s + o.totalAmount, 0);
    const orderCount = activeOrders.length;
    const firstOrderAt = activeOrders.length > 0 ? activeOrders[activeOrders.length - 1].createdAt : null;

    return {
      id: t.id,
      number: t.number,
      capacity: t.capacity,
      status: hasActiveOrder ? "OCCUPIED" : t.status,
      activeOrderCount: orderCount,
      activeOrderTotal: orderTotal,
      firstOrderAt,
    };
  });

  return Response.json({ tables: tablesWithInfo });
}

// Tambah meja baru
export async function POST(req: NextRequest) {
  const user = await getSession(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.branchId) return Response.json({ error: "Tidak ada cabang" }, { status: 400 });

  const { number, capacity } = await req.json();

  if (!number) {
    return Response.json({ error: "Nomor meja wajib diisi" }, { status: 400 });
  }

  // Cek apakah nomor meja sudah ada di branch ini
  const existing = await prisma.diningTable.findFirst({
    where: { branchId: user.branchId, number: String(number) },
  });
  if (existing) {
    return Response.json({ error: `Nomor meja ${number} sudah ada` }, { status: 409 });
  }

  const table = await prisma.diningTable.create({
    data: {
      branchId: user.branchId,
      number: String(number),
      capacity: capacity || 4,
    },
  });

  return Response.json({ table }, { status: 201 });
}

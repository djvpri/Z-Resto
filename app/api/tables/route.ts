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

  // Hitung total order aktif per meja
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

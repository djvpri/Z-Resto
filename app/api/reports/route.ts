import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const branchIdParam = searchParams.get("branchId");

  const branchId =
    user.role === "OWNER"
      ? branchIdParam || undefined
      : user.branchId || undefined;

  const startOfDay = new Date(date + "T00:00:00.000Z");
  const endOfDay = new Date(date + "T23:59:59.999Z");

  const orders = await prisma.order.findMany({
    where: {
      ...(branchId
        ? { branchId }
        : { branch: { tenantId: user.tenantId } }),
      status: "COMPLETED",
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    include: { items: { include: { menuItem: true } } },
  });

  const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const itemCounts: Record<string, { name: string; count: number }> = {};
  for (const order of orders) {
    for (const item of order.items) {
      const key = item.menuItemId;
      if (!itemCounts[key]) itemCounts[key] = { name: item.menuItem.name, count: 0 };
      itemCounts[key].count += item.quantity;
    }
  }
  const topItems = Object.values(itemCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return Response.json({ totalRevenue, totalOrders, avgOrderValue, topItems });
}

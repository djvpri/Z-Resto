import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(req);
  if (!user || user.role === "CASHIER") {
    return Response.json({ error: "Hanya OWNER atau MANAGER yang bisa membatalkan order" }, { status: 403 });
  }

  const { id } = await params;
  const { action, reason } = await req.json();

  if (action !== "void") {
    return Response.json({ error: "Action tidak valid" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { branch: { select: { tenantId: true } } },
  });

  if (!order) {
    return Response.json({ error: "Order tidak ditemukan" }, { status: 404 });
  }

  if (order.branch.tenantId !== user.tenantId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (order.status === "CANCELLED") {
    return Response.json({ error: "Order sudah dibatalkan" }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: "CANCELLED",
      notes: reason
        ? `[VOID: ${reason}]${order.notes ? " | " + order.notes : ""}`
        : order.notes,
    },
    include: { items: { include: { menuItem: true } }, cashier: true, table: true },
  });

  return Response.json({ order: updated });
}

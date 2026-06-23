import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Bayar order PENDING
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { action, reason, paymentMethod, paidAmount } = body;

  if (!["void", "cancel", "pay", "payAll"].includes(action)) {
    return Response.json({ error: "Action tidak valid" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { branch: { select: { tenantId: true } } },
  });

  if (!order) return Response.json({ error: "Order tidak ditemukan" }, { status: 404 });
  if (order.branch.tenantId !== user.tenantId) return Response.json({ error: "Forbidden" }, { status: 403 });

  // Action: PAY — bayar order PENDING
  if (action === "pay") {
    if (order.status !== "PENDING") {
      return Response.json({ error: "Hanya order PENDING yang bisa dibayar" }, { status: 400 });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: "COMPLETED",
        paymentMethod: paymentMethod || order.paymentMethod || "CASH",
        paidAt: new Date(),
      },
      include: { items: { include: { menuItem: true } }, cashier: true, table: true },
    });

    return Response.json({ order: updated });
  }

  // Action: PAY ALL — bayar semua order PENDING di meja
  if (action === "payAll") {
    if (!order.tableId) {
      return Response.json({ error: "payAll hanya untuk order meja" }, { status: 400 });
    }
    if (!["OWNER", "MANAGER"].includes(user.role)) {
      return Response.json({ error: "Hanya Owner & Manager" }, { status: 403 });
    }

    // Ambil semua order PENDING di meja ini (pakai composite index)
    const pendingOrders = await prisma.order.findMany({
      where: {
        branchId: order.branchId,
        tableId: order.tableId,
        status: "PENDING",
      },
      include: { items: { include: { menuItem: true } } },
    });

    if (pendingOrders.length === 0) {
      return Response.json({ error: "Tidak ada order PENDING" }, { status: 400 });
    }

    // Bayar semua sekaligus
    const orderIds = pendingOrders.map((o) => o.id);
    await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: {
        status: "COMPLETED",
        paymentMethod: paymentMethod || "CASH",
        paidAt: new Date(),
      },
    });

    // Gabungkan semua item dari semua order
    const allItems: { name: string; quantity: number; unitPrice: number; subtotal: number }[] = [];
    let totalSubtotal = 0;
    let totalTax = 0;

    for (const o of pendingOrders) {
      for (const item of o.items) {
        allItems.push({
          name: item.menuItem.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        });
      }
      totalSubtotal += o.subtotal;
      totalTax += o.taxAmount;
    }

    const totalAll = pendingOrders.reduce((s, o) => s + o.totalAmount, 0);

    return Response.json({
      paid: true,
      totalOrders: pendingOrders.length,
      totalAmount: totalAll,
      totalSubtotal,
      totalTax,
      orderNumbers: pendingOrders.map((o) => o.orderNumber),
      items: allItems,
    });
  }

  // Action: CANCEL / VOID — batalkan order
  if (action === "void") {
    if (!["OWNER", "MANAGER"].includes(user.role)) {
      return Response.json({ error: "Hanya OWNER atau MANAGER yang bisa membatalkan order" }, { status: 403 });
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

  // Action: CANCEL — OWNER/MANAGER bisa batalkan order siapapun, CASHIER hanya milik sendiri
  if (action === "cancel") {
    if (order.status === "CANCELLED") {
      return Response.json({ error: "Order sudah dibatalkan" }, { status: 400 });
    }
    if (order.status === "COMPLETED") {
      return Response.json({ error: "Order yang sudah selesai tidak bisa dibatalkan" }, { status: 400 });
    }
    if (user.role === "CASHIER") {
      if (order.cashierId !== user.id) {
        return Response.json({ error: "Hanya bisa membatalkan order sendiri" }, { status: 403 });
      }
      if (!["PENDING", "CONFIRMED"].includes(order.status)) {
        return Response.json({ error: "Order sudah diproses, tidak bisa dibatalkan" }, { status: 400 });
      }
    }
    // OWNER/MANAGER/ADMIN: bisa batalkan order siapapun tanpa batasan

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: "CANCELLED",
        notes: reason
          ? `[CANCEL: ${reason}]${order.notes ? " | " + order.notes : ""}`
          : order.notes,
      },
      include: { items: { include: { menuItem: true } }, cashier: true, table: true },
    });

    return Response.json({ order: updated });
  }

  return Response.json({ error: "Action tidak valid" }, { status: 400 });
}

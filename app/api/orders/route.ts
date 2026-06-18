import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/format";

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const branchId = user.role === "OWNER"
    ? (searchParams.get("branchId") || undefined)
    : user.branchId || undefined;
  const tableId = searchParams.get("tableId") || undefined;
  const status = searchParams.get("status") || undefined;

  const where: any = { branchId, ...(branchId ? {} : { branch: { tenantId: user.tenantId } }) };
  if (tableId) where.tableId = tableId;
  if (status) where.status = status;

  const orders = await prisma.order.findMany({
    where,
    include: { items: { include: { menuItem: true } }, cashier: true, table: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return Response.json({ orders });
}

export async function POST(req: NextRequest) {
  const user = await getSession(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { tableId, items, notes, paymentMethod, paidAmount } = await req.json();

  // Owner tanpa branchId → ambil cabang pertama
  let branchId: string | null = user.branchId ?? null;
  if (!branchId) {
    const firstBranch = await prisma.branch.findFirst({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: "asc" },
    });
    branchId = firstBranch?.id ?? null;
  }
  if (!branchId) {
    return Response.json({ error: "Tidak ada cabang. Buat cabang dulu." }, { status: 400 });
  }

  const subtotal = items.reduce(
    (s: number, i: { unitPrice: number; quantity: number }) => s + i.unitPrice * i.quantity, 0
  );

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { taxRate: true },
  });
  const taxRate = (tenant?.taxRate ?? 10) / 100;
  const taxAmount = Math.round(subtotal * taxRate);
  const totalAmount = subtotal + taxAmount;

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  const orderNumber = generateOrderNumber(branch?.city?.slice(0, 3) || "RST");

  // Jika ada tableId, cek order PENDING yang sudah ada
  let order;
  if (tableId) {
    const existingPending = await prisma.order.findFirst({
      where: { branchId, tableId, status: "PENDING" },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    if (existingPending) {
      // Tambah item ke order yang sudah ada
      const newSubtotal = existingPending.subtotal + subtotal;
      const newTaxAmount = Math.round(newSubtotal * taxRate);
      const newTotalAmount = newSubtotal + newTaxAmount;

      // Buat order items baru
      await prisma.orderItem.createMany({
        data: items.map((i: { menuItemId: string; quantity: number; unitPrice: number; notes?: string }) => ({
          orderId: existingPending.id,
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtotal: i.unitPrice * i.quantity,
          notes: i.notes,
        })),
      });

      // Update total order
      order = await prisma.order.update({
        where: { id: existingPending.id },
        data: {
          subtotal: newSubtotal,
          taxAmount: newTaxAmount,
          totalAmount: newTotalAmount,
          notes: notes || existingPending.notes,
        },
        include: { items: { include: { menuItem: true } } },
      });

      return Response.json({ order, added: true }, { status: 200 });
    }
  }

  // Buat order baru (status PENDING)
  order = await prisma.order.create({
    data: {
      branchId,
      cashierId: user.id,
      tableId: tableId || null,
      orderNumber,
      subtotal,
      taxAmount,
      totalAmount,
      paymentMethod: paymentMethod || null,
      notes,
      status: "PENDING",
      items: {
        create: items.map((i: { menuItemId: string; quantity: number; unitPrice: number; notes?: string }) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtotal: i.unitPrice * i.quantity,
          notes: i.notes,
        })),
      },
    },
    include: { items: { include: { menuItem: true } } },
  });

  return Response.json({ order, added: false }, { status: 201 });
}

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

  const orders = await prisma.order.findMany({
    where: { branchId, ...(branchId ? {} : { branch: { tenantId: user.tenantId } }) },
    include: { items: { include: { menuItem: true } }, cashier: true, table: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return Response.json({ orders });
}

export async function POST(req: NextRequest) {
  const user = await getSession(req);
  if (!user || !user.branchId)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { tableId, items, notes, paymentMethod } = await req.json();

  // Owner might not have branchId — fallback to first branch of tenant
  let branchId: string | null = user.branchId ?? null;
  if (!branchId) {
    const firstBranch = await prisma.branch.findFirst({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: "asc" },
    });
    branchId = firstBranch?.id ?? null;
  }
  if (!branchId) {
    return Response.json({ error: "Tidak ada cabang. Buat cabang dulu di menu Kelola Cabang." }, { status: 400 });
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

  const order = await prisma.order.create({
    data: {
      branchId,
      cashierId: user.id,
      tableId: tableId || null,
      orderNumber,
      subtotal,
      taxAmount,
      totalAmount,
      paymentMethod,
      notes,
      status: "COMPLETED",
      paidAt: new Date(),
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

  return Response.json({ order }, { status: 201 });
}

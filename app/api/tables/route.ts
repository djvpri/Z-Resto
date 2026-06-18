import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function resolveBranchId(user: any): Promise<string | null> {
  if (user.branchId) return user.branchId;
  // OWNER/MANAGER tanpa branchId: ambil cabang pertama dari tenant
  const first = await prisma.branch.findFirst({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "asc" },
  });
  return first?.id ?? null;
}

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user) return Response.json({ tables: [] });

  const branchId = await resolveBranchId(user);
  if (!branchId) return Response.json({ tables: [] });

  const tables = await prisma.diningTable.findMany({
    where: { branchId },
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

// Tambah meja baru (hanya OWNER & MANAGER)
export async function POST(req: NextRequest) {
  const user = await getSession(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["OWNER", "MANAGER"].includes(user.role)) {
    return Response.json({ error: "Hanya Owner & Manager yang bisa mengelola meja" }, { status: 403 });
  }

  const branchId = await resolveBranchId(user);
  if (!branchId) return Response.json({ error: "Tidak ada cabang. Buat cabang dulu." }, { status: 400 });

  const { number, capacity } = await req.json();

  if (!number) {
    return Response.json({ error: "Nomor meja wajib diisi" }, { status: 400 });
  }

  // Cek apakah nomor meja sudah ada di branch ini
  const existing = await prisma.diningTable.findFirst({
    where: { branchId, number: String(number) },
  });
  if (existing) {
    return Response.json({ error: `Nomor meja ${number} sudah ada` }, { status: 409 });
  }

  const table = await prisma.diningTable.create({
    data: {
      branchId,
      number: String(number),
      capacity: capacity || 4,
    },
  });

  return Response.json({ table }, { status: 201 });
}

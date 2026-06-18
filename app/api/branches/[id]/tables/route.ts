import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/branches/[id]/tables — list tables for a specific branch
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["OWNER", "MANAGER"].includes(user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: branchId } = await params;

  // Verify branch belongs to user's tenant
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch || branch.tenantId !== user.tenantId) {
    return Response.json({ error: "Cabang tidak ditemukan" }, { status: 404 });
  }

  const tables = await prisma.diningTable.findMany({
    where: { branchId },
    orderBy: { number: "asc" },
    include: {
      orders: {
        where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
        select: { id: true },
      },
    },
  });

  return Response.json({
    tables: tables.map((t) => ({
      id: t.id,
      number: t.number,
      capacity: t.capacity,
      status: t.orders.length > 0 ? "OCCUPIED" : t.status,
      activeOrderCount: t.orders.length,
    })),
  });
}

// POST /api/branches/[id]/tables — add a table to a branch
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["OWNER", "MANAGER"].includes(user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: branchId } = await params;

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch || branch.tenantId !== user.tenantId) {
    return Response.json({ error: "Cabang tidak ditemukan" }, { status: 404 });
  }

  const { number, capacity } = await req.json();
  if (!number) {
    return Response.json({ error: "Nomor meja wajib diisi" }, { status: 400 });
  }

  // Check duplicate
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

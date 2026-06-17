import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const branchId = user.branchId;

  // Owner tanpa branchId: cari shift aktif di semua cabang tenant
  if (!branchId) {
    const shifts = await prisma.shift.findMany({
      where: { branch: { tenantId: user.tenantId } },
      include: { user: { select: { id: true, name: true, role: true } }, branch: { select: { id: true, name: true } } },
      orderBy: { openedAt: "desc" },
      take: 30,
    });
    return Response.json({ shifts, active: null });
  }

  const active = await prisma.shift.findFirst({
    where: { branchId, closedAt: null },
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { openedAt: "desc" },
  });

  const shifts = await prisma.shift.findMany({
    where: { branchId },
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { openedAt: "desc" },
    take: 30,
  });

  return Response.json({ shifts, active });
}

export async function POST(req: NextRequest) {
  const user = await getSession(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Cari branchId
  let branchId = user.branchId;
  if (!branchId) {
    const first = await prisma.branch.findFirst({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: "asc" },
    });
    branchId = first?.id ?? null;
  }
  if (!branchId) {
    return Response.json({ error: "Tidak ada cabang" }, { status: 400 });
  }

  // Cek apakah sudah ada shift aktif
  const existing = await prisma.shift.findFirst({
    where: { branchId, closedAt: null },
  });
  if (existing) {
    return Response.json({ error: "Shift sudah aktif di cabang ini" }, { status: 409 });
  }

  const { openingCash = 0 } = await req.json();

  const shift = await prisma.shift.create({
    data: { branchId, userId: user.id, openingCash },
    include: { user: { select: { id: true, name: true, role: true } } },
  });

  return Response.json({ shift }, { status: 201 });
}

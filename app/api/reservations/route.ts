import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// List reservasi
export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let branchId = user.branchId;
  if (!branchId) {
    const first = await prisma.branch.findFirst({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: "asc" },
    });
    branchId = first?.id ?? null;
  }
  if (!branchId) return Response.json({ reservations: [] });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const status = searchParams.get("status");

  const startOfDay = new Date(date + "T00:00:00.000Z");
  const endOfDay = new Date(date + "T23:59:59.999Z");

  const reservations = await prisma.reservation.findMany({
    where: {
      branchId,
      reserveAt: { gte: startOfDay, lte: endOfDay },
      ...(status ? { status: status as any } : {}),
    },
    include: { table: { select: { id: true, number: true, capacity: true } } },
    orderBy: { reserveAt: "asc" },
  });

  return Response.json({ reservations });
}

// Buat reservasi baru
export async function POST(req: NextRequest) {
  const user = await getSession(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["OWNER", "MANAGER"].includes(user.role)) {
    return Response.json({ error: "Hanya Owner & Manager" }, { status: 403 });
  }

  let branchId = user.branchId;
  if (!branchId) {
    const first = await prisma.branch.findFirst({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: "asc" },
    });
    branchId = first?.id ?? null;
  }
  if (!branchId) return Response.json({ error: "Tidak ada cabang" }, { status: 400 });

  const { customerName, phone, partySize, tableId, reserveAt, duration, notes } = await req.json();

  if (!customerName || !reserveAt || !partySize) {
    return Response.json({ error: "Nama, waktu, dan jumlah tamu wajib diisi" }, { status: 400 });
  }

  // Jika pilih meja, cek availability
  if (tableId) {
    const table = await prisma.diningTable.findUnique({ where: { id: tableId } });
    if (!table || table.branchId !== branchId) {
      return Response.json({ error: "Meja tidak ditemukan" }, { status: 404 });
    }
    if (table.capacity < partySize) {
      return Response.json({ error: `Meja ${table.number} hanya muat ${table.capacity} orang` }, { status: 400 });
    }

    // Cek konflik reservasi di jam yang sama
    const reserveDate = new Date(reserveAt);
    const endReserve = new Date(reserveDate.getTime() + (duration || 120) * 60000);
    const conflict = await prisma.reservation.findFirst({
      where: {
        tableId,
        branchId,
        status: { in: ["PENDING", "CONFIRMED", "SEATED"] },
        reserveAt: { lt: endReserve },
      },
    });
    // Cek manual karena butuh rentang waktu
    if (conflict) {
      const conflictEnd = new Date(conflict.reserveAt.getTime() + conflict.duration * 60000);
      if (reserveDate < conflictEnd && endReserve > conflict.reserveAt) {
        return Response.json({ error: `Meja ${table.number} sudah dibooking jam ${new Date(conflict.reserveAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` }, { status: 409 });
      }
    }
  }

  const reservation = await prisma.reservation.create({
    data: {
      branchId,
      tableId: tableId || null,
      customerName,
      phone: phone || null,
      partySize: Number(partySize),
      reserveAt: new Date(reserveAt),
      duration: duration || 120,
      notes: notes || null,
    },
    include: { table: { select: { id: true, number: true, capacity: true } } },
  });

  return Response.json({ reservation }, { status: 201 });
}

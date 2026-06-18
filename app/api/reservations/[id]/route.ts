import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Update reservasi (check-in, batal, konfirmasi, dll)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { action, notes } = await req.json();

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { branch: { select: { tenantId: true } } },
  });

  if (!reservation) return Response.json({ error: "Reservasi tidak ditemukan" }, { status: 404 });
  if (reservation.branch.tenantId !== user.tenantId) return Response.json({ error: "Forbidden" }, { status: 403 });

  switch (action) {
    case "confirm": {
      if (reservation.status !== "PENDING") {
        return Response.json({ error: "Hanya reservasi PENDING yang bisa dikonfirmasi" }, { status: 400 });
      }
      const updated = await prisma.reservation.update({
        where: { id },
        data: { status: "CONFIRMED" },
        include: { table: true },
      });
      return Response.json({ reservation: updated });
    }

    case "checkin": {
      if (!["PENDING", "CONFIRMED"].includes(reservation.status)) {
        return Response.json({ error: "Reservasi tidak bisa di-check-in" }, { status: 400 });
      }
      // Update status reservasi
      const updated = await prisma.reservation.update({
        where: { id },
        data: { status: "SEATED" },
        include: { table: true },
      });
      // Update status meja ke OCCUPIED
      if (reservation.tableId) {
        await prisma.diningTable.update({
          where: { id: reservation.tableId },
          data: { status: "OCCUPIED" },
        });
      }
      return Response.json({ reservation: updated });
    }

    case "cancel": {
      if (["COMPLETED", "CANCELLED", "NO_SHOW"].includes(reservation.status)) {
        return Response.json({ error: "Reservasi sudah selesai/dibatalkan" }, { status: 400 });
      }
      const updated = await prisma.reservation.update({
        where: { id },
        data: { status: "CANCELLED", notes: notes || reservation.notes },
        include: { table: true },
      });
      // Kembalikan meja ke AVAILABLE jika ada
      if (reservation.tableId && reservation.status === "SEATED") {
        await prisma.diningTable.update({
          where: { id: reservation.tableId },
          data: { status: "AVAILABLE" },
        });
      }
      return Response.json({ reservation: updated });
    }

    case "noShow": {
      if (["COMPLETED", "CANCELLED", "NO_SHOW", "SEATED"].includes(reservation.status)) {
        return Response.json({ error: "Status tidak bisa diubah" }, { status: 400 });
      }
      const updated = await prisma.reservation.update({
        where: { id },
        data: { status: "NO_SHOW" },
        include: { table: true },
      });
      return Response.json({ reservation: updated });
    }

    case "complete": {
      const updated = await prisma.reservation.update({
        where: { id },
        data: { status: "COMPLETED" },
        include: { table: true },
      });
      return Response.json({ reservation: updated });
    }

    default:
      return Response.json({ error: "Action tidak valid" }, { status: 400 });
  }
}

// Hapus reservasi
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["OWNER", "MANAGER"].includes(user.role)) {
    return Response.json({ error: "Hanya Owner & Manager" }, { status: 403 });
  }

  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { branch: { select: { tenantId: true } } },
  });

  if (!reservation) return Response.json({ error: "Reservasi tidak ditemukan" }, { status: 404 });
  if (reservation.branch.tenantId !== user.tenantId) return Response.json({ error: "Forbidden" }, { status: 403 });

  await prisma.reservation.delete({ where: { id } });
  return Response.json({ success: true });
}

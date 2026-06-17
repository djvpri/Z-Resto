import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(req);
  if (!user || !["OWNER", "MANAGER"].includes(user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, role, branchId, isActive } = body;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.tenantId !== user.tenantId) {
    return Response.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  }

  // Cannot modify OWNER or SUPERADMIN
  if (["OWNER", "SUPERADMIN"].includes(target.role)) {
    return Response.json({ error: "Tidak bisa mengubah data pemilik" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (isActive !== undefined) data.isActive = isActive;
  if (branchId !== undefined) data.branchId = branchId || null;
  if (role !== undefined) {
    if (!["MANAGER", "CASHIER"].includes(role)) {
      return Response.json({ error: "Role tidak valid" }, { status: 400 });
    }
    if (user.role === "MANAGER" && role !== "CASHIER") {
      return Response.json({ error: "Manajer hanya bisa mengelola kasir" }, { status: 403 });
    }
    data.role = role;
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    include: { branch: { select: { id: true, name: true } } },
  });

  return Response.json({ user: updated });
}

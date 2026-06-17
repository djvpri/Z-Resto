import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user || user.role !== "OWNER")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const branches = await prisma.branch.findMany({
    where: { tenantId: user.tenantId },
    include: { _count: { select: { orders: true, users: true } } },
    orderBy: { createdAt: "asc" },
  });

  return Response.json({ branches });
}

export async function POST(req: NextRequest) {
  const user = await getSession(req);
  if (!user || user.role !== "OWNER")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, city, address, phone } = body;

  if (!name) return Response.json({ error: "Nama cabang wajib diisi" }, { status: 400 });

  const branch = await prisma.branch.create({
    data: {
      tenantId: user.tenantId,
      name,
      city: city || null,
      address: address || null,
      phone: phone || null,
    },
    include: { _count: { select: { orders: true, users: true } } },
  });

  return Response.json({ branch }, { status: 201 });
}

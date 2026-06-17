import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user || user.role === "SUPERADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { id: true, name: true, slug: true, taxRate: true },
  });

  return Response.json({ settings: tenant });
}

export async function PATCH(req: NextRequest) {
  const user = await getSession(req);
  if (!user || user.role !== "OWNER") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { taxRate } = body;

  if (taxRate === undefined || typeof taxRate !== "number" || taxRate < 0 || taxRate > 100) {
    return Response.json({ error: "taxRate harus angka antara 0-100" }, { status: 400 });
  }

  const tenant = await prisma.tenant.update({
    where: { id: user.tenantId },
    data: { taxRate: Math.round(taxRate) },
    select: { id: true, name: true, slug: true, taxRate: true },
  });

  return Response.json({ settings: tenant });
}

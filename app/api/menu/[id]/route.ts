import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(req);
  if (!user || user.role === "CASHIER")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const item = await prisma.menuItem.update({
    where: { id, tenantId: user.tenantId },
    data: body,
    include: { category: true },
  });

  return Response.json({ item });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(req);
  if (!user || user.role === "CASHIER")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  await prisma.menuItem.update({
    where: { id, tenantId: user.tenantId },
    data: { isActive: false, isAvailable: false },
  });

  return Response.json({ ok: true });
}

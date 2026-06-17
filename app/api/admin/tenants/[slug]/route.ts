import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getSession(req);
  if (!user || user.role !== "SUPERADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: {
      subscriptions: {
        orderBy: { createdAt: "desc" },
      },
      branches: {
        include: {
          _count: { select: { orders: true, users: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      users: {
        where: { role: { not: "SUPERADMIN" } },
        include: { branch: { select: { name: true } } },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      },
      _count: { select: { branches: true, users: true } },
    },
  });

  if (!tenant) return Response.json({ error: "Tenant tidak ditemukan" }, { status: 404 });

  return Response.json({ tenant });
}

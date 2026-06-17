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
      subscriptions: { orderBy: { createdAt: "desc" } },
      branches: {
        include: { _count: { select: { orders: true, users: true } } },
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getSession(req);
  if (!user || user.role !== "SUPERADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;
  const body = await req.json();
  const { name, newSlug, isActive } = body;

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return Response.json({ error: "Tenant tidak ditemukan" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (isActive !== undefined) data.isActive = isActive;
  if (newSlug !== undefined && newSlug !== slug) {
    const clash = await prisma.tenant.findUnique({ where: { slug: newSlug } });
    if (clash) return Response.json({ error: "Slug sudah digunakan" }, { status: 409 });
    data.slug = newSlug;
  }

  const updated = await prisma.tenant.update({ where: { slug }, data });
  return Response.json({ tenant: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getSession(req);
  if (!user || user.role !== "SUPERADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;
  if (slug === "system") return Response.json({ error: "Tidak bisa hapus system tenant" }, { status: 400 });

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return Response.json({ error: "Tenant tidak ditemukan" }, { status: 404 });

  await prisma.tenant.delete({ where: { slug } });
  return Response.json({ ok: true });
}

import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user || !["OWNER", "MANAGER"].includes(user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: {
      tenantId: user.tenantId,
      role: { not: "SUPERADMIN" },
    },
    include: { branch: { select: { id: true, name: true } } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return Response.json({ users });
}

export async function POST(req: NextRequest) {
  const user = await getSession(req);
  if (!user || !["OWNER", "MANAGER"].includes(user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, password, role, branchId } = body;

  if (!name || !email || !password || !role) {
    return Response.json({ error: "Semua field wajib diisi" }, { status: 400 });
  }

  // MANAGER can only create CASHIER
  if (user.role === "MANAGER" && role !== "CASHIER") {
    return Response.json({ error: "Manajer hanya bisa menambah kasir" }, { status: 403 });
  }

  // OWNER can create MANAGER or CASHIER (not OWNER or SUPERADMIN)
  if (!["MANAGER", "CASHIER"].includes(role)) {
    return Response.json({ error: "Role tidak valid" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json({ error: "Email sudah digunakan" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      tenantId: user.tenantId,
      branchId: branchId || null,
      name,
      email,
      passwordHash,
      role,
    },
    include: { branch: { select: { id: true, name: true } } },
  });

  return Response.json({ user: newUser }, { status: 201 });
}

import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getSession(req);
  if (!user || user.role !== "SUPERADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;
  const { newPassword } = await req.json();

  if (!newPassword || newPassword.length < 6) {
    return Response.json({ error: "Password minimal 6 karakter" }, { status: 400 });
  }

  const owner = await prisma.user.findFirst({
    where: { tenant: { slug }, role: "OWNER" },
  });
  if (!owner) return Response.json({ error: "Owner tidak ditemukan" }, { status: 404 });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: owner.id }, data: { passwordHash } });

  return Response.json({ ok: true });
}

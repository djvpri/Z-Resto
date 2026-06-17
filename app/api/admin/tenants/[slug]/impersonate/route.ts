import { NextRequest } from "next/server";
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

  const owner = await prisma.user.findFirst({
    where: { tenant: { slug }, role: "OWNER", isActive: true },
  });
  if (!owner) return Response.json({ error: "Owner aktif tidak ditemukan" }, { status: 404 });

  const session = await prisma.session.create({
    data: {
      userId: owner.id,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 jam
    },
  });

  return Response.json({ token: session.token });
}

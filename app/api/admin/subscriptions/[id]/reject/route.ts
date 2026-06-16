import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(req);
  if (!user || user.role !== "SUPERADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (!sub || sub.status !== "PENDING") {
    return Response.json({ error: "Subscription tidak ditemukan atau bukan PENDING" }, { status: 404 });
  }

  await prisma.subscription.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  return Response.json({ ok: true });
}

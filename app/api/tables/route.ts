import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user || !user.branchId) return Response.json({ tables: [] });

  const tables = await prisma.diningTable.findMany({
    where: { branchId: user.branchId },
    orderBy: [{ number: "asc" }],
  });

  return Response.json({ tables });
}

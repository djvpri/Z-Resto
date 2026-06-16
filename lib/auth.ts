import { NextRequest } from "next/server";
import { prisma } from "./prisma";

export async function getSession(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { branch: true } } },
  });

  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function requireRole(
  req: NextRequest,
  roles: string[]
): Promise<{ user: Awaited<ReturnType<typeof getSession>> } | Response> {
  const user = await getSession(req);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!roles.includes(user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return { user };
}

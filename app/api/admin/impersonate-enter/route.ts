import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return Response.redirect(new URL("/login", req.url));

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || session.user.role === "SUPERADMIN") {
    return Response.redirect(new URL("/login", req.url));
  }

  const response = Response.redirect(new URL("/pos", req.url));
  response.headers.set(
    "Set-Cookie",
    `session_token=${token}; HttpOnly; Path=/; Max-Age=${2 * 3600}; SameSite=Lax`
  );
  return response;
}

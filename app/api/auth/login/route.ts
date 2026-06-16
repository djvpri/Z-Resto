import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const user = await prisma.user.findUnique({
      where: { email },
      include: { branch: true },
    });
    if (!user || !user.isActive) {
      return Response.json({ error: "Email atau password salah" }, { status: 401 });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return Response.json({ error: "Email atau password salah" }, { status: 401 });
    }
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      },
    });
    const response = Response.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId, branchId: user.branchId, branch: user.branch },
    });
    response.headers.set("Set-Cookie", `session_token=${session.token}; HttpOnly; Path=/; Max-Age=${8 * 3600}; SameSite=Lax`);
    return response;
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

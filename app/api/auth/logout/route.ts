import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
export async function POST(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value;
  if (token) await prisma.session.deleteMany({ where: { token } }).catch(() => {});
  const res = Response.json({ ok: true });
  res.headers.set("Set-Cookie", "session_token=; HttpOnly; Path=/; Max-Age=0");
  return res;
}

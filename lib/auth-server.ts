import { cookies } from "next/headers";
import { prisma } from "./prisma";

export async function getServerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { branch: true } } },
  });

  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

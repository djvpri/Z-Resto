import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ user });
}

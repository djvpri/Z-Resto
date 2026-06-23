import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const CROSS_APP_SECRET = new TextEncoder().encode(
  process.env.CROSS_APP_SECRET || "z-ecosystem-admin-2026"
);

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return Response.json({ error: "Token wajib diisi" }, { status: 400 });

    // 1. Verifikasi token dari Z One
    let payload: any;
    try {
      const result = await jwtVerify(token, CROSS_APP_SECRET);
      payload = result.payload;
    } catch {
      return Response.json({ error: "Token SSO tidak valid atau kedaluwarsa" }, { status: 401 });
    }

    if (payload.app !== "zresto") {
      return Response.json({ error: "Token ini bukan untuk Z-Resto" }, { status: 400 });
    }

    const email = String(payload.email || "").trim().toLowerCase();
    if (!email) return Response.json({ error: "Email tidak ada di token" }, { status: 400 });

    // 2. Cari user di database Z-Resto
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      include: { branch: true },
    });

    if (!user) {
      return Response.json({
        error: `Akun ${email} belum terdaftar di Z-Resto. Hubungi admin untuk menambahkan akun.`,
        code: "USER_NOT_FOUND",
      }, { status: 404 });
    }

    if (!user.isActive) {
      return Response.json({ error: "Akun Anda dinonaktifkan. Hubungi admin." }, { status: 403 });
    }

    // 3. Buat session Z-Resto
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 hari
      },
    });

    const res = Response.json({ success: true, redirect: "/pos" });
    (res as any).headers.set(
      "Set-Cookie",
      `session_token=${session.token}; HttpOnly; Path=/; Max-Age=${30 * 24 * 3600}; SameSite=Lax; Secure`
    );
    return res;
  } catch (err) {
    console.error("SSO verify error:", err);
    return Response.json({ error: "Gagal memproses SSO" }, { status: 500 });
  }
}

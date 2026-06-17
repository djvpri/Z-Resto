import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getSubscriptionEndDate } from "@/lib/pricing";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const { restaurantName, ownerName, email, password } = await req.json();

    if (!restaurantName || !ownerName || !email || !password) {
      return Response.json({ error: "Semua field wajib diisi" }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: "Password minimal 8 karakter" }, { status: 400 });
    }

    // Cek email sudah ada
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return Response.json({ error: "Email sudah terdaftar" }, { status: 409 });
    }

    // Generate unique slug
    let baseSlug = slugify(restaurantName);
    if (!baseSlug) baseSlug = "restoran";
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create tenant + branch + owner + trial subscription in transaction
    const { user, session } = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: restaurantName, slug },
      });

      const branch = await tx.branch.create({
        data: { tenantId: tenant.id, name: "Cabang Utama" },
      });

      const newUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          name: ownerName,
          email,
          passwordHash,
          role: "OWNER",
        },
        include: { branch: true },
      });

      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          plan: "TRIAL",
          status: "ACTIVE",
          amount: 0,
          startDate: new Date(),
          endDate: getSubscriptionEndDate("TRIAL"),
        },
      });

      const newSession = await tx.session.create({
        data: {
          userId: newUser.id,
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        },
      });

      return { user: newUser, session: newSession };
    });

    const response = Response.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          branchId: user.branchId,
          branch: user.branch,
        },
      },
      { status: 201 }
    );
    response.headers.set(
      "Set-Cookie",
      `session_token=${session.token}; HttpOnly; Path=/; Max-Age=${8 * 3600}; SameSite=Lax`
    );
    return response;
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

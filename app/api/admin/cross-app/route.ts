import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { PRICING, getSubscriptionEndDate } from "@/lib/pricing";

// Endpoint ini dipanggil oleh Z One (hub ekosistem) lewat /manage, BUKAN oleh
// browser pengguna langsung — makanya autentikasinya pakai Bearer secret
// (CROSS_APP_SECRET), bukan session cookie biasa.

const CROSS_APP_SECRET = process.env.CROSS_APP_SECRET || "z-ecosystem-admin-2026";

// Z One pakai nama plan generik (starter/pro/enterprise), Z-Resto pakai nama
// sendiri (TRIAL/MONTHLY/YEARLY) — petakan dua arah biar UI /manage tetap bisa
// dipakai apa adanya tanpa tahu detail tiap app.
const PLAN_TO_RESTO: Record<string, "TRIAL" | "MONTHLY" | "YEARLY"> = {
  starter: "TRIAL",
  pro: "MONTHLY",
  enterprise: "YEARLY",
};
const PLAN_TO_GENERIC: Record<string, string> = {
  TRIAL: "starter",
  MONTHLY: "pro",
  YEARLY: "enterprise",
};

function checkAuth(req: NextRequest) {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${CROSS_APP_SECRET}`;
}

async function buildCrossAppData() {
  const tenants = await prisma.tenant.findMany({
    where: { slug: { not: "system" } },
    include: {
      subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const users = await prisma.user.findMany({
    where: { tenant: { slug: { not: "system" } } },
    select: { id: true, name: true, email: true, role: true, tenantId: true, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return {
    tenants: tenants.map((t: typeof tenants[number]) => {
      const sub = t.subscriptions[0];
      return {
        id: t.id,
        name: t.name,
        plan: sub ? PLAN_TO_GENERIC[sub.plan] || "starter" : "starter",
        active: t.isActive,
        expires_at: sub?.endDate || null,
      };
    }),
    users: users.map((u: typeof users[number]) => ({
      id: u.id, name: u.name, email: u.email, role: u.role, tenantId: u.tenantId, active: u.isActive,
    })),
  };
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await buildCrossAppData();
    return Response.json(data);
  } catch (err) {
    console.error("cross-app GET error:", err);
    return Response.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { action, email, data } = await req.json();

    if (action === "createTenant") {
      const name = String(data?.name || "").trim();
      if (!name) return Response.json({ error: "name wajib diisi" }, { status: 400 });
      let baseSlug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim() || "tenant";
      let slug = baseSlug;
      let counter = 1;
      while (await prisma.tenant.findUnique({ where: { slug } })) slug = `${baseSlug}-${counter++}`;

      const tenant = await prisma.$transaction(async (tx) => {
        const t = await tx.tenant.create({ data: { name, slug } });
        await tx.branch.create({ data: { tenantId: t.id, name: "Cabang Utama" } });
        await tx.subscription.create({
          data: {
            tenantId: t.id, plan: "TRIAL", status: "ACTIVE", amount: 0,
            startDate: new Date(), endDate: getSubscriptionEndDate("TRIAL"),
          },
        });
        return t;
      });
      return Response.json({ success: true, tenant });
    }

    if (action === "updatePlan") {
      const tenantId = data?.tenantId;
      const genericPlan = String(data?.plan || "starter");
      const plan = PLAN_TO_RESTO[genericPlan] || "TRIAL";
      if (!tenantId) return Response.json({ error: "tenantId wajib diisi" }, { status: 400 });

      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) return Response.json({ error: "Tenant tidak ditemukan" }, { status: 404 });

      await prisma.subscription.updateMany({
        where: { tenantId, status: "PENDING" },
        data: { status: "CANCELLED" },
      });

      const startDate = new Date();
      const endDate = data?.planExpires ? new Date(data.planExpires) : getSubscriptionEndDate(plan, startDate);

      const sub = await prisma.subscription.create({
        data: {
          tenantId, plan, status: "ACTIVE", amount: PRICING[plan].amount,
          startDate, endDate, confirmedAt: new Date(), confirmedBy: "z-one-manage",
          notes: "Diatur lewat Z One /manage",
        },
      });
      return Response.json({ success: true, subscription: sub });
    }

    if (action === "deleteTenant") {
      const tenantId = data?.tenantId;
      if (!tenantId) return Response.json({ error: "tenantId wajib diisi" }, { status: 400 });
      await prisma.tenant.delete({ where: { id: tenantId } });
      return Response.json({ success: true });
    }

    if (action === "create") {
      const name = String(data?.name || "").trim();
      const userEmail = String(data?.email || "").trim();
      const password = String(data?.password || "");
      const tenantId = data?.tenantId;
      if (!name || !userEmail || !password) {
        return Response.json({ error: "name, email, password wajib diisi" }, { status: 400 });
      }
      const existing = await prisma.user.findUnique({ where: { email: userEmail } });
      if (existing) return Response.json({ error: "Email sudah digunakan" }, { status: 409 });

      let finalTenantId = tenantId;
      if (!finalTenantId) {
        // Kalau nggak dipilih tenant, taruh di tenant pertama yang ada (fallback)
        const firstTenant = await prisma.tenant.findFirst({ where: { slug: { not: "system" } } });
        if (!firstTenant) return Response.json({ error: "Belum ada tenant, buat tenant dulu" }, { status: 400 });
        finalTenantId = firstTenant.id;
      }
      const branch = await prisma.branch.findFirst({ where: { tenantId: finalTenantId } });
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { tenantId: finalTenantId, branchId: branch?.id, name, email: userEmail, passwordHash, role: "CASHIER" },
      });
      return Response.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
    }

    if (action === "delete") {
      // Soft-delete: nonaktifkan, BUKAN hapus baris. User punya relasi ke Order
      // (cashier) dan Shift tanpa cascade delete (sengaja, demi keutuhan riwayat
      // transaksi) — hapus permanen akan gagal kalau user pernah transaksi/shift.
      if (!email) return Response.json({ error: "email wajib diisi" }, { status: 400 });
      const result = await prisma.user.updateMany({ where: { email }, data: { isActive: false } });
      if (!result.count) return Response.json({ error: "User tidak ditemukan" }, { status: 404 });
      return Response.json({ success: true, deactivated: true });
    }

    if (action === "reactivate") {
      if (!email) return Response.json({ error: "email wajib diisi" }, { status: 400 });
      const result = await prisma.user.updateMany({ where: { email }, data: { isActive: true } });
      if (!result.count) return Response.json({ error: "User tidak ditemukan" }, { status: 404 });
      return Response.json({ success: true, reactivated: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("cross-app POST error:", err);
    return Response.json({ error: "Gagal memproses aksi" }, { status: 500 });
  }
}

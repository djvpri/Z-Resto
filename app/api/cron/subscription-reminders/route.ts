import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendExpiryReminderEmail, sendExpiredEmail } from "@/lib/email";

// Endpoint ini dipanggil oleh cron job harian (Railway Cron / Vercel Cron)
// Tambahkan CRON_SECRET di env untuk keamanan
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
  const in3Days = new Date(now.getTime() + 3 * 24 * 3600 * 1000);
  const in1Day = new Date(now.getTime() + 1 * 24 * 3600 * 1000);

  // Ambil semua subscription aktif yang mendekati expired
  const subs = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      endDate: { lte: in7Days, gte: now }, // berakhir dalam 7 hari ke depan
    },
    include: {
      tenant: {
        include: {
          users: {
            where: { role: "OWNER" },
            select: { email: true, name: true },
            take: 1,
          },
        },
      },
    },
  });

  // Subscription yang sudah expired tapi masih status ACTIVE
  const expired = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      endDate: { lt: now },
    },
    include: {
      tenant: {
        include: {
          users: {
            where: { role: "OWNER" },
            select: { email: true, name: true },
            take: 1,
          },
        },
      },
    },
  });

  let reminded = 0;
  let expiredCount = 0;

  for (const sub of subs) {
    const owner = sub.tenant.users[0];
    if (!owner || !sub.endDate) continue;

    const msLeft = sub.endDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(msLeft / (24 * 3600 * 1000));

    // Kirim hanya pada titik 7, 3, atau 1 hari
    if (daysLeft === 7 || daysLeft === 3 || daysLeft === 1) {
      await sendExpiryReminderEmail({
        to: owner.email,
        ownerName: owner.name,
        restaurantName: sub.tenant.name,
        daysLeft,
        endDate: sub.endDate,
      });
      reminded++;
    }
  }

  // Update status expired + kirim email
  for (const sub of expired) {
    const owner = sub.tenant.users[0];

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "EXPIRED" },
    });

    if (owner) {
      await sendExpiredEmail({
        to: owner.email,
        ownerName: owner.name,
        restaurantName: sub.tenant.name,
      });
    }
    expiredCount++;
  }

  return Response.json({
    ok: true,
    reminded,
    expired: expiredCount,
    checkedAt: now.toISOString(),
  });
}

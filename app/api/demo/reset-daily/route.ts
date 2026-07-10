// app/api/demo/reset-daily/route.ts
// Dipanggil Railway Cron Job (compassionate-optimism) 1x/hari.
// Proteksi: Bearer token dari env DEMO_RESET_SECRET.
// Cari tenant is_demo=true, bersihkan data lama, seed ulang.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { seedDataDemo, bersihkanDataTenant } from '@/lib/demo-seed'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.replace('Bearer ', '').trim()
  const secret = process.env.DEMO_RESET_SECRET

  if (!secret || token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantDemo = await prisma.tenant.findMany({
    where: { isDemo: true },
    select: { id: true, name: true },
  })

  if (tenantDemo.length === 0) {
    return NextResponse.json({
      ok: true,
      pesan: 'Tidak ada tenant demo (isDemo=true belum di-set).',
    })
  }

  const hasil = []
  for (const t of tenantDemo) {
    try {
      await bersihkanDataTenant(t.id)
      const info = await seedDataDemo(t.id)
      hasil.push({ tenantId: t.id, nama: t.name, ...info, status: 'ok' })
    } catch (err: any) {
      hasil.push({ tenantId: t.id, nama: t.name, status: 'error', pesan: err.message })
    }
  }

  return NextResponse.json({ ok: true, direset: hasil })
}

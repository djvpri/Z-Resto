// app/api/demo/reset/route.ts
// Dipanggil tombol "Reset Demo" dari UI — hanya boleh dipakai oleh
// user yang login di tenant isDemo=true. Tidak butuh secret eksternal.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/auth-server'
import { seedDataDemo, bersihkanDataTenant } from '@/lib/demo-seed'

export const runtime = 'nodejs'

export async function POST() {
  const user = await getServerSession()
  if (!user) {
    return NextResponse.json({ error: 'Belum login' }, { status: 401 })
  }

  // Pastikan tenant ini memang demo
  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { id: true, name: true, isDemo: true },
  })

  if (!tenant?.isDemo) {
    return NextResponse.json(
      { error: 'Reset demo hanya tersedia untuk akun demo.' },
      { status: 403 }
    )
  }

  try {
    await bersihkanDataTenant(tenant.id)
    const info = await seedDataDemo(tenant.id)
    return NextResponse.json({ ok: true, ...info })
  } catch (err: any) {
    console.error('Demo reset error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

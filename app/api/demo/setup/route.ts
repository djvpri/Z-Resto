import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { bersihkanDataTenant, seedDataDemo } from '@/lib/demo-seed'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.replace('Bearer ', '').trim()
  const secret = process.env.DEMO_RESET_SECRET

  if (!secret || token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find or create demo tenant
    let tenant = await prisma.tenant.findFirst({ where: { slug: 'demo' } })
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: { name: 'Demo Restoran', slug: 'demo', isDemo: true, isActive: true, taxRate: 10 },
      })
    } else {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { isDemo: true, isActive: true },
      })
    }

    await bersihkanDataTenant(tenant.id)
    const info = await seedDataDemo(tenant.id)

    // Get owner credentials (created by seedDataDemo)
    const owner = await prisma.user.findFirst({ where: { tenantId: tenant.id, role: 'OWNER' } })

    return NextResponse.json({
      ok: true,
      tenantId: tenant.id,
      ownerEmail: owner?.email,
      ownerPassword: 'demo1234',
      ...info,
    })
  } catch (err: any) {
    console.error('Demo setup error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Seed data DEMO untuk ZResto — mengisi tenant+cabang tempat akun demo@zomet.my.id
// berada dengan kategori, menu, meja, order+item, reservasi, shift, dan inventori
// realistis tersebar ~2 bulan.
//
// IDEMPOTENT / RESET MANUAL: tiap dijalankan, data demo lama (order, reservasi,
// shift, inventori, meja, menu, kategori) tenant/cabang ini DIHAPUS lalu diisi
// ulang (user/tenant/branch/subscription TIDAK dihapus). Jalankan ulang untuk
// reset:  node scripts/seed-demo.js

const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')

// ZResto pakai Prisma 7 + driver adapter (skema tanpa `url`), jadi koneksi
// dibuat lewat adapter pg seperti prisma/seed.ts & lib/prisma.ts.
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@zomet.my.id'
const DEMO_SLUG = process.env.DEMO_SLUG || 'demo'

const now = new Date()
const rint = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
function daysAgo(n, hour) {
  const d = new Date(now); d.setDate(d.getDate() - n)
  d.setHours(hour != null ? hour : rint(10, 21), rint(0, 59), 0, 0); return d
}

const MENU = [
  ['Nasi Goreng Spesial', 28000, 'Makanan'], ['Mie Goreng Jawa', 25000, 'Makanan'],
  ['Ayam Bakar Madu', 35000, 'Makanan'], ['Sate Ayam (10 tusuk)', 30000, 'Makanan'],
  ['Gado-Gado', 22000, 'Makanan'], ['Ayam Geprek Sambal Matah', 27000, 'Makanan'],
  ['Soto Ayam', 24000, 'Makanan'], ['Iga Bakar', 48000, 'Makanan'],
  ['Es Teh Manis', 6000, 'Minuman'], ['Es Jeruk', 10000, 'Minuman'],
  ['Jus Alpukat', 18000, 'Minuman'], ['Kopi Susu Gula Aren', 18000, 'Minuman'],
  ['Air Mineral', 5000, 'Minuman'],
  ['Pisang Goreng Keju', 15000, 'Dessert'], ['Es Krim Goreng', 18000, 'Dessert'],
  ['Puding Cokelat', 12000, 'Dessert'],
  ['Paket Hemat A (Nasi+Ayam+Es Teh)', 38000, 'Paket'], ['Paket Keluarga', 135000, 'Paket'],
]
const CATEGORIES = ['Makanan', 'Minuman', 'Dessert', 'Paket']
const INVENTORY = [
  ['Beras', 'kg', 80], ['Ayam Potong', 'ekor', 35], ['Minyak Goreng', 'liter', 40],
  ['Telur', 'kg', 25], ['Gula', 'kg', 30], ['Es Batu', 'balok', 50],
]

async function main() {
  // 1. Tenant + cabang + kasir
  const demoUser = await prisma.user.findFirst({ where: { email: DEMO_EMAIL } })
  let tenantId = demoUser?.tenantId
  if (!tenantId) tenantId = (await prisma.tenant.findFirst({ where: { slug: DEMO_SLUG } }))?.id
  if (!tenantId) tenantId = (await prisma.tenant.findFirst())?.id
  if (!tenantId) throw new Error('Tidak ada tenant di ZResto. Buat tenant dulu.')
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })

  let branch = demoUser?.branchId ? await prisma.branch.findUnique({ where: { id: demoUser.branchId } }) : null
  if (!branch) branch = await prisma.branch.findFirst({ where: { tenantId } })
  if (!branch) branch = await prisma.branch.create({ data: { tenantId, name: 'Cabang Utama', city: 'Jakarta' } })

  let cashier = demoUser && demoUser.tenantId === tenantId ? demoUser : await prisma.user.findFirst({ where: { tenantId } })
  if (!cashier) throw new Error('Tidak ada user untuk kasir. Buat user dulu.')
  console.log(`Target: ${tenant.name} / cabang ${branch.name} | kasir ${cashier.name} | pajak ${tenant.taxRate}%`)

  const branches = await prisma.branch.findMany({ where: { tenantId }, select: { id: true } })
  const branchIds = branches.map((b) => b.id)

  // 2. RESET (order cascade ke orderItem)
  await prisma.order.deleteMany({ where: { branchId: { in: branchIds } } })
  await prisma.reservation.deleteMany({ where: { branchId: { in: branchIds } } })
  await prisma.shift.deleteMany({ where: { branchId: { in: branchIds } } })
  await prisma.inventoryItem.deleteMany({ where: { branchId: { in: branchIds } } })
  await prisma.diningTable.deleteMany({ where: { branchId: { in: branchIds } } })
  await prisma.menuItem.deleteMany({ where: { tenantId } })
  await prisma.category.deleteMany({ where: { tenantId } })
  console.log('Data demo lama dibersihkan.')

  // 3. Kategori + menu
  const catId = {}
  let sort = 0
  for (const name of CATEGORIES) {
    const c = await prisma.category.create({ data: { tenantId, name, sortOrder: sort++ } })
    catId[name] = c.id
  }
  const menu = []
  for (const [name, price, cat] of MENU) {
    menu.push(await prisma.menuItem.create({ data: { tenantId, categoryId: catId[cat], name, price } }))
  }

  // 4. Meja
  const tables = []
  for (let i = 1; i <= 8; i++) {
    tables.push(await prisma.diningTable.create({
      data: { branchId: branch.id, number: String(i), capacity: pick([2, 4, 4, 6]) },
    }))
  }

  // 5. Inventori
  for (const [name, unit, stock] of INVENTORY) {
    await prisma.inventoryItem.create({ data: { branchId: branch.id, name, unit, currentStock: stock, minStock: 5 } })
  }

  // 6. Order + item (tersebar 60 hari)
  let orderCount = 0, omzet = 0
  const ORDERS = 55
  for (let i = 0; i < ORDERS; i++) {
    const createdAt = daysAgo(rint(0, 60))
    const nItems = rint(1, 4)
    const used = new Set()
    const items = []
    let subtotal = 0
    for (let j = 0; j < nItems; j++) {
      let m = pick(menu); let g = 0
      while (used.has(m.id) && g++ < 5) m = pick(menu)
      used.add(m.id)
      const qty = rint(1, 3)
      const sub = m.price * qty
      subtotal += sub
      items.push({ menuItemId: m.id, quantity: qty, unitPrice: m.price, subtotal: sub })
    }
    const discountAmount = Math.random() < 0.15 ? Math.round(subtotal * 0.1 / 1000) * 1000 : 0
    const taxAmount = Math.round((subtotal - discountAmount) * (tenant.taxRate || 0) / 100)
    const totalAmount = subtotal - discountAmount + taxAmount

    const ageDays = Math.floor((now - createdAt) / 86400000)
    let status, paidAt = null, paymentMethod = null
    if (ageDays >= 1) { status = 'COMPLETED'; paidAt = createdAt; paymentMethod = pick(['CASH', 'QRIS', 'QRIS', 'TRANSFER', 'CARD']) }
    else status = pick(['PENDING', 'CONFIRMED', 'READY', 'COMPLETED'])
    if (status === 'COMPLETED' && !paidAt) { paidAt = createdAt; paymentMethod = pick(['CASH', 'QRIS', 'CARD']) }

    await prisma.order.create({
      data: {
        branchId: branch.id, cashierId: cashier.id,
        tableId: Math.random() < 0.7 ? pick(tables).id : null,
        orderNumber: `ORD-${String(i + 1).padStart(4, '0')}`,
        status, subtotal, taxAmount, discountAmount, totalAmount,
        paymentMethod, paidAt, createdAt,
        items: { create: items },
      },
    })
    orderCount++
    if (status === 'COMPLETED') omzet += totalAmount
  }

  // 7. Reservasi
  let resv = 0
  const RES_NAMES = ['Bpk Andi', 'Ibu Sari', 'Keluarga Wijaya', 'Pak Budi', 'Mbak Dewi', 'Rombongan Kantor', 'Pak Hendra', 'Ibu Ratna']
  for (let i = 0; i < 12; i++) {
    const offset = rint(-30, 14)
    const reserveAt = new Date(now); reserveAt.setDate(reserveAt.getDate() + offset); reserveAt.setHours(pick([12, 13, 18, 19, 20]), pick([0, 30]), 0, 0)
    let status
    if (offset < -1) status = pick(['COMPLETED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'])
    else if (offset <= 1) status = pick(['SEATED', 'CONFIRMED'])
    else status = pick(['PENDING', 'CONFIRMED'])
    await prisma.reservation.create({
      data: {
        branchId: branch.id, tableId: Math.random() < 0.6 ? pick(tables).id : null,
        customerName: pick(RES_NAMES), phone: `0813${String(rint(10000000, 99999999))}`,
        partySize: rint(2, 8), reserveAt, status,
      },
    })
    resv++
  }

  // 8. Shift (beberapa shift tertutup)
  let shiftCount = 0
  for (let i = 1; i <= 6; i++) {
    const openedAt = daysAgo(i * 3, 9)
    const closedAt = new Date(openedAt.getTime() + rint(7, 10) * 3600000)
    const totalSales = rint(1500000, 4500000)
    await prisma.shift.create({
      data: {
        branchId: branch.id, userId: cashier.id, openedAt, closedAt,
        openingCash: 200000, closingCash: 200000 + totalSales, totalSales, totalOrders: rint(15, 45),
      },
    })
    shiftCount++
  }

  console.log('✅ Seed demo ZResto selesai:')
  console.log(`   kategori=${CATEGORIES.length}, menu=${menu.length}, meja=${tables.length}, order=${orderCount} (omzet Rp${omzet.toLocaleString('id-ID')})`)
  console.log(`   reservasi=${resv}, shift=${shiftCount}, inventori=${INVENTORY.length}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

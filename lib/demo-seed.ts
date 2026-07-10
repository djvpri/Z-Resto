// lib/demo-seed.ts
// Seed data demo untuk Z-Resto — dipanggil oleh /api/demo/reset-daily
// dan endpoint /api/demo/reset (tombol manual).
//
// Pola sama dengan ZPos: hapus data lama → insert fresh.
// Karena Z-Resto pakai Prisma, tidak ada trigger DB stok yang perlu
// di-disable (stok dikelola di InventoryItem, tidak auto-decrement via trigger).

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// =====================
// DATA MENU DEMO
// =====================

const KATEGORI_DEMO = [
  { name: 'Makanan Utama', sortOrder: 1 },
  { name: 'Minuman', sortOrder: 2 },
  { name: 'Snack & Gorengan', sortOrder: 3 },
  { name: 'Dessert', sortOrder: 4 },
]

const MENU_DEMO = [
  // Makanan Utama
  { kategori: 'Makanan Utama', name: 'Nasi Goreng Spesial', price: 18000, emoji: '🍳', desc: 'Nasi goreng dengan telur, ayam, dan sayuran segar' },
  { kategori: 'Makanan Utama', name: 'Mie Goreng Jawa', price: 16000, emoji: '🍜', desc: 'Mie goreng khas Jawa dengan bumbu rempah' },
  { kategori: 'Makanan Utama', name: 'Ayam Bakar', price: 22000, emoji: '🍗', desc: 'Ayam bakar bumbu kecap dengan lalapan' },
  { kategori: 'Makanan Utama', name: 'Soto Ayam', price: 15000, emoji: '🥣', desc: 'Soto ayam bening dengan nasi dan kerupuk' },
  { kategori: 'Makanan Utama', name: 'Rendang Sapi', price: 28000, emoji: '🥩', desc: 'Rendang sapi empuk masak 3 jam dengan santan dan rempah' },
  { kategori: 'Makanan Utama', name: 'Gado-Gado', price: 14000, emoji: '🥗', desc: 'Sayuran rebus dengan saus kacang dan kerupuk' },
  // Minuman
  { kategori: 'Minuman', name: 'Es Teh Manis', price: 5000, emoji: '🧊', desc: 'Teh manis dingin' },
  { kategori: 'Minuman', name: 'Es Jeruk Peras', price: 7000, emoji: '🍊', desc: 'Jeruk peras segar dengan es batu' },
  { kategori: 'Minuman', name: 'Kopi Hitam', price: 8000, emoji: '☕', desc: 'Kopi hitam robusta lokal' },
  { kategori: 'Minuman', name: 'Jus Alpukat', price: 12000, emoji: '🥑', desc: 'Jus alpukat segar dengan susu kental manis' },
  { kategori: 'Minuman', name: 'Air Mineral', price: 4000, emoji: '💧', desc: 'Air mineral botol 600ml' },
  // Snack & Gorengan
  { kategori: 'Snack & Gorengan', name: 'Tempe Mendoan', price: 8000, emoji: '🟤', desc: 'Tempe goreng tepung khas Banyumas' },
  { kategori: 'Snack & Gorengan', name: 'Pisang Goreng', price: 7000, emoji: '🍌', desc: 'Pisang goreng tepung crispy' },
  { kategori: 'Snack & Gorengan', name: 'Tahu Isi', price: 6000, emoji: '⬜', desc: 'Tahu goreng isi sayuran' },
  // Dessert
  { kategori: 'Dessert', name: 'Es Campur', price: 10000, emoji: '🍧', desc: 'Es campur lengkap dengan kolang-kaling, nata de coco, dan sirup' },
  { kategori: 'Dessert', name: 'Puding Coklat', price: 8000, emoji: '🍮', desc: 'Puding coklat lembut dengan saus vanilla' },
]

// =====================
// BERSIHKAN DATA LAMA
// =====================

export async function bersihkanDataTenant(tenantId: string) {
  // Hapus berurutan sesuai foreign key
  // Order → OrderItem (cascade via prisma)
  const branches = await prisma.branch.findMany({ where: { tenantId } })
  const branchIds = branches.map(b => b.id)

  if (branchIds.length > 0) {
    // Hapus orders (OrderItem akan cascade)
    await prisma.order.deleteMany({ where: { branchId: { in: branchIds } } })
    // Hapus inventory
    await prisma.inventoryItem.deleteMany({ where: { branchId: { in: branchIds } } })
    // Hapus tables
    await prisma.diningTable.deleteMany({ where: { branchId: { in: branchIds } } })
    // Hapus reservations
    await prisma.reservation.deleteMany({ where: { branchId: { in: branchIds } } })
    // Hapus shifts
    await prisma.shift.deleteMany({ where: { branchId: { in: branchIds } } })
  }

  // Hapus menu items dan kategori
  await prisma.orderItem.deleteMany({
    where: { menuItem: { tenantId } }
  })
  await prisma.menuItem.deleteMany({ where: { tenantId } })
  await prisma.category.deleteMany({ where: { tenantId } })

  // Hapus staff (bukan owner)
  await prisma.user.deleteMany({
    where: { tenantId, role: { in: ['CASHIER', 'MANAGER'] } }
  })

  // Hapus branch lama
  await prisma.branch.deleteMany({ where: { tenantId } })
}

// =====================
// SEED DATA DEMO
// =====================

export async function seedDataDemo(tenantId: string) {
  const hash = await bcrypt.hash('demo1234', 10)

  // 1. Buat branch utama
  const branch = await prisma.branch.create({
    data: {
      tenantId,
      name: 'Cabang Utama',
      address: 'Jl. Merdeka No. 1',
      city: 'Jakarta',
      phone: '021-12345678',
      isActive: true,
    }
  })

  // 2. Buat meja (8 meja)
  await prisma.diningTable.createMany({
    data: Array.from({ length: 8 }, (_, i) => ({
      branchId: branch.id,
      number: `${i + 1}`,
      capacity: i < 4 ? 2 : 4,
    }))
  })

  // 3. Buat kategori menu
  const kategoriMap: Record<string, string> = {}
  for (const kat of KATEGORI_DEMO) {
    const created = await prisma.category.create({
      data: { tenantId, name: kat.name, sortOrder: kat.sortOrder, isActive: true }
    })
    kategoriMap[kat.name] = created.id
  }

  // 4. Buat menu items
  const menuCreated = await Promise.all(
    MENU_DEMO.map(m => prisma.menuItem.create({
      data: {
        tenantId,
        categoryId: kategoriMap[m.kategori],
        name: m.name,
        description: m.desc,
        price: m.price,
        isAvailable: true,
      }
    }))
  )

  // 5. Buat user kasir demo
  const owner = await prisma.user.findFirst({ where: { tenantId, role: 'OWNER' } })
  if (!owner) {
    await prisma.user.create({
      data: {
        tenantId,
        branchId: branch.id,
        name: 'Owner Demo',
        email: `owner.demo.${tenantId}@zresto.demo`,
        passwordHash: hash,
        role: 'OWNER',
        isActive: true,
      }
    })
  }

  const kasir = await prisma.user.create({
    data: {
      tenantId,
      branchId: branch.id,
      name: 'Kasir Demo',
      email: `kasir.demo.${tenantId}@zresto.demo`,
      passwordHash: hash,
      role: 'CASHIER',
      isActive: true,
    }
  })

  // 6. Buat riwayat order 14 hari terakhir
  const HARI = 14
  const STATUS_SELESAI = ['COMPLETED'] as const
  const METODE = ['CASH', 'QRIS', 'TRANSFER'] as const

  function acak(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
  function pilihAcak<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
  }

  const sekarang = new Date()
  let orderCounter = 1

  for (let h = HARI - 1; h >= 0; h--) {
    const jumlahOrder = acak(5, 15)
    for (let o = 0; o < jumlahOrder; o++) {
      const waktu = new Date(sekarang)
      waktu.setDate(waktu.getDate() - h)
      waktu.setHours(acak(8, 21), acak(0, 59), 0, 0)

      const jumlahItem = acak(1, 4)
      const itemTerpilih = Array.from({ length: jumlahItem }, () => pilihAcak(menuCreated))
      const qtyPerItem = itemTerpilih.map(() => acak(1, 3))
      const subtotal = itemTerpilih.reduce((sum, m, i) => sum + m.price * qtyPerItem[i], 0)
      const taxAmount = Math.round(subtotal * 0.1)
      const total = subtotal + taxAmount

      const nomorOrder = `ORD-${String(orderCounter++).padStart(4, '0')}`

      await prisma.order.create({
        data: {
          branchId: branch.id,
          cashierId: kasir.id,
          orderNumber: nomorOrder,
          status: 'COMPLETED',
          subtotal,
          taxAmount,
          totalAmount: total,
          paymentMethod: pilihAcak([...METODE]),
          createdAt: waktu,
          updatedAt: waktu,
          items: {
            create: itemTerpilih.map((m, i) => ({
              menuItemId: m.id,
              quantity: qtyPerItem[i],
              unitPrice: m.price,
              subtotal: m.price * qtyPerItem[i],
            }))
          }
        }
      })
    }
  }

  return { branchId: branch.id, jumlahMenu: menuCreated.length }
}

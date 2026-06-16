# Z Resto 🍽️
**Sistem manajemen rumah makan franchise** — web app multi-tenant berbasis Next.js + PostgreSQL (Railway).

## Stack
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Database**: PostgreSQL via Railway
- **ORM**: Prisma
- **State**: Zustand (cart POS)
- **Auth**: Custom session (cookie HttpOnly)
- **Deploy**: Railway

## Struktur Folder
```
app/
  (auth)/login/         — halaman login
  (dashboard)/
    pos/                — kasir POS
    menu/               — manajemen menu (manajer)
    orders/             — riwayat order
    reports/            — laporan harian
  (hq)/
    overview/           — dashboard HQ semua cabang
    branches/           — manajemen cabang
  api/
    auth/               — login, logout, me
    menu/               — CRUD menu item
    orders/             — buat & list order
    branches/           — list cabang (OWNER only)

lib/
  prisma.ts             — Prisma client singleton
  auth.ts               — session helper
  format.ts             — formatRupiah, generateOrderNumber

stores/
  cart.ts               — Zustand cart store (POS)

types/
  index.ts              — shared TypeScript types

prisma/
  schema.prisma         — skema DB lengkap
  seed.ts               — data awal (tenant, cabang, menu)
```

## Cara Setup

### 1. Railway
1. Buat project baru di [railway.app](https://railway.app)
2. Tambah PostgreSQL service
3. Copy `DATABASE_URL` dari tab Variables

### 2. Environment
```bash
cp .env.example .env
# Edit .env dengan DATABASE_URL dari Railway
```

### 3. Database
```bash
npm run db:push    # Buat tabel dari schema.prisma
npm run db:seed    # Isi data awal
```

### 4. Jalankan
```bash
npm run dev
```

## Akun Default (setelah seed)
| Email | Password | Role |
|-------|----------|------|
| owner@warung.com | password123 | OWNER (HQ) |
| andi@warung.com | password123 | CASHIER (Cabang PTK Barat) |

## Role & Akses
| Role | POS | Menu | Orders | Reports | HQ Dashboard |
|------|-----|------|--------|---------|--------------|
| OWNER | ✓ | ✓ Edit | ✓ Semua cabang | ✓ Semua | ✓ |
| MANAGER | ✓ | ✓ Edit | ✓ Cabangnya | ✓ Cabangnya | ✗ |
| CASHIER | ✓ | ✗ | ✓ Hari ini | ✗ | ✗ |

## Deploy ke Railway
```bash
# Push ke GitHub dulu, lalu:
# 1. Connect repo di Railway dashboard
# 2. Set env variables (DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL)
# 3. Railway auto-deploy setiap push ke main
```

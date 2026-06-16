import { PrismaClient } from "../generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Z Resto...");

  // Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "warung-nusantara" },
    update: {},
    create: { name: "Warung Nusantara", slug: "warung-nusantara" },
  });

  // Cabang
  const branches = await Promise.all([
    prisma.branch.upsert({
      where: { id: "branch-ptk-barat" },
      update: {},
      create: { id: "branch-ptk-barat", tenantId: tenant.id, name: "Cabang Pontianak Barat", city: "Pontianak", address: "Jl. Ahmad Yani No. 12, Pontianak Barat" },
    }),
    prisma.branch.upsert({
      where: { id: "branch-ptk-timur" },
      update: {},
      create: { id: "branch-ptk-timur", tenantId: tenant.id, name: "Cabang Pontianak Timur", city: "Pontianak", address: "Jl. Tanjung Pura No. 88, Pontianak Timur" },
    }),
    prisma.branch.upsert({
      where: { id: "branch-singkawang" },
      update: {},
      create: { id: "branch-singkawang", tenantId: tenant.id, name: "Cabang Singkawang", city: "Singkawang", address: "Jl. Diponegoro No. 45, Singkawang" },
    }),
  ]);

  // User
  const hash = await bcrypt.hash("password123", 10);
  await prisma.user.upsert({
    where: { email: "owner@warung.com" },
    update: {},
    create: { tenantId: tenant.id, name: "Budi Santoso", email: "owner@warung.com", passwordHash: hash, role: "OWNER" },
  });
  await prisma.user.upsert({
    where: { email: "andi@warung.com" },
    update: {},
    create: { tenantId: tenant.id, branchId: branches[0].id, name: "Andi", email: "andi@warung.com", passwordHash: hash, role: "CASHIER" },
  });

  // Kategori
  const cats = await Promise.all([
    prisma.category.create({ data: { tenantId: tenant.id, name: "Nasi", sortOrder: 1 } }),
    prisma.category.create({ data: { tenantId: tenant.id, name: "Lauk", sortOrder: 2 } }),
    prisma.category.create({ data: { tenantId: tenant.id, name: "Sayur", sortOrder: 3 } }),
    prisma.category.create({ data: { tenantId: tenant.id, name: "Minuman", sortOrder: 4 } }),
    prisma.category.create({ data: { tenantId: tenant.id, name: "Dessert", sortOrder: 5 } }),
  ]);

  // Menu
  await prisma.menuItem.createMany({
    data: [
      { tenantId: tenant.id, categoryId: cats[0].id, name: "Nasi Putih", price: 5000 },
      { tenantId: tenant.id, categoryId: cats[0].id, name: "Nasi Goreng Spesial", price: 25000 },
      { tenantId: tenant.id, categoryId: cats[0].id, name: "Nasi Uduk", price: 15000 },
      { tenantId: tenant.id, categoryId: cats[1].id, name: "Ayam Goreng", price: 20000 },
      { tenantId: tenant.id, categoryId: cats[1].id, name: "Ikan Bakar", price: 35000 },
      { tenantId: tenant.id, categoryId: cats[1].id, name: "Tempe Goreng", price: 8000 },
      { tenantId: tenant.id, categoryId: cats[2].id, name: "Sayur Asem", price: 12000 },
      { tenantId: tenant.id, categoryId: cats[2].id, name: "Tumis Kangkung", price: 15000 },
      { tenantId: tenant.id, categoryId: cats[3].id, name: "Es Teh Manis", price: 8000 },
      { tenantId: tenant.id, categoryId: cats[3].id, name: "Jus Jeruk", price: 15000 },
      { tenantId: tenant.id, categoryId: cats[3].id, name: "Air Mineral", price: 5000 },
      { tenantId: tenant.id, categoryId: cats[4].id, name: "Pisang Goreng", price: 12000 },
    ],
  });

  // Meja untuk cabang 1
  await prisma.diningTable.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      branchId: branches[0].id,
      number: `${i + 1}`,
      capacity: i < 5 ? 4 : 6,
    })),
  });

  console.log("Seed selesai ✓");
}

main().catch(console.error).finally(() => prisma.$disconnect());

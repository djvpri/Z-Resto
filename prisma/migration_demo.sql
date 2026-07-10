-- Migration: Dukungan tenant demo di Z-Resto
-- Jalankan via Railway Console:
--   node -e "require('./node_modules/@prisma/client'); const {Pool}=require('pg'); const p=new Pool({connectionString:process.env.DATABASE_URL}); p.query('ALTER TABLE \"Tenant\" ADD COLUMN IF NOT EXISTS \"isDemo\" boolean NOT NULL DEFAULT false').then(()=>console.log('ok')).catch(console.error)"
-- 
-- Atau via psql jika tersedia:
--   psql $DATABASE_URL -c 'ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "isDemo" boolean NOT NULL DEFAULT false;'
--
-- Setelah kolom ada, tandai tenant demo:
--   UPDATE "Tenant" SET "isDemo" = true WHERE slug = 'warung-nusantara';

ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "isDemo" boolean NOT NULL DEFAULT false;

-- Tandai tenant demo yang sudah ada dari seed
UPDATE "Tenant" SET "isDemo" = true WHERE slug = 'warung-nusantara';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaPg } = require('@prisma/adapter-pg')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require('pg')
require('dotenv').config()

const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('Please define DATABASE_URL or DIRECT_DATABASE_URL in .env')
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })


async function main() {
  console.log('🌱 Seeding DurenUcok POS...')

  const pancake = await prisma.category.upsert({ where: { name: 'Pancake Durian' }, update: {}, create: { name: 'Pancake Durian', emoji: '🥞', color: '#F59E0B' } })
  const minuman = await prisma.category.upsert({ where: { name: 'Minuman Durian' }, update: {}, create: { name: 'Minuman Durian', emoji: '🥤', color: '#06B6D4' } })
  const dessert = await prisma.category.upsert({ where: { name: 'Dessert' }, update: {}, create: { name: 'Dessert', emoji: '🍮', color: '#8B5CF6' } })
  const frozen = await prisma.category.upsert({ where: { name: 'Frozen' }, update: {}, create: { name: 'Frozen', emoji: '🧊', color: '#3B82F6' } })
  const bundling = await prisma.category.upsert({ where: { name: 'Paket Bundling' }, update: {}, create: { name: 'Paket Bundling', emoji: '🎁', color: '#EF4444' } })
  console.log('✅ 5 Categories seeded')

  await prisma.cashier.upsert({ where: { id: 1 }, update: {}, create: { id: 1, name: 'Admin', pin: '1234' } })
  await prisma.cashier.upsert({ where: { id: 2 }, update: {}, create: { id: 2, name: 'Sari', pin: '5678' } })
  console.log('✅ Cashiers seeded')

  const productData = [
    { name: 'Pancake Durian Original', description: 'Pancake lembut isi cream & daging durian asli', price: 18000, emoji: '🥞', categoryId: pancake.id, stock: 50 },
    { name: 'Pancake Durian Premium', description: 'Pancake tebal dengan durian Musang King pilihan', price: 28000, emoji: '🥞', categoryId: pancake.id, stock: 30 },
    { name: 'Pancake Durian Mini (6 pcs)', description: 'Kotak 6 pancake mini, cocok untuk oleh-oleh', price: 45000, emoji: '🥞', categoryId: pancake.id, stock: 20 },
    { name: 'Pancake Durian XL', description: 'Pancake jumbo double filling durian', price: 35000, emoji: '🥞', categoryId: pancake.id, stock: 25 },
    { name: 'Es Durian Cup Small', description: 'Es durian segar ukuran 200ml', price: 12000, emoji: '🧋', categoryId: minuman.id, stock: null },
    { name: 'Es Durian Cup Large', description: 'Es durian segar ukuran 350ml', price: 18000, emoji: '🧋', categoryId: minuman.id, stock: null },
    { name: 'Durian Milk Shake', description: 'Milkshake durian dengan susu segar', price: 22000, emoji: '🥛', categoryId: minuman.id, stock: null },
    { name: 'Durian Juice Segar', description: 'Jus durian murni tanpa pemanis tambahan', price: 15000, emoji: '🍹', categoryId: minuman.id, stock: null },
    { name: 'Durian Smoothie', description: 'Smoothie durian blend dengan yogurt', price: 25000, emoji: '🥤', categoryId: minuman.id, stock: null },
    { name: 'Dessert Cup Durian', description: 'Layered dessert durian + pudding vanilla', price: 28000, emoji: '🍮', categoryId: dessert.id, stock: 40 },
    { name: 'Durian Cheese Cup', description: 'Dessert durian dengan topping keju mozarella', price: 35000, emoji: '🧀', categoryId: dessert.id, stock: 30 },
    { name: 'Durian Pudding Cup', description: 'Pudding durian creamy dengan saus gula merah', price: 18000, emoji: '🍮', categoryId: dessert.id, stock: 40 },
    { name: 'Frozen Durian 250gr', description: 'Daging durian premium beku siap saji 250gr', price: 55000, emoji: '🧊', categoryId: frozen.id, stock: 30 },
    { name: 'Frozen Durian 500gr', description: 'Daging durian premium beku siap saji 500gr', price: 95000, emoji: '🧊', categoryId: frozen.id, stock: 20 },
    { name: 'Pancake Frozen Pack (10 pcs)', description: 'Pancake durian beku isi 10, tahan 1 bulan', price: 75000, emoji: '📦', categoryId: frozen.id, stock: 15 },
    { name: 'Bundling Hemat A', description: '2 Pancake Original + 1 Es Durian Large', price: 42000, emoji: '🎁', categoryId: bundling.id, stock: null },
    { name: 'Bundling Hemat B', description: '1 Dessert Cup + 1 Durian Juice', price: 38000, emoji: '🎁', categoryId: bundling.id, stock: null },
    { name: 'Paket Family', description: '6 Pancake + 2 Es Durian + 2 Juice Durian', price: 110000, emoji: '👨‍👩‍👧', categoryId: bundling.id, stock: null },
    { name: 'Bundling GoFood Special', description: '1 Pancake Premium + 1 Smoothie + 1 Dessert Cup', price: 68000, emoji: '🛵', categoryId: bundling.id, stock: null },
  ]

  for (const p of productData) {
    await prisma.product.create({ data: p })
  }

  console.log(`✅ ${productData.length} produk berhasil ditambahkan`)
  console.log('\n🎉 Seeding selesai! DurenUcok POS siap digunakan.')
  console.log('  - Admin (PIN: 1234)')
  console.log('  - Sari  (PIN: 5678)')
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })

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
  console.log('🌱 Seeding 2 months of dummy transactions...')

  // 1. Ensure categories and products exist, if not seed them
  let categories = await prisma.category.findMany()
  if (categories.length === 0) {
    console.log('No categories found, seeding categories first...')
    const pancake = await prisma.category.create({ data: { name: 'Pancake Durian', emoji: '🥞', color: '#F59E0B' } })
    const minuman = await prisma.category.create({ data: { name: 'Minuman Durian', emoji: '🥤', color: '#06B6D4' } })
    const dessert = await prisma.category.create({ data: { name: 'Dessert', emoji: '🍮', color: '#8B5CF6' } })
    const frozen = await prisma.category.create({ data: { name: 'Frozen', emoji: '🧊', color: '#3B82F6' } })
    const bundling = await prisma.category.create({ data: { name: 'Paket Bundling', emoji: '🎁', color: '#EF4444' } })
    categories = [pancake, minuman, dessert, frozen, bundling]
  }

  let products = await prisma.product.findMany({ where: { isActive: true } })
  if (products.length === 0) {
    console.log('No products found, seeding products first...')
    const pancakeId = categories.find((c: any) => c.name === 'Pancake Durian')?.id || categories[0].id
    const minumanId = categories.find((c: any) => c.name === 'Minuman Durian')?.id || categories[0].id
    const dessertId = categories.find((c: any) => c.name === 'Dessert')?.id || categories[0].id
    const frozenId = categories.find((c: any) => c.name === 'Frozen')?.id || categories[0].id
    const bundlingId = categories.find((c: any) => c.name === 'Paket Bundling')?.id || categories[0].id

    const productData = [
      { name: 'Pancake Durian Original', description: 'Pancake lembut isi cream & daging durian asli', price: 18000, emoji: '🥞', categoryId: pancakeId, stock: 50 },
      { name: 'Pancake Durian Premium', description: 'Pancake tebal dengan durian Musang King pilihan', price: 28000, emoji: '🥞', categoryId: pancakeId, stock: 30 },
      { name: 'Es Durian Cup Small', description: 'Es durian segar ukuran 200ml', price: 12000, emoji: '🧋', categoryId: minumanId, stock: null },
      { name: 'Es Durian Cup Large', description: 'Es durian segar ukuran 350ml', price: 18000, emoji: '🧋', categoryId: minumanId, stock: null },
      { name: 'Dessert Cup Durian', description: 'Layered dessert durian + pudding vanilla', price: 28000, emoji: '🍮', categoryId: dessertId, stock: 40 },
      { name: 'Frozen Durian 250gr', description: 'Daging durian premium beku siap saji 250gr', price: 55000, emoji: '🧊', categoryId: frozenId, stock: 30 },
      { name: 'Bundling Hemat A', description: '2 Pancake Original + 1 Es Durian Large', price: 42000, emoji: '🎁', categoryId: bundlingId, stock: null }
    ]

    for (const p of productData) {
      await prisma.product.create({ data: p })
    }
    products = await prisma.product.findMany({ where: { isActive: true } })
  }

  // 2. Ensure cashiers exist
  let cashiers = await prisma.cashier.findMany({ where: { isActive: true } })
  if (cashiers.length === 0) {
    console.log('No cashiers found, seeding Admin and Sari...')
    const admin = await prisma.cashier.create({ data: { name: 'Admin', pin: '1234' } })
    const sari = await prisma.cashier.create({ data: { name: 'Sari', pin: '5678' } })
    cashiers = [admin, sari]
  } else if (cashiers.length === 1) {
    const sari = await prisma.cashier.create({ data: { name: 'Sari', pin: '5678' } })
    cashiers.push(sari)
  }

  const today = new Date()
  const paymentMethods = ['CASH', 'QRIS', 'TRANSFER']
  let totalTransactionsSeeded = 0

  for (let i = 60; i >= 0; i--) {
    const currentDate = new Date(today)
    currentDate.setDate(today.getDate() - i)
    const dateStr = currentDate.toISOString().slice(0, 10)
    
    const startOfDay = new Date(currentDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(currentDate)
    endOfDay.setHours(23, 59, 59, 999)

    console.log(`Processing Date: ${dateStr} (${i} days ago)`)

    // Ensure sessions for both cashiers exist for this day
    const cashierSessions: Record<number, any> = {}
    for (const cashier of cashiers) {
      let session = await prisma.cashierSession.findFirst({
        where: {
          cashierId: cashier.id,
          openedAt: { gte: startOfDay, lte: endOfDay }
        }
      })

      if (!session) {
        session = await prisma.cashierSession.create({
          data: {
            cashierId: cashier.id,
            startCash: 100000,
            endCash: 0, // Will calculate this later
            status: 'CLOSED',
            openedAt: new Date(startOfDay.getTime() + (8 * 60 + Math.floor(Math.random() * 60)) * 60 * 1000), // ~8-9 AM
            closedAt: new Date(startOfDay.getTime() + (17 * 60 + Math.floor(Math.random() * 120)) * 60 * 1000), // ~5-7 PM
          }
        })
      }
      cashierSessions[cashier.id] = session
    }

    // Generate random transactions for this day
    const txCount = 8 + Math.floor(Math.random() * 8) // 8 to 15 transactions
    for (let t = 0; t < txCount; t++) {
      const cashier = cashiers[Math.floor(Math.random() * cashiers.length)]
      const session = cashierSessions[cashier.id]

      // Pick random items
      const itemsCount = 1 + Math.floor(Math.random() * 3)
      const txItems = []
      let subtotal = 0
      const pickedProductIds = new Set<number>()

      for (let j = 0; j < itemsCount; j++) {
        let product = products[Math.floor(Math.random() * products.length)]
        let attempts = 0
        while (pickedProductIds.has(product.id) && attempts < 10) {
          product = products[Math.floor(Math.random() * products.length)]
          attempts++
        }
        pickedProductIds.add(product.id)

        const qty = 1 + Math.floor(Math.random() * 3)
        const itemSubtotal = product.price * qty

        txItems.push({
          productId: product.id,
          productName: product.name,
          productPrice: product.price,
          qty,
          discount: 0,
          subtotal: itemSubtotal
        })
        subtotal += itemSubtotal
      }

      // Random discount
      let discountAmount = 0
      if (Math.random() < 0.15 && subtotal > 20000) {
        discountAmount = Math.random() < 0.5 ? 5000 : 10000
      }
      const total = subtotal - discountAmount

      // Payment Method and payment amount
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)]
      let amountPaid = total
      if (paymentMethod === 'CASH') {
        const cashOptions = [total]
        const roundings = [5000, 10000, 20000, 50000, 100000]
        for (const r of roundings) {
          if (r > total) {
            cashOptions.push(r)
          }
        }
        amountPaid = cashOptions[Math.floor(Math.random() * cashOptions.length)]
      }
      const change = amountPaid - total

      // Invoice
      const randomId = Math.floor(100000 + Math.random() * 900000)
      const invoiceNumber = `INV-${dateStr.replace(/-/g, '')}-${randomId}`

      // Random time of day between 9 AM and 8:30 PM
      const hour = 9 + Math.floor(Math.random() * 11)
      const minute = Math.floor(Math.random() * 60)
      const second = Math.floor(Math.random() * 60)
      const txCreatedAt = new Date(currentDate)
      txCreatedAt.setHours(hour, minute, second, 0)

      await prisma.transaction.create({
        data: {
          invoiceNumber,
          cashierId: cashier.id,
          sessionId: session.id,
          subtotal,
          discountAmount,
          total,
          paymentMethod,
          amountPaid,
          change,
          status: 'COMPLETED',
          createdAt: txCreatedAt,
          items: {
            create: txItems.map((item: any) => ({
              productId: item.productId,
              productName: item.productName,
              productPrice: item.productPrice,
              qty: item.qty,
              discount: item.discount,
              subtotal: item.subtotal
            }))
          }
        }
      })
      totalTransactionsSeeded++
    }

    // Update endCash for sessions
    for (const cashier of cashiers) {
      const session = cashierSessions[cashier.id]
      const txs = await prisma.transaction.findMany({
        where: { sessionId: session.id, status: 'COMPLETED' }
      })
      const totalSessionRevenue = txs.reduce((sum: number, t: any) => sum + t.total, 0)
      await prisma.cashierSession.update({
        where: { id: session.id },
        data: { endCash: session.startCash + totalSessionRevenue }
      })
    }
  }

  console.log(`\n🎉 Seeded successfully! Total ${totalTransactionsSeeded} transactions seeded across 61 days (2 months).`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

export {}

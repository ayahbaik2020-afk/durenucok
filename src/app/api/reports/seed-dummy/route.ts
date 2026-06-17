import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const dateStr = searchParams.get('date') || new Date().toISOString().slice(0, 10)

    const date = new Date(dateStr)
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    // 1. Get products
    const products = await prisma.product.findMany({ where: { isActive: true } })
    if (products.length === 0) {
      return Response.json({ error: 'Belum ada produk aktif di database. Silakan tambahkan produk terlebih dahulu.' }, { status: 400 })
    }

    // 2. Get cashiers or create default
    let cashiers = await prisma.cashier.findMany({ where: { isActive: true } })
    if (cashiers.length === 0) {
      const defaultCashier = await prisma.cashier.create({
        data: { name: 'Admin', pin: '1234' }
      })
      cashiers = [defaultCashier]
    }

    // 3. Ensure cashier sessions exist for this day
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
            endCash: 0, // Will update this later
            status: 'CLOSED',
            openedAt: new Date(startOfDay.getTime() + (8 * 60 + Math.floor(Math.random() * 60)) * 60 * 1000), // ~8-9 AM
            closedAt: new Date(startOfDay.getTime() + (17 * 60 + Math.floor(Math.random() * 120)) * 60 * 1000), // ~5-7 PM
          }
        })
      }
      cashierSessions[cashier.id] = session
    }

    // 4. Generate 10-15 random transactions
    const transactionCount = 10 + Math.floor(Math.random() * 6) // 10 to 15
    const createdTransactions = []

    const paymentMethods = ['CASH', 'QRIS', 'TRANSFER']

    for (let i = 0; i < transactionCount; i++) {
      // Pick random cashier
      const cashier = cashiers[Math.floor(Math.random() * cashiers.length)]
      const session = cashierSessions[cashier.id]

      // Pick random items count (1 to 3)
      const itemsCount = 1 + Math.floor(Math.random() * 3)
      const txItems = []
      let subtotal = 0

      // Keep track of picked product ids to avoid duplicates in the same transaction
      const pickedProductIds = new Set<number>()

      for (let j = 0; j < itemsCount; j++) {
        let product = products[Math.floor(Math.random() * products.length)]
        // Avoid duplicate product in the same invoice
        let attempts = 0
        while (pickedProductIds.has(product.id) && attempts < 10) {
          product = products[Math.floor(Math.random() * products.length)]
          attempts++
        }
        pickedProductIds.add(product.id)

        const qty = 1 + Math.floor(Math.random() * 3) // 1-3 qty
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

      // Random discount (15% chance to have discount 5000 or 10000)
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
        // find next 5,000, 10,000, 20,000, 50,000 or 100,000
        const roundings = [5000, 10000, 20000, 50000, 100000]
        for (const r of roundings) {
          if (r > total) {
            cashOptions.push(r)
          }
        }
        amountPaid = cashOptions[Math.floor(Math.random() * cashOptions.length)]
      }
      const change = amountPaid - total

      // Generate invoice
      const randomId = Math.floor(100000 + Math.random() * 900000)
      const invoiceNumber = `INV-${dateStr.replace(/-/g, '')}-${randomId}`

      // Random time of day between 9 AM and 8 PM
      const hour = 9 + Math.floor(Math.random() * 11)
      const minute = Math.floor(Math.random() * 60)
      const second = Math.floor(Math.random() * 60)
      const txCreatedAt = new Date(date)
      txCreatedAt.setHours(hour, minute, second, 0)

      const tx = await prisma.transaction.create({
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
            create: txItems.map(item => ({
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
      createdTransactions.push(tx)
    }

    // 6. Update endCash for each session to match total revenue generated in the session
    for (const cashier of cashiers) {
      const session = cashierSessions[cashier.id]
      const txs = await prisma.transaction.findMany({
        where: { sessionId: session.id, status: 'COMPLETED' }
      })
      const totalSessionRevenue = txs.reduce((sum, t) => sum + t.total, 0)
      await prisma.cashierSession.update({
        where: { id: session.id },
        data: { endCash: session.startCash + totalSessionRevenue }
      })
    }

    return Response.json({
      success: true,
      message: `Berhasil menambahkan ${createdTransactions.length} transaksi dummy untuk tanggal ${dateStr}.`,
      count: createdTransactions.length
    })

  } catch (error: any) {
    console.error('Failed to seed dummy transactions:', error)
    return Response.json({ error: 'Gagal membuat transaksi dummy: ' + (error.message || error) }, { status: 500 })
  }
}

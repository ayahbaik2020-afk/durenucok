import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/reports/daily?date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const dateStr = searchParams.get('date') || new Date().toISOString().slice(0, 10)

  const startDate = new Date(dateStr)
  startDate.setHours(0, 0, 0, 0)
  const endDate = new Date(dateStr)
  endDate.setHours(23, 59, 59, 999)

  const transactions = await prisma.transaction.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: 'COMPLETED',
    },
    include: { items: true, cashier: true },
  })

  const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0)
  const totalTransactions = transactions.length

  // Top products
  const productMap = new Map<number, { name: string; emoji: string; totalQty: number; totalRevenue: number }>()
  for (const tx of transactions) {
    for (const item of tx.items) {
      const existing = productMap.get(item.productId)
      if (existing) {
        existing.totalQty += item.qty
        existing.totalRevenue += item.subtotal
      } else {
        productMap.set(item.productId, {
          name: item.productName,
          emoji: '🍧',
          totalQty: item.qty,
          totalRevenue: item.subtotal,
        })
      }
    }
  }

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.totalQty - a.totalQty)
    .slice(0, 5)

  // Per cashier
  const cashierMap = new Map<number, { cashierName: string; totalTransactions: number; totalRevenue: number }>()
  for (const tx of transactions) {
    const existing = cashierMap.get(tx.cashierId)
    if (existing) {
      existing.totalTransactions += 1
      existing.totalRevenue += tx.total
    } else {
      cashierMap.set(tx.cashierId, {
        cashierName: tx.cashier.name,
        totalTransactions: 1,
        totalRevenue: tx.total,
      })
    }
  }

  // Payment breakdown
  const paymentMap = new Map<string, { method: string; count: number; total: number }>()
  for (const tx of transactions) {
    const existing = paymentMap.get(tx.paymentMethod)
    if (existing) {
      existing.count += 1
      existing.total += tx.total
    } else {
      paymentMap.set(tx.paymentMethod, {
        method: tx.paymentMethod,
        count: 1,
        total: tx.total,
      })
    }
  }

  return Response.json({
    date: dateStr,
    totalTransactions,
    totalRevenue,
    topProducts,
    perCashier: Array.from(cashierMap.values()),
    paymentBreakdown: Array.from(paymentMap.values()),
  })
}

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/reports?date=YYYY-MM-DD&period=daily|weekly|monthly
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const dateStr = searchParams.get('date') || new Date().toISOString().slice(0, 10)
    const period = searchParams.get('period') || 'daily'

    const date = new Date(dateStr)
    let startDate: Date
    let endDate: Date

    if (period === 'weekly') {
      // Monday to Sunday week of the selected date
      startDate = new Date(date)
      const day = startDate.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1)
      startDate.setDate(diff)
      startDate.setHours(0, 0, 0, 0)
      
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      endDate.setHours(23, 59, 59, 999)
    } else if (period === 'monthly') {
      // Calendar month of the selected date
      startDate = new Date(date)
      startDate.setDate(1)
      startDate.setHours(0, 0, 0, 0)
      
      endDate = new Date(date)
      endDate.setMonth(endDate.getMonth() + 1)
      endDate.setDate(0)
      endDate.setHours(23, 59, 59, 999)
    } else {
      // Daily
      startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      
      endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
      include: { items: true, cashier: true },
    })

    const totalRevenue = transactions.reduce((sum: number, t: any) => sum + t.total, 0)
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

    // Create localized date range label
    const formatDateLabel = () => {
      const startStr = startDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
      if (period === 'weekly') {
        const endStr = endDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
        return `Mingguan (${startStr} - ${endStr})`
      } else if (period === 'monthly') {
        return `Bulanan (${startDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})`
      } else {
        return `Harian (${startDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })})`
      }
    }
    const dateLabel = formatDateLabel()

    return Response.json({
      date: dateStr,
      dateLabel,
      totalTransactions,
      totalRevenue,
      topProducts,
      perCashier: Array.from(cashierMap.values()),
      paymentBreakdown: Array.from(paymentMap.values()),
    })
  } catch (error: any) {
    console.error('Failed to compile report:', error)
    return Response.json({ error: 'Gagal membuat laporan: ' + (error.message || error) }, { status: 500 })
  }
}

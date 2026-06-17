import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateInvoiceNumber } from '@/lib/utils'

// GET /api/transactions
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const date = searchParams.get('date') // YYYY-MM-DD
  const cashierId = searchParams.get('cashierId')

  let startDate: Date | undefined
  let endDate: Date | undefined

  if (date) {
    startDate = new Date(date)
    startDate.setHours(0, 0, 0, 0)
    endDate = new Date(date)
    endDate.setHours(23, 59, 59, 999)
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      ...(startDate && endDate
        ? { createdAt: { gte: startDate, lte: endDate } }
        : {}),
      ...(cashierId ? { cashierId: parseInt(cashierId) } : {}),
      status: 'COMPLETED',
    },
    include: {
      items: true,
      cashier: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json(transactions)
}

// POST /api/transactions — create transaction
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { cashierId, sessionId, items, paymentMethod, amountPaid, note, discountAmount } = body

  const subtotal: number = items.reduce(
    (sum: number, item: { qty: number; productPrice: number }) =>
      sum + item.qty * item.productPrice,
    0
  )
  const total = subtotal - (discountAmount || 0)
  const change = paymentMethod === 'CASH' ? amountPaid - total : 0

  const invoiceNumber = generateInvoiceNumber()

  const transaction = await prisma.$transaction(async (tx) => {
    // Create transaction
    const newTx = await tx.transaction.create({
      data: {
        invoiceNumber,
        cashierId,
        sessionId,
        subtotal,
        discountAmount: discountAmount || 0,
        total,
        paymentMethod,
        amountPaid,
        change,
        note,
        status: 'COMPLETED',
        items: {
          create: items.map((item: {
            productId: number
            productName: string
            productPrice: number
            qty: number
            discount: number
            subtotal: number
          }) => ({
            productId: item.productId,
            productName: item.productName,
            productPrice: item.productPrice,
            qty: item.qty,
            discount: item.discount || 0,
            subtotal: item.subtotal,
          })),
        },
      },
      include: {
        items: true,
        cashier: true,
      },
    })

    // Reduce stock if product has stock set
    for (const item of items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } })
      if (product && product.stock !== null) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: Math.max(0, product.stock - item.qty) },
        })
      }
    }

    return newTx
  })

  return Response.json(transaction, { status: 201 })
}

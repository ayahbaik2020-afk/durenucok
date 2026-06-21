import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/stock/waste — record waste
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { productId, qty, reason, note } = body

  const waste = await prisma.$transaction(async (tx) => {
    const newWaste = await tx.stockWaste.create({
      data: { productId, qty, reason, note },
      include: { product: true },
    })
    // Reduce stock
    const product = await tx.product.findUnique({ where: { id: productId } })
    if (product && product.stock !== null) {
      await tx.product.update({
        where: { id: productId },
        data: { stock: Math.max(0, product.stock - qty) },
      })
      // Create stock movement
      await tx.stockMovement.create({
        data: {
          productId,
          type: 'WASTE',
          refType: 'StockWaste',
          refId: newWaste.id,
          qtyIn: 0,
          qtyOut: qty,
          note: `Waste: ${reason} (${note || 'Tidak ada catatan'})`,
        },
      })
    }
    return newWaste
  })

  return Response.json(waste, { status: 201 })
}

// GET /api/stock/waste — list wastes
export async function GET() {
  const wastes = await prisma.stockWaste.findMany({
    include: { product: { include: { category: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return Response.json(wastes)
}

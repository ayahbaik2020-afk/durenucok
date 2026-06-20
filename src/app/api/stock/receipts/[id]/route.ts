import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const parsedId = Number(id)
  const body = await request.json()
  const status = body.status as 'DRAFT' | 'POSTED' | 'CANCELLED'

  const receipt = await prisma.$transaction(async (tx) => {
    const current = await tx.stockReceipt.findUnique({ include: { items: true }, where: { id: parsedId } })
    if (!current) throw new Error('Receipt not found')

    if (current.status !== 'POSTED' && status === 'POSTED') {
      for (const item of current.items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.qty } } })
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            warehouseId: current.warehouseId,
            type: 'RECEIPT',
            refType: 'StockReceipt',
            refId: current.id,
            qtyIn: item.qty,
            qtyOut: 0,
            note: `Stok masuk ${current.receiptNumber}`,
          },
        })
      }
    }

    if (current.status === 'POSTED' && status !== 'POSTED') {
      for (const item of current.items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.qty } } })
      }
    }

    return tx.stockReceipt.update({
      where: { id: parsedId },
      data: { status },
      include: { supplier: true, warehouse: true, items: { include: { product: true } } },
    })
  })

  return Response.json(receipt)
}

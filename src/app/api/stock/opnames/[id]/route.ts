import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const parsedId = Number(id)
  const body = await request.json()
  const status = body.status as 'DRAFT' | 'APPROVED' | 'CANCELLED'

  const opname = await prisma.$transaction(async (tx) => {
    const current = await tx.stockOpname.findUnique({ include: { items: true }, where: { id: parsedId } })
    if (!current) throw new Error('Opname not found')

    if (current.status !== 'APPROVED' && status === 'APPROVED') {
      for (const item of current.items) {
        const diff = item.physicalStock - item.systemStock
        await tx.product.update({ where: { id: item.productId }, data: { stock: item.physicalStock } })
        if (diff !== 0) {
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              warehouseId: current.warehouseId,
              type: 'OPNAME_ADJUSTMENT',
              refType: 'StockOpname',
              refId: current.id,
              qtyIn: diff > 0 ? diff : 0,
              qtyOut: diff < 0 ? Math.abs(diff) : 0,
              note: `Penyesuaian opname ${current.opnameNumber}`,
            },
          })
        }
      }
    }

    return tx.stockOpname.update({
      where: { id: parsedId },
      data: { status },
      include: { warehouse: true, items: { include: { product: true } } },
    })
  })

  return Response.json(opname)
}

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const opnames = await prisma.stockOpname.findMany({
    include: { warehouse: true, items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return Response.json(opnames)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const status = body.status ?? 'DRAFT'

  const opname = await prisma.$transaction(async (tx) => {
    const created = await tx.stockOpname.create({
      data: {
        opnameNumber: body.opnameNumber,
        warehouseId: body.warehouseId ?? null,
        opnameDate: body.opnameDate ? new Date(body.opnameDate) : new Date(),
        status,
        note: body.note ?? null,
        items: body.items ? {
          create: body.items.map((item: any) => ({
            productId: item.productId,
            systemStock: item.systemStock,
            physicalStock: item.physicalStock,
            difference: item.difference ?? (item.physicalStock - item.systemStock),
            reason: item.reason ?? null,
          })),
        } : undefined,
      },
      include: { items: true },
    })

    if (status === 'APPROVED') {
      for (const item of created.items) {
        const diff = item.physicalStock - item.systemStock
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: item.physicalStock },
        })
        if (diff !== 0) {
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              warehouseId: body.warehouseId ?? null,
              type: 'OPNAME_ADJUSTMENT',
              refType: 'StockOpname',
              refId: created.id,
              qtyIn: diff > 0 ? diff : 0,
              qtyOut: diff < 0 ? Math.abs(diff) : 0,
              note: `Penyesuaian opname ${created.opnameNumber}`,
            },
          })
        }
      }
    }

    return tx.stockOpname.findUnique({
      where: { id: created.id },
      include: { warehouse: true, items: { include: { product: true } } },
    })
  })

  return Response.json(opname, { status: 201 })
}

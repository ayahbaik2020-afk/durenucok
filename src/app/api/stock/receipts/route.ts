import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const receipts = await prisma.stockReceipt.findMany({
    include: { supplier: true, warehouse: true, items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return Response.json(receipts)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const status = body.status ?? 'DRAFT'

  const receipt = await prisma.$transaction(async (tx) => {
    const created = await tx.stockReceipt.create({
      data: {
        receiptNumber: body.receiptNumber,
        supplierId: body.supplierId ?? null,
        warehouseId: body.warehouseId ?? null,
        receiptDate: body.receiptDate ? new Date(body.receiptDate) : new Date(),
        documentNo: body.documentNo ?? null,
        status,
        note: body.note ?? null,
        totalAmount: body.totalAmount ?? 0,
        items: body.items ? {
          create: body.items.map((item: any) => ({
            productId: item.productId,
            qty: item.qty,
            unitPrice: item.unitPrice ?? 0,
            subtotal: item.subtotal ?? item.qty * (item.unitPrice ?? 0),
          })),
        } : undefined,
      },
      include: { items: true },
    })

    if (status === 'POSTED') {
      for (const item of created.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.qty } },
        })
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            warehouseId: body.warehouseId ?? null,
            type: 'RECEIPT',
            refType: 'StockReceipt',
            refId: created.id,
            qtyIn: item.qty,
            qtyOut: 0,
            note: `Stok masuk ${created.receiptNumber}`,
          },
        })
      }
    }

    return tx.stockReceipt.findUnique({
      where: { id: created.id },
      include: { supplier: true, warehouse: true, items: { include: { product: true } } },
    })
  })

  return Response.json(receipt, { status: 201 })
}

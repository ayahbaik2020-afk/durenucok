import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const dateStr = searchParams.get('date') || new Date().toISOString().slice(0, 10)
  const period = searchParams.get('period') || 'daily'

  const date = new Date(dateStr)
  let startDate: Date
  let endDate: Date

  if (period === 'weekly') {
    startDate = new Date(date)
    const day = startDate.getDay()
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1)
    startDate.setDate(diff)
    startDate.setHours(0, 0, 0, 0)
    endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)
    endDate.setHours(23, 59, 59, 999)
  } else if (period === 'monthly') {
    startDate = new Date(date)
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)
    endDate = new Date(date)
    endDate.setMonth(endDate.getMonth() + 1)
    endDate.setDate(0)
    endDate.setHours(23, 59, 59, 999)
  } else {
    startDate = new Date(date)
    startDate.setHours(0, 0, 0, 0)
    endDate = new Date(date)
    endDate.setHours(23, 59, 59, 999)
  }

  const receipts = await prisma.stockReceipt.findMany({
    where: { receiptDate: { gte: startDate, lte: endDate }, status: 'POSTED' },
    include: { supplier: true, warehouse: true, items: { include: { product: true } } },
    orderBy: { receiptDate: 'desc' },
  })

  const totalReceipts = receipts.length
  const totalQty = receipts.reduce((s, r) => s + r.items.reduce((a, i) => a + i.qty, 0), 0)
  const totalCost = receipts.reduce((s, r) => s + r.items.reduce((a, i) => a + i.subtotal, 0), 0)

  const supplierMap = new Map<string, { supplier: string; totalQty: number; totalCost: number; count: number }>()
  const warehouseMap = new Map<string, { warehouse: string; totalQty: number; totalCost: number; count: number }>()
  const productMap = new Map<string, { product: string; totalQty: number; totalCost: number; count: number }>()

  for (const r of receipts) {
    const supplierKey = r.supplier?.name || 'Tanpa Supplier'
    const warehouseKey = r.warehouse?.name || 'Tanpa Gudang'
    const rowQty = r.items.reduce((a, i) => a + i.qty, 0)
    const rowCost = r.items.reduce((a, i) => a + i.subtotal, 0)

    const supplierExisting = supplierMap.get(supplierKey)
    if (supplierExisting) {
      supplierExisting.count += 1
      supplierExisting.totalQty += rowQty
      supplierExisting.totalCost += rowCost
    } else {
      supplierMap.set(supplierKey, { supplier: supplierKey, count: 1, totalQty: rowQty, totalCost: rowCost })
    }

    const warehouseExisting = warehouseMap.get(warehouseKey)
    if (warehouseExisting) {
      warehouseExisting.count += 1
      warehouseExisting.totalQty += rowQty
      warehouseExisting.totalCost += rowCost
    } else {
      warehouseMap.set(warehouseKey, { warehouse: warehouseKey, count: 1, totalQty: rowQty, totalCost: rowCost })
    }

    for (const item of r.items) {
      const productKey = item.product?.name || 'Tanpa Produk'
      const productExisting = productMap.get(productKey)
      if (productExisting) {
        productExisting.count += 1
        productExisting.totalQty += item.qty
        productExisting.totalCost += item.subtotal
      } else {
        productMap.set(productKey, { product: productKey, count: 1, totalQty: item.qty, totalCost: item.subtotal })
      }
    }
  }

  return Response.json({
    date: dateStr,
    period,
    totalReceipts,
    totalQty,
    totalCost,
    bySupplier: Array.from(supplierMap.values()).sort((a, b) => b.totalCost - a.totalCost),
    byWarehouse: Array.from(warehouseMap.values()).sort((a, b) => b.totalCost - a.totalCost),
    byProduct: Array.from(productMap.values()).sort((a, b) => b.totalCost - a.totalCost),
    receipts,
  })
}

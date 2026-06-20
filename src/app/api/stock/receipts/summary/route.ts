import { prisma } from '@/lib/prisma'

export async function GET() {
  const receipts = await prisma.stockReceipt.findMany({ include: { items: true } })
  const totalQty = receipts.reduce((s, r) => s + r.items.reduce((a, i) => a + i.qty, 0), 0)
  const totalCost = receipts.reduce((s, r) => s + r.items.reduce((a, i) => a + i.subtotal, 0), 0)
  return Response.json({ totalReceipts: receipts.length, totalQty, totalCost })
}

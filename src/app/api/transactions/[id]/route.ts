import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/transactions/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const transaction = await prisma.transaction.findUnique({
    where: { id: parseInt(id) },
    include: { items: true, cashier: true },
  })
  if (!transaction) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(transaction)
}

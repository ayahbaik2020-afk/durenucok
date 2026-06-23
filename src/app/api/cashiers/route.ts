import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPin } from '@/lib/auth'

// GET /api/cashiers — list all cashiers
export async function GET() {
  const cashiers = await prisma.cashier.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })
  // Strip PIN from response
  return Response.json(cashiers.map(({ pin, ...c }) => c))
}

// POST /api/cashiers — create new cashier
export async function POST(request: NextRequest) {
  const body = await request.json()
  const hashed = await hashPin(body.pin)
  const cashier = await prisma.cashier.create({
    data: {
      name: body.name,
      pin: hashed,
      role: body.role || 'KASIR',
    },
  })
  const { pin, ...rest } = cashier
  return Response.json(rest, { status: 201 })
}

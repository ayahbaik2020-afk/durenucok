import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/cashiers — list all cashiers
export async function GET() {
  const cashiers = await prisma.cashier.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })
  return Response.json(cashiers)
}

// POST /api/cashiers — create new cashier
export async function POST(request: NextRequest) {
  const body = await request.json()
  const cashier = await prisma.cashier.create({
    data: {
      name: body.name,
      pin: body.pin,
    },
  })
  return Response.json(cashier, { status: 201 })
}

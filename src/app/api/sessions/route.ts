import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/sessions — get active session
export async function GET() {
  const session = await prisma.cashierSession.findFirst({
    where: { status: 'OPEN' },
    include: { cashier: true },
    orderBy: { openedAt: 'desc' },
  })
  return Response.json(session)
}

// POST /api/sessions — open new shift
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { cashierId, startCash } = body

  // Close any existing open sessions for this cashier
  await prisma.cashierSession.updateMany({
    where: { cashierId, status: 'OPEN' },
    data: { status: 'CLOSED', closedAt: new Date() },
  })

  const session = await prisma.cashierSession.create({
    data: {
      cashierId,
      startCash: parseFloat(startCash),
      status: 'OPEN',
    },
    include: { cashier: true },
  })

  return Response.json(session, { status: 201 })
}

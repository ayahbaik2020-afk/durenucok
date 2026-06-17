import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT /api/sessions/[id] — close session
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const session = await prisma.cashierSession.update({
    where: { id: parseInt(id) },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
      endCash: body.endCash,
    },
    include: { cashier: true },
  })

  return Response.json(session)
}

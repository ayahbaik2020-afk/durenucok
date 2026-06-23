import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPin } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { cashierId, pin } = await request.json()
    if (!cashierId || !pin) {
      return Response.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    const cashier = await prisma.cashier.findUnique({ where: { id: cashierId } })
    if (!cashier || !cashier.isActive) {
      return Response.json({ error: 'Kasir tidak ditemukan' }, { status: 404 })
    }

    const valid = await verifyPin(pin, cashier.pin)
    if (!valid) {
      return Response.json({ error: 'PIN salah' }, { status: 401 })
    }

    const { pin: _, ...safe } = cashier
    return Response.json(safe)
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

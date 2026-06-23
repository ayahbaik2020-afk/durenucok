import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPin, hashPin } from '@/lib/auth'

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

    // Backward compat: if stored PIN is already hashed (starts with $2), verify with bcrypt
    // Otherwise, do plaintext compare & upgrade to hash
    const isHashed = cashier.pin.startsWith('$2')
    let valid: boolean

    if (isHashed) {
      valid = await verifyPin(pin, cashier.pin)
    } else {
      valid = pin === cashier.pin
      if (valid) {
        // Upgrade plaintext PIN to hash
        const hashed = await hashPin(pin)
        await prisma.cashier.update({
          where: { id: cashier.id },
          data: { pin: hashed },
        })
      }
    }

    if (!valid) {
      return Response.json({ error: 'PIN salah' }, { status: 401 })
    }

    const { pin: _, ...safe } = cashier
    return Response.json(safe)
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

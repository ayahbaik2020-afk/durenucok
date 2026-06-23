import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPin, verifyPin } from '@/lib/auth'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { cashierId, oldPin, newPin } = body

    if (!cashierId || !oldPin || !newPin) {
      return Response.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    const cashier = await prisma.cashier.findUnique({
      where: { id: cashierId },
    })

    if (!cashier) {
      return Response.json({ error: 'Kasir tidak ditemukan' }, { status: 404 })
    }

    const valid = await verifyPin(oldPin, cashier.pin)
    if (!valid) {
      return Response.json({ error: 'PIN lama salah' }, { status: 400 })
    }

    const hashed = await hashPin(newPin)
    const updatedCashier = await prisma.cashier.update({
      where: { id: cashierId },
      data: { pin: hashed },
    })

    return Response.json({ 
      success: true, 
      message: 'PIN berhasil diubah',
      cashier: {
        id: updatedCashier.id,
        name: updatedCashier.name,
        role: updatedCashier.role,
        isActive: updatedCashier.isActive
      }
    })
  } catch (error: any) {
    console.error('Failed to change PIN:', error)
    return Response.json({ error: 'Gagal mengubah PIN: ' + (error.message || error) }, { status: 500 })
  }
}

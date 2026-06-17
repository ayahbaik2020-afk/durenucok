import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    if (cashier.pin !== oldPin) {
      return Response.json({ error: 'PIN lama salah' }, { status: 400 })
    }

    const updatedCashier = await prisma.cashier.update({
      where: { id: cashierId },
      data: { pin: newPin },
    })

    return Response.json({ 
      success: true, 
      message: 'PIN berhasil diubah',
      cashier: {
        id: updatedCashier.id,
        name: updatedCashier.name,
        pin: updatedCashier.pin,
        isActive: updatedCashier.isActive
      }
    })
  } catch (error: any) {
    console.error('Failed to change PIN:', error)
    return Response.json({ error: 'Gagal mengubah PIN: ' + (error.message || error) }, { status: 500 })
  }
}

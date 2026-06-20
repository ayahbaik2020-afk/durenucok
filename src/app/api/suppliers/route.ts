import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } })
  return Response.json(suppliers)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const supplier = await prisma.supplier.create({
    data: {
      name: body.name,
      contactPerson: body.contactPerson ?? null,
      phone: body.phone ?? null,
      address: body.address ?? null,
      isActive: body.isActive ?? true,
    },
  })
  return Response.json(supplier, { status: 201 })
}


export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const supplier = await prisma.supplier.update({
    where: { id: Number(body.id) },
    data: {
      name: body.name,
      contactPerson: body.contactPerson ?? null,
      phone: body.phone ?? null,
      address: body.address ?? null,
      isActive: body.isActive ?? true,
    },
  })
  return Response.json(supplier)
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = Number(searchParams.get('id'))
  await prisma.supplier.delete({ where: { id } })
  return Response.json({ ok: true })
}

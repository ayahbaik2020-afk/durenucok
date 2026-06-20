import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const warehouses = await prisma.warehouse.findMany({ orderBy: { name: 'asc' } })
  return Response.json(warehouses)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const warehouse = await prisma.warehouse.create({
    data: {
      name: body.name,
      code: body.code,
      location: body.location ?? null,
      isActive: body.isActive ?? true,
    },
  })
  return Response.json(warehouse, { status: 201 })
}


export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const warehouse = await prisma.warehouse.update({
    where: { id: Number(body.id) },
    data: {
      name: body.name,
      code: body.code,
      location: body.location ?? null,
      isActive: body.isActive ?? true,
    },
  })
  return Response.json(warehouse)
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = Number(searchParams.get('id'))
  await prisma.warehouse.delete({ where: { id } })
  return Response.json({ ok: true })
}

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const categoryId = searchParams.get('categoryId')
  const search = searchParams.get('search')
  const includeInactive = searchParams.get('includeInactive') === 'true'

  const products = await prisma.product.findMany({
    where: {
      ...(!includeInactive ? { isActive: true } : {}),
      ...(categoryId ? { categoryId: parseInt(categoryId) } : {}),
      ...(search
        ? { name: { contains: search, mode: 'insensitive' } }
        : {}),
    },
    include: { category: true },
    orderBy: { name: 'asc' },
  })

  return Response.json(products)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const product = await prisma.product.create({
    data: {
      name: body.name,
      description: body.description,
      price: body.price,
      emoji: body.emoji || '🍧',
      image: body.image || null,
      categoryId: body.categoryId,
      stock: body.stock ?? null,
    },
    include: { category: true },
  })
  return Response.json(product, { status: 201 })
}


export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const product = await prisma.product.update({
    where: { id: Number(body.id) },
    data: {
      name: body.name,
      description: body.description,
      price: body.price,
      emoji: body.emoji || '??',
      image: body.image || null,
      categoryId: body.categoryId,
      stock: body.stock ?? null,
      isActive: body.isActive ?? true,
    },
    include: { category: true },
  })
  return Response.json(product)
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = Number(searchParams.get('id'))
  await prisma.product.delete({ where: { id } })
  return Response.json({ ok: true })
}

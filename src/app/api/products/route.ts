import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const categoryId = searchParams.get('categoryId')
  const search = searchParams.get('search')

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(categoryId ? { categoryId: parseInt(categoryId) } : {}),
      ...(search
        ? { name: { contains: search } }
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
      categoryId: body.categoryId,
      stock: body.stock ?? null,
    },
    include: { category: true },
  })
  return Response.json(product, { status: 201 })
}

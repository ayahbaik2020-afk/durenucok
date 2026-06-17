import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/products/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id: parseInt(id) },
    include: { category: true },
  })
  if (!product) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(product)
}

// PUT /api/products/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const product = await prisma.product.update({
    where: { id: parseInt(id) },
    data: {
      name: body.name,
      description: body.description,
      price: body.price,
      emoji: body.emoji,
      image: body.image,
      categoryId: body.categoryId,
      stock: body.stock ?? null,
      isActive: body.isActive,
    },
    include: { category: true },
  })
  return Response.json(product)
}

// DELETE /api/products/[id] — soft delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.product.update({
    where: { id: parseInt(id) },
    data: { isActive: false },
  })
  return Response.json({ success: true })
}

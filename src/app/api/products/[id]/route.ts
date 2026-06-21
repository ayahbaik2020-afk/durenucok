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
    include: {
      category: true,
      bundleItems: {
        include: {
          product: true,
        },
      },
    },
  })
  if (!product) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(product)
}

// PUT /api/products/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const productId = parseInt(id)

    const product = await prisma.$transaction(async (tx) => {
      // 1. Update the main product
      const updatedProduct = await tx.product.update({
        where: { id: productId },
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

      // 2. Sync bundleItems if provided
      if (body.bundleItems !== undefined && Array.isArray(body.bundleItems)) {
        await tx.bundleItem.deleteMany({
          where: { bundleId: productId },
        })

        if (body.bundleItems.length > 0) {
          await tx.bundleItem.createMany({
            data: body.bundleItems.map((item: { productId: number; qty: number }) => ({
              bundleId: productId,
              productId: item.productId,
              qty: item.qty,
            })),
          })
        }
      }

      // Re-fetch
      return tx.product.findUnique({
        where: { id: productId },
        include: {
          category: true,
          bundleItems: {
            include: {
              product: true,
            },
          },
        },
      })
    })

    return Response.json(product)
  } catch (error: any) {
    console.error('Error in PUT /api/products/[id]:', error)
    return Response.json({ error: error.message || 'Gagal memperbarui produk' }, { status: 500 })
  }
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

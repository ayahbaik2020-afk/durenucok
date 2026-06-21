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
    include: {
      category: true,
      bundleItems: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return Response.json(products)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const product = await prisma.$transaction(async (tx) => {
      // 1. Create the main product
      const newProduct = await tx.product.create({
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

      // 2. If it's a bundling product and has bundleItems, create them
      if (body.bundleItems && Array.isArray(body.bundleItems) && body.bundleItems.length > 0) {
        await tx.bundleItem.createMany({
          data: body.bundleItems.map((item: { productId: number; qty: number }) => ({
            bundleId: newProduct.id,
            productId: item.productId,
            qty: item.qty,
          })),
        })
      }

      // Re-fetch with bundleItems populated
      return tx.product.findUnique({
        where: { id: newProduct.id },
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

    return Response.json(product, { status: 201 })
  } catch (error: any) {
    console.error('Error creating product:', error)
    return Response.json({ error: error.message || 'Gagal membuat produk' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const product = await prisma.$transaction(async (tx) => {
      // 1. Update the main product
      const updatedProduct = await tx.product.update({
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

      // 2. If bundleItems is provided in body, sync them
      if (body.bundleItems !== undefined && Array.isArray(body.bundleItems)) {
        // Delete existing bundle items
        await tx.bundleItem.deleteMany({
          where: { bundleId: updatedProduct.id },
        })

        // Insert new ones if any
        if (body.bundleItems.length > 0) {
          await tx.bundleItem.createMany({
            data: body.bundleItems.map((item: { productId: number; qty: number }) => ({
              bundleId: updatedProduct.id,
              productId: item.productId,
              qty: item.qty,
            })),
          })
        }
      }

      // Re-fetch with bundleItems populated
      return tx.product.findUnique({
        where: { id: updatedProduct.id },
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
    console.error('Error updating product:', error)
    return Response.json({ error: error.message || 'Gagal memperbarui produk' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = Number(searchParams.get('id'))
  await prisma.product.delete({ where: { id } })
  return Response.json({ ok: true })
}

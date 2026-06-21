import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables')
}

const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function setupBundles() {
  console.log('📦 Setting up Bundle Items for Bundling Products...')

  // Get products
  const products = await prisma.product.findMany()

  // Helper to find product ID by name
  const findProduct = (name: string) => {
    const prod = products.find((p: any) => p.name === name)
    if (!prod) {
      console.warn(`Product not found: ${name}`)
      return null
    }
    return prod
  }

  // 1. Bundling Hemat A: 2 Pancake Original + 1 Es Durian Large
  const bundleA = findProduct('Bundling Hemat A')
  const pancakeOriginal = findProduct('Pancake Durian Original')
  const esDurianLarge = findProduct('Es Durian Cup Large')

  if (bundleA && pancakeOriginal && esDurianLarge) {
    await prisma.bundleItem.upsert({
      where: { bundleId_productId: { bundleId: bundleA.id, productId: pancakeOriginal.id } },
      update: { qty: 2 },
      create: { bundleId: bundleA.id, productId: pancakeOriginal.id, qty: 2 }
    })
    await prisma.bundleItem.upsert({
      where: { bundleId_productId: { bundleId: bundleA.id, productId: esDurianLarge.id } },
      update: { qty: 1 },
      create: { bundleId: bundleA.id, productId: esDurianLarge.id, qty: 1 }
    })
    console.log('✅ Bundling Hemat A items set up')
  }

  // 2. Bundling Hemat B: 1 Dessert Cup + 1 Durian Juice
  const bundleB = findProduct('Bundling Hemat B')
  const dessertCup = findProduct('Dessert Cup Durian')
  const juiceDurian = findProduct('Durian Juice Segar')

  if (bundleB && dessertCup && juiceDurian) {
    await prisma.bundleItem.upsert({
      where: { bundleId_productId: { bundleId: bundleB.id, productId: dessertCup.id } },
      update: { qty: 1 },
      create: { bundleId: bundleB.id, productId: dessertCup.id, qty: 1 }
    })
    await prisma.bundleItem.upsert({
      where: { bundleId_productId: { bundleId: bundleB.id, productId: juiceDurian.id } },
      update: { qty: 1 },
      create: { bundleId: bundleB.id, productId: juiceDurian.id, qty: 1 }
    })
    console.log('✅ Bundling Hemat B items set up')
  }

  // 3. Paket Family: 6 Pancake + 2 Es Durian + 2 Juice Durian
  // Let's assume 6 Pancake Original, 2 Es Durian Cup Large, 2 Durian Juice Segar
  const bundleFamily = findProduct('Paket Family')
  if (bundleFamily && pancakeOriginal && esDurianLarge && juiceDurian) {
    await prisma.bundleItem.upsert({
      where: { bundleId_productId: { bundleId: bundleFamily.id, productId: pancakeOriginal.id } },
      update: { qty: 6 },
      create: { bundleId: bundleFamily.id, productId: pancakeOriginal.id, qty: 6 }
    })
    await prisma.bundleItem.upsert({
      where: { bundleId_productId: { bundleId: bundleFamily.id, productId: esDurianLarge.id } },
      update: { qty: 2 },
      create: { bundleId: bundleFamily.id, productId: esDurianLarge.id, qty: 2 }
    })
    await prisma.bundleItem.upsert({
      where: { bundleId_productId: { bundleId: bundleFamily.id, productId: juiceDurian.id } },
      update: { qty: 2 },
      create: { bundleId: bundleFamily.id, productId: juiceDurian.id, qty: 2 }
    })
    console.log('✅ Paket Family items set up')
  }

  // 4. Bundling GoFood Special: 1 Pancake Premium + 1 Smoothie + 1 Dessert Cup
  const bundleGoFood = findProduct('Bundling GoFood Special')
  const pancakePremium = findProduct('Pancake Durian Premium')
  const smoothie = findProduct('Durian Smoothie')

  if (bundleGoFood && pancakePremium && smoothie && dessertCup) {
    await prisma.bundleItem.upsert({
      where: { bundleId_productId: { bundleId: bundleGoFood.id, productId: pancakePremium.id } },
      update: { qty: 1 },
      create: { bundleId: bundleGoFood.id, productId: pancakePremium.id, qty: 1 }
    })
    await prisma.bundleItem.upsert({
      where: { bundleId_productId: { bundleId: bundleGoFood.id, productId: smoothie.id } },
      update: { qty: 1 },
      create: { bundleId: bundleGoFood.id, productId: smoothie.id, qty: 1 }
    })
    await prisma.bundleItem.upsert({
      where: { bundleId_productId: { bundleId: bundleGoFood.id, productId: dessertCup.id } },
      update: { qty: 1 },
      create: { bundleId: bundleGoFood.id, productId: dessertCup.id, qty: 1 }
    })
    console.log('✅ Bundling GoFood Special items set up')
  }

  console.log('🎉 Setup complete!')
}

setupBundles()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

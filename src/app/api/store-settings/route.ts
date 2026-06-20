import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const setting = await prisma.storeSetting.findFirst({ orderBy: { id: 'asc' } })
  return Response.json(setting)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const existing = await prisma.storeSetting.findFirst()
  const data = {
    name: body.name,
    logo: body.logo ?? null,
    address: body.address ?? null,
    phone: body.phone ?? null,
  }
  const setting = existing
    ? await prisma.storeSetting.update({ where: { id: existing.id }, data })
    : await prisma.storeSetting.create({ data })
  return Response.json(setting)
}

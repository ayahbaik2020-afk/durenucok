import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const dbPath = process.env.DATABASE_URL?.replace('file:', '') ||
    path.resolve(process.cwd(), 'dev.db').replace(/\\/g, '/')
  const fullUrl = dbPath.startsWith('/') ? `file://${dbPath}` : `file:///${dbPath}`
  const adapter = new PrismaLibSql({ url: fullUrl })
  return new PrismaClient({ adapter } as any)
}


export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

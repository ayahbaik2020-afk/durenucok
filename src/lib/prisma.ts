import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function buildDbUrl(): string {
  const envUrl = process.env.DATABASE_URL

  // If it's a remote URL (Turso/LibSQL cloud), use as-is
  if (envUrl && (envUrl.startsWith('libsql://') || envUrl.startsWith('https://'))) {
    return envUrl
  }

  // For local file: always build absolute path
  const dbFile = path.resolve(process.cwd(), 'dev.db')
  const normalized = dbFile.replace(/\\/g, '/')
  return `file:///${normalized}`
}

function createPrismaClient() {
  const url = buildDbUrl()
  const adapter = new PrismaLibSql({ url })
  return new PrismaClient({ adapter } as any)
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

import 'dotenv/config'
import { defineConfig } from 'prisma/config'
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const libsql = createClient({ url: 'file:./dev.db' })
const adapter = new PrismaLibSQL(libsql)

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  adapter,
})

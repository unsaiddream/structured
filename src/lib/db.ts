import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function resolveDbPath(): string {
  const url = process.env.DATABASE_URL ?? 'file:./dev.db'
  // Strip "file:" prefix and resolve relative to project root
  const filePath = url.replace(/^file:/, '')
  return path.resolve(process.cwd(), filePath)
}

function createPrismaClient() {
  const dbPath = resolveDbPath()
  const adapter = new PrismaBetterSqlite3({ url: dbPath })
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

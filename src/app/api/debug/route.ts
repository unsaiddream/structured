import { NextResponse } from 'next/server'

export async function GET() {
  const results: Record<string, string> = {}

  try {
    const path = await import('path')
    const url = process.env.DATABASE_URL ?? 'file:./dev.db'
    const filePath = url.replace(/^file:/, '')
    const dbPath = path.default.resolve(process.cwd(), filePath)
    results['db_path'] = dbPath

    const fs = await import('fs')
    results['db_exists'] = fs.existsSync(dbPath) ? 'YES' : 'NO'
  } catch (e) {
    results['path_error'] = String(e)
  }

  try {
    const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3')
    results['adapter_import'] = 'OK'
    const path = await import('path')
    const url = process.env.DATABASE_URL ?? 'file:./dev.db'
    const dbPath = path.default.resolve(process.cwd(), url.replace(/^file:/, ''))
    const adapter = new PrismaBetterSqlite3({ url: dbPath })
    results['adapter_create'] = 'OK'
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient({ adapter } as never)
    results['prisma_create'] = 'OK'
    const count = await prisma.syllabus.count()
    results['prisma_query'] = `OK (${count} syllabuses)`
    await prisma.$disconnect()
  } catch (e) {
    results['prisma_error'] = String(e)
  }

  try {
    results['anthropic_key'] = process.env.ANTHROPIC_API_KEY
      ? `SET (${process.env.ANTHROPIC_API_KEY.slice(0, 10)}...)`
      : 'NOT SET'
  } catch (e) {
    results['anthropic_error'] = String(e)
  }

  return NextResponse.json(results)
}

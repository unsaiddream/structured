import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export async function GET() {
  const results: Record<string, string> = {}

  // Same path as db.ts
  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
  results['db_path'] = dbPath
  results['db_exists'] = fs.existsSync(dbPath) ? 'YES' : 'NO'

  try {
    const { prisma } = await import('@/lib/db')
    const count = await prisma.syllabus.count()
    results['prisma_query'] = `OK (${count} syllabuses)`
  } catch (e) {
    results['prisma_error'] = String(e)
  }

  results['anthropic_key'] = process.env.ANTHROPIC_API_KEY
    ? `SET (${process.env.ANTHROPIC_API_KEY.slice(0, 10)}...)`
    : 'NOT SET'

  return NextResponse.json(results)
}

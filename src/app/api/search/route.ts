import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') || ''

  try {
    const syllabuses = await prisma.syllabus.findMany({
      include: { deadlines: true, grades: true },
    })

    if (!query.trim()) return NextResponse.json(syllabuses)

    const Fuse = (await import('fuse.js')).default

    const searchData = syllabuses.map((s) => ({
      ...s,
      structuredData: JSON.parse(s.structured),
    }))

    const fuse = new Fuse(searchData, {
      keys: [
        { name: 'subject', weight: 3 },
        { name: 'courseCode', weight: 2 },
        { name: 'professor', weight: 2 },
        { name: 'semester', weight: 1 },
        { name: 'structuredData.description', weight: 1 },
        { name: 'structuredData.objectives', weight: 1 },
        { name: 'structuredData.topics.title', weight: 1 },
        { name: 'deadlines.title', weight: 1 },
      ],
      threshold: 0.4,
      includeScore: true,
    })

    const results = fuse.search(query).map((r) => r.item)
    return NextResponse.json(results)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}

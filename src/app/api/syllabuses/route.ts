import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const syllabuses = await prisma.syllabus.findMany({
      include: { deadlines: true, grades: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(syllabuses)
  } catch (error) {
    console.error('Fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch syllabuses' }, { status: 500 })
  }
}

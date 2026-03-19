import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const syllabus = await prisma.syllabus.findUnique({
      where: { id },
      include: { deadlines: true, grades: true },
    })
    if (!syllabus) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(syllabus)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch syllabus' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.syllabus.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete syllabus' }, { status: 500 })
  }
}

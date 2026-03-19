import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { extractTextFromFile } from '@/lib/parser'
import { structureSyllabus } from '@/lib/structurer'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ]

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|txt)$/i)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF, DOC, DOCX, or TXT files.' },
        { status: 400 }
      )
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const rawText = await extractTextFromFile(buffer, file.type, file.name)

    if (!rawText || rawText.trim().length < 100) {
      return NextResponse.json(
        { error: 'Could not extract text from file. Please ensure the file is not empty or image-only.' },
        { status: 400 }
      )
    }

    const structured = await structureSyllabus(rawText)

    const syllabus = await prisma.syllabus.create({
      data: {
        fileName: file.name,
        fileSize: file.size,
        subject: structured.subject,
        courseCode: structured.courseCode,
        professor: structured.professor,
        semester: structured.semester,
        year: structured.year,
        rawText: rawText.slice(0, 50000),
        structured: JSON.stringify(structured),
        deadlines: {
          create: (structured.deadlines || []).map((d) => ({
            title: d.title,
            date: d.date ? new Date(d.date) : null,
            dateText: d.dateText,
            type: d.type,
            description: d.description,
            weight: d.weight,
          })),
        },
        grades: {
          create: (structured.gradeBreakdown || []).map((g) => ({
            title: g.title,
            weight: g.weight,
            description: g.description,
          })),
        },
      },
      include: { deadlines: true, grades: true },
    })

    return NextResponse.json({ success: true, syllabus })
  } catch (error) {
    console.error('Upload error:', error)
    const message = error instanceof Error ? error.message : 'Failed to process syllabus'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

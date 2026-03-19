import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { extractTextFromFile } from '@/lib/parser'
import { structureSyllabus, structureSyllabusFromImages } from '@/lib/structurer'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    let rawText: string
    let fileName: string
    let fileSize: number

    const contentType = req.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      const body = await req.json() as {
        rawText?: string
        images?: { data: string; mediaType: 'image/jpeg' }[]
        fileName: string
        fileSize: number
      }
      fileName = body.fileName ?? 'document.pdf'
      fileSize = body.fileSize ?? 0

      if (body.images?.length) {
        // Scanned PDF — Claude Vision extracts full text + structure
        const { structured, rawText: ocrText } = await structureSyllabusFromImages(body.images)
        const syllabus = await prisma.syllabus.create({
          data: {
            fileName, fileSize,
            subject: structured.subject,
            courseCode: structured.courseCode,
            professor: structured.professor,
            semester: structured.semester,
            year: structured.year,
            rawText: ocrText || '[Scanned document]',
            structured: JSON.stringify(structured),
            deadlines: { create: (structured.deadlines || []).map((d) => ({ title: d.title, date: d.date ? new Date(d.date) : null, dateText: d.dateText, type: d.type, description: d.description, weight: d.weight })) },
            grades: { create: (structured.gradeBreakdown || []).map((g) => ({ title: g.title, weight: g.weight, description: g.description })) },
          },
          include: { deadlines: true, grades: true },
        })
        return NextResponse.json({ success: true, syllabus })
      }

      if (!body.rawText || body.rawText.trim().length < 50) {
        return NextResponse.json({ error: 'No text content provided' }, { status: 400 })
      }
      rawText = body.rawText
    } else {
      // DOCX / TXT — file upload
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large. Maximum 50MB for DOCX/TXT.' }, { status: 400 })
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      rawText = await extractTextFromFile(buffer, file.type, file.name)
      fileName = file.name
      fileSize = file.size
    }

    if (!rawText || rawText.trim().length < 100) {
      return NextResponse.json(
        { error: 'Could not extract text. Make sure the file is not empty or image-only.' },
        { status: 400 }
      )
    }

    const structured = await structureSyllabus(rawText)

    const syllabus = await prisma.syllabus.create({
      data: {
        fileName,
        fileSize,
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

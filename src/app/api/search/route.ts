import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { StructuredSyllabus } from '@/types/syllabus'

export interface SearchHit {
  syllabusId: string
  subject: string
  courseCode: string | null
  emoji: string
  section: string
  tab: 'overview' | 'deadlines' | 'grades' | 'schedule' | 'policies'
  icon: string
  title: string
  snippet: string
  terms: string[]
  score: number
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getSnippet(text: string, terms: string[], maxLen = 130): string {
  if (!text) return ''
  const lower = text.toLowerCase()
  const positions = terms
    .map((t) => lower.indexOf(t.toLowerCase()))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b)
  if (!positions.length) return text.slice(0, maxLen)
  const center = positions[0]
  const start = Math.max(0, center - 45)
  const end = Math.min(text.length, center + maxLen - 45)
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
}

function matches(text: string | null | undefined, terms: string[]): boolean {
  if (!text) return false
  const lower = text.toLowerCase()
  return terms.some((t) => lower.includes(t.toLowerCase()))
}

function scoreText(text: string, terms: string[]): number {
  const lower = text.toLowerCase()
  const matched = terms.filter((t) => lower.includes(t.toLowerCase()))
  // Bonus for title-level match
  return matched.length / terms.length
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('q') || ''

  try {
    const allSyllabuses = await prisma.syllabus.findMany({
      include: { deadlines: true, grades: true },
    })

    if (!raw.trim()) return NextResponse.json({ syllabuses: allSyllabuses, hits: [] })

    // Parse "subject:content query" syntax
    const colonIdx = raw.indexOf(':')
    let subjectFilter = ''
    let contentQuery = raw.trim()

    if (colonIdx > 0) {
      subjectFilter = raw.slice(0, colonIdx).trim().toLowerCase()
      contentQuery = raw.slice(colonIdx + 1).trim()
    }

    const terms = contentQuery.split(/\s+/).filter((t) => t.length > 1)

    // Filter by subject
    const filtered = subjectFilter
      ? allSyllabuses.filter(
          (s) =>
            s.subject.toLowerCase().includes(subjectFilter) ||
            (s.courseCode && s.courseCode.toLowerCase().includes(subjectFilter))
        )
      : allSyllabuses

    if (!terms.length) return NextResponse.json({ syllabuses: filtered, hits: [] })

    const hits: SearchHit[] = []

    for (const s of filtered) {
      let structured: StructuredSyllabus
      try {
        structured = JSON.parse(s.structured)
      } catch {
        continue
      }
      const emoji = structured.emoji || '📚'

      // Deadlines
      for (const d of s.deadlines) {
        const text = [d.title, d.description].filter(Boolean).join(' — ')
        if (matches(text, terms)) {
          const icon =
            d.type === 'exam' ? '📝' : d.type === 'quiz' ? '✏️' : d.type === 'project' ? '🚀' : '📋'
          hits.push({
            syllabusId: s.id,
            subject: s.subject,
            courseCode: s.courseCode,
            emoji,
            section: 'deadline',
            tab: 'deadlines',
            icon,
            title: d.title,
            snippet: getSnippet(text, terms),
            terms,
            score: scoreText(d.title, terms) * 1.2 + scoreText(d.description || '', terms) * 0.8,
          })
        }
      }

      // Topics / schedule
      for (const t of structured.topics || []) {
        const text = [t.title, t.description].filter(Boolean).join(' — ')
        if (matches(text, terms)) {
          hits.push({
            syllabusId: s.id,
            subject: s.subject,
            courseCode: s.courseCode,
            emoji,
            section: 'topic',
            tab: 'schedule',
            icon: '🗓️',
            title: t.title,
            snippet: getSnippet(text, terms),
            terms,
            score: scoreText(t.title, terms) * 1.2 + scoreText(t.description || '', terms) * 0.8,
          })
        }
      }

      // Grade breakdown
      for (const g of structured.gradeBreakdown || []) {
        const text = [g.title, g.description].filter(Boolean).join(' — ')
        if (matches(text, terms)) {
          hits.push({
            syllabusId: s.id,
            subject: s.subject,
            courseCode: s.courseCode,
            emoji,
            section: 'grade',
            tab: 'grades',
            icon: '📊',
            title: g.title,
            snippet: getSnippet(text, terms),
            terms,
            score: scoreText(g.title, terms) * 1.2 + scoreText(g.description || '', terms) * 0.8,
          })
        }
      }

      // Objectives
      for (const obj of structured.objectives || []) {
        if (matches(obj, terms)) {
          hits.push({
            syllabusId: s.id,
            subject: s.subject,
            courseCode: s.courseCode,
            emoji,
            section: 'objective',
            tab: 'overview',
            icon: '🎯',
            title: 'Цели курса',
            snippet: getSnippet(obj, terms),
            terms,
            score: scoreText(obj, terms),
          })
        }
      }

      // Policies
      for (const p of structured.policies || []) {
        const text = [p.title, p.content].filter(Boolean).join(': ')
        if (matches(text, terms)) {
          hits.push({
            syllabusId: s.id,
            subject: s.subject,
            courseCode: s.courseCode,
            emoji,
            section: 'policy',
            tab: 'policies',
            icon: '📜',
            title: p.title,
            snippet: getSnippet(text, terms),
            terms,
            score: scoreText(p.title, terms) * 1.2 + scoreText(p.content, terms) * 0.8,
          })
        }
      }

      // Course description
      if (structured.description && matches(structured.description, terms)) {
        hits.push({
          syllabusId: s.id,
          subject: s.subject,
          courseCode: s.courseCode,
          emoji,
          section: 'description',
          tab: 'overview',
          icon: '📋',
          title: 'Описание курса',
          snippet: getSnippet(structured.description, terms),
          terms,
          score: scoreText(structured.description, terms),
        })
      }
    }

    hits.sort((a, b) => b.score - a.score)

    return NextResponse.json({ syllabuses: filtered, hits: hits.slice(0, 25) })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}

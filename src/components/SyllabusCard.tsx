'use client'

import Link from 'next/link'
import { Clock, User, BookOpen, AlertCircle, Trash2 } from 'lucide-react'
import type { StructuredSyllabus } from '@/types/syllabus'

const COLOR_MAP: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', text: 'text-blue-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', text: 'text-purple-600' },
  green: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-700', text: 'text-green-600' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-600' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', badge: 'bg-cyan-100 text-cyan-700', text: 'text-cyan-600' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', text: 'text-amber-600' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-700', text: 'text-rose-600' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', badge: 'bg-pink-100 text-pink-700', text: 'text-pink-600' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', text: 'text-yellow-600' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700', text: 'text-violet-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', text: 'text-orange-600' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-700', text: 'text-slate-600' },
}

interface Props {
  syllabus: {
    id: string
    subject: string
    courseCode: string | null
    professor: string | null
    semester: string | null
    year: number | null
    structured: string
    deadlines: { id: string; date: Date | null; title: string; type: string }[]
  }
  onDelete: (id: string) => void
}

export default function SyllabusCard({ syllabus, onDelete }: Props) {
  const data = JSON.parse(syllabus.structured) as StructuredSyllabus
  const colors = COLOR_MAP[data.color] || COLOR_MAP.slate

  const upcomingDeadlines = syllabus.deadlines
    .filter((d) => d.date && new Date(d.date) > new Date())
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
    .slice(0, 2)

  const nextDeadline = upcomingDeadlines[0]
  const daysUntil = nextDeadline?.date
    ? Math.ceil((new Date(nextDeadline.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!confirm(`Удалить "${syllabus.subject}"?`)) return
    await fetch(`/api/syllabuses/${syllabus.id}`, { method: 'DELETE' })
    onDelete(syllabus.id)
  }

  return (
    <Link href={`/syllabus/${syllabus.id}`}>
      <div className={`relative rounded-2xl border-2 p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${colors.bg} ${colors.border}`}>
        <button
          onClick={handleDelete}
          className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-100 text-gray-400 hover:text-red-500 transition-all"
          style={{ opacity: 1 }}
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className="text-4xl">{data.emoji}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">
              {syllabus.subject}
            </h3>
            {syllabus.courseCode && (
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${colors.badge}`}>
                {syllabus.courseCode}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1.5 mb-4">
          {syllabus.professor && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <User className="w-3.5 h-3.5" />
              <span className="truncate">{syllabus.professor}</span>
            </div>
          )}
          {(syllabus.semester || syllabus.year) && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Clock className="w-3.5 h-3.5" />
              <span>{[syllabus.semester, syllabus.year].filter(Boolean).join(' ')}</span>
            </div>
          )}
          {data.credits && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{data.credits} кредитов</span>
            </div>
          )}
        </div>

        {nextDeadline && (
          <div className={`p-2.5 rounded-xl border ${daysUntil !== null && daysUntil <= 7 ? 'bg-red-50 border-red-200' : 'bg-white/60 border-white'}`}>
            <div className="flex items-center gap-1.5">
              <AlertCircle className={`w-3.5 h-3.5 ${daysUntil !== null && daysUntil <= 7 ? 'text-red-500' : 'text-gray-400'}`} />
              <span className="text-xs font-medium text-gray-700 truncate">{nextDeadline.title}</span>
            </div>
            {daysUntil !== null && (
              <p className={`text-xs mt-0.5 ml-5 font-semibold ${daysUntil <= 3 ? 'text-red-600' : daysUntil <= 7 ? 'text-orange-600' : 'text-gray-500'}`}>
                {daysUntil === 0 ? '⚠️ Сегодня!' : daysUntil === 1 ? '⚠️ Завтра!' : `через ${daysUntil} дн.`}
              </p>
            )}
          </div>
        )}

        <div className={`mt-3 flex items-center gap-1 text-xs ${colors.text} font-medium`}>
          <span>{syllabus.deadlines.length} дедлайнов</span>
          <span className="text-gray-400">·</span>
          <span>{data.gradeBreakdown?.length || 0} оценок</span>
          {data.topics?.length && (
            <>
              <span className="text-gray-400">·</span>
              <span>{data.topics.length} тем</span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}

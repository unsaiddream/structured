'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar } from 'lucide-react'
import type { StructuredSyllabus } from '@/types/syllabus'

interface DeadlineWithMeta {
  id: string
  title: string
  date: string | null
  dateText: string | null
  type: string
  description: string | null
  weight: number | null
  subject: string
  syllabusId: string
  emoji: string
}

const TYPE_ICONS: Record<string, string> = {
  exam: '📝',
  quiz: '✏️',
  assignment: '📋',
  project: '🚀',
  other: '📌',
}

const TYPE_BG: Record<string, string> = {
  exam: 'bg-red-50 border-red-200',
  quiz: 'bg-orange-50 border-orange-200',
  assignment: 'bg-blue-50 border-blue-200',
  project: 'bg-purple-50 border-purple-200',
  other: 'bg-gray-50 border-gray-200',
}

export default function DeadlinesPage() {
  const [deadlines, setDeadlines] = useState<DeadlineWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  useEffect(() => {
    fetch('/api/syllabuses')
      .then(r => r.json())
      .then(data => {
        const syllabuses = Array.isArray(data) ? data : []
        const all: DeadlineWithMeta[] = syllabuses.flatMap((s: { id: string; subject: string; structured: string; deadlines: DeadlineWithMeta[] }) => {
          const structured: StructuredSyllabus = JSON.parse(s.structured)
          return s.deadlines.map((d: DeadlineWithMeta) => ({
            ...d,
            subject: s.subject,
            syllabusId: s.id,
            emoji: structured.emoji,
          }))
        })
        all.sort((a, b) => {
          if (!a.date && !b.date) return 0
          if (!a.date) return 1
          if (!b.date) return -1
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        })
        setDeadlines(all)
        setLoading(false)
      })
  }, [])

  const now = new Date()

  const filtered = deadlines.filter(d => {
    const hasDate = !!d.date
    const isPast = hasDate && new Date(d.date!) <= now
    const isUpcoming = !hasDate || new Date(d.date!) > now

    if (filter === 'upcoming' && isPast) return false
    if (filter === 'past' && isUpcoming) return false
    if (typeFilter !== 'all' && d.type !== typeFilter) return false
    return true
  })

  const grouped = filtered.reduce((acc: Record<string, DeadlineWithMeta[]>, d) => {
    let key = 'Без даты'
    if (d.date) {
      const date = new Date(d.date)
      const days = Math.ceil((date.getTime() - now.getTime()) / 86400000)
      if (days < 0) key = '✅ Прошедшие'
      else if (days === 0) key = '🔴 Сегодня'
      else if (days === 1) key = '🟠 Завтра'
      else if (days <= 7) key = `🟡 Эта неделя (${days} дн.)`
      else if (days <= 30) key = '📆 Этот месяц'
      else key = '🗓️ Позже'
    }
    if (!acc[key]) acc[key] = []
    acc[key].push(d)
    return acc
  }, {})

  const GROUP_ORDER = ['🔴 Сегодня', '🟠 Завтра', '🟡 Эта неделя', '📆 Этот месяц', '🗓️ Позже', 'Без даты', '✅ Прошедшие']
  const sortedGroups = Object.keys(grouped).sort((a, b) => {
    const ai = GROUP_ORDER.findIndex(g => a.startsWith(g.slice(0, 3)))
    const bi = GROUP_ORDER.findIndex(g => b.startsWith(g.slice(0, 3)))
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  return (
    <div className="min-h-screen bg-white/60">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-200/60 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Calendar className="w-5 h-5 text-indigo-500" />
          <h1 className="text-lg font-bold text-gray-900">Все дедлайны</h1>
          <span className="ml-auto text-sm text-gray-500">{deadlines.length} всего</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="flex bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
            {[
              { key: 'upcoming', label: '⏳ Предстоящие' },
              { key: 'all', label: '📋 Все' },
              { key: 'past', label: '✅ Прошедшие' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as typeof filter)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === f.key ? 'bg-indigo-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex bg-white rounded-xl border border-gray-200 p-1 shadow-sm gap-1">
            {['all', 'exam', 'quiz', 'assignment', 'project'].map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1.5 rounded-lg text-sm transition-all ${typeFilter === t ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t === 'all' ? '🔍 Все' : `${TYPE_ICONS[t]} ${t}`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : sortedGroups.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-3">📅</div>
            <p>Нет дедлайнов</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedGroups.map(group => (
              <div key={group}>
                <h2 className="text-sm font-semibold text-gray-500 mb-2">{group}</h2>
                <div className="space-y-2">
                  {grouped[group].map(d => {
                    const days = d.date ? Math.ceil((new Date(d.date).getTime() - now.getTime()) / 86400000) : null
                    return (
                      <Link key={d.id} href={`/syllabus/${d.syllabusId}`}>
                        <div className={`rounded-xl p-4 border cursor-pointer hover:shadow-md transition-all ${TYPE_BG[d.type] || TYPE_BG.other}`}>
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center gap-1 shrink-0">
                              <span className="text-xl">{d.emoji}</span>
                              <span className="text-base">{TYPE_ICONS[d.type] || '📌'}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm">{d.title}</p>
                              <p className="text-xs text-gray-500 truncate">{d.subject}</p>
                              {d.description && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{d.description}</p>}
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-xs text-gray-500">
                                  {d.dateText || (d.date ? new Date(d.date).toLocaleDateString('ru', { day: 'numeric', month: 'long' }) : '—')}
                                </span>
                                {d.weight && (
                                  <span className="text-xs bg-white/70 px-1.5 py-0.5 rounded-full text-gray-600">{d.weight}%</span>
                                )}
                              </div>
                            </div>
                            {days !== null && days >= 0 && (
                              <div className={`shrink-0 text-center px-2.5 py-1.5 rounded-xl text-xs font-bold ${
                                days === 0 ? 'bg-red-500 text-white' :
                                days === 1 ? 'bg-orange-500 text-white' :
                                days <= 7 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-white/60 text-gray-500'
                              }`}>
                                {days === 0 ? 'Сегодня' : days === 1 ? 'Завтра' : `${days}д`}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

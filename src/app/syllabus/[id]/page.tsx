'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, User, Clock, MapPin, Mail, BookOpen, Target,
  Calendar, BarChart2, FileText, AlertCircle, CheckCircle, Trash2, X
} from 'lucide-react'
import type { StructuredSyllabus } from '@/types/syllabus'

// ── Highlight utility ────────────────────────────────────────────────────────

function Hl({ text, terms }: { text: string | null | undefined; terms: string[] }) {
  if (!text) return null
  if (!terms.length) return <>{text}</>
  const pattern = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const regex = new RegExp(`(${pattern})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5 font-semibold not-italic">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

// ── Constants ────────────────────────────────────────────────────────────────

const DEADLINE_ICONS: Record<string, string> = {
  exam: '📝', quiz: '✏️', assignment: '📋', project: '🚀', other: '📌',
}

const DEADLINE_COLORS: Record<string, string> = {
  exam: 'bg-red-100 text-red-700 border-red-200',
  quiz: 'bg-orange-100 text-orange-700 border-orange-200',
  assignment: 'bg-blue-100 text-blue-700 border-blue-200',
  project: 'bg-purple-100 text-purple-700 border-purple-200',
  other: 'bg-gray-100 text-gray-700 border-gray-200',
}

type TabId = 'overview' | 'schedule' | 'grades' | 'deadlines' | 'policies' | 'fulltext'

interface SyllabusData {
  id: string
  fileName: string
  subject: string
  courseCode: string | null
  professor: string | null
  semester: string | null
  year: number | null
  rawText: string
  structured: string
  deadlines: {
    id: string; title: string; date: string | null
    dateText: string | null; type: string; description: string | null; weight: number | null
  }[]
  grades: { id: string; title: string; weight: number; description: string | null }[]
  createdAt: string
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SyllabusPage() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState<SyllabusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [hlTerms, setHlTerms] = useState<string[]>([])
  const highlightBannerRef = useRef<HTMLDivElement>(null)

  // Read ?tab= and ?hl= from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hl = params.get('hl')
    const tab = params.get('tab') as TabId | null
    if (hl) setHlTerms(hl.split(',').filter(Boolean))
    if (tab && ['overview', 'deadlines', 'grades', 'schedule', 'policies', 'fulltext'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [])

  useEffect(() => {
    fetch(`/api/syllabuses/${id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
  }, [id])

  const handleDelete = async () => {
    if (!confirm('Удалить этот силлабус?')) return
    await fetch(`/api/syllabuses/${id}`, { method: 'DELETE' })
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  )

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">😔</div>
        <h2 className="text-xl font-semibold text-gray-700">Силлабус не найден</h2>
        <Link href="/" className="mt-4 inline-block text-indigo-600 hover:underline">← На главную</Link>
      </div>
    </div>
  )

  const structured: StructuredSyllabus = JSON.parse(data.structured)
  const now = new Date()

  const upcoming = data.deadlines
    .filter((d) => d.date && new Date(d.date) > now)
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())

  const past = data.deadlines
    .filter((d) => d.date && new Date(d.date) <= now)
    .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())

  const totalWeight = data.grades.reduce((sum, g) => sum + g.weight, 0)

  const hasFullText = data.rawText && !data.rawText.startsWith('[Scanned')

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: '📋 Обзор' },
    { id: 'deadlines', label: `📅 Дедлайны (${data.deadlines.length})` },
    { id: 'grades', label: '📊 Оценки' },
    { id: 'schedule', label: `🗓️ Расписание (${structured.topics?.length || 0})` },
    { id: 'policies', label: '📜 Правила' },
    ...(hasFullText ? [{ id: 'fulltext' as TabId, label: '📄 Полный текст' }] : []),
  ]

  return (
    <div className="min-h-screen bg-white/60">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-200/60 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Назад</span>
          </Link>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Удалить
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Highlight banner */}
        {hlTerms.length > 0 && (
          <div
            ref={highlightBannerRef}
            className="mb-4 flex items-center gap-3 px-4 py-2.5 bg-yellow-50 border border-yellow-200 rounded-2xl"
          >
            <span className="text-sm text-yellow-700 flex-1">
              Подсвечено по запросу:{' '}
              {hlTerms.map((t, i) => (
                <span key={t}>
                  <span className="font-semibold bg-yellow-200 text-yellow-900 rounded px-1">{t}</span>
                  {i < hlTerms.length - 1 && ', '}
                </span>
              ))}
            </span>
            <button
              onClick={() => setHlTerms([])}
              className="text-yellow-500 hover:text-yellow-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Subject Hero */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="text-6xl">{structured.emoji}</div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                <Hl text={data.subject} terms={hlTerms} />
              </h1>
              {data.courseCode && (
                <span className="inline-block mt-1 px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-full">
                  {data.courseCode}
                </span>
              )}
              {structured.description && (
                <p className="mt-3 text-gray-600 text-sm leading-relaxed">
                  <Hl text={structured.description} terms={hlTerms} />
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {data.professor && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4 text-indigo-400" />
                <span className="truncate"><Hl text={data.professor} terms={hlTerms} /></span>
              </div>
            )}
            {(data.semester || data.year) && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>{[data.semester, data.year].filter(Boolean).join(' ')}</span>
              </div>
            )}
            {structured.schedule && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span className="truncate">{structured.schedule}</span>
              </div>
            )}
            {structured.room && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-indigo-400" />
                <span>{structured.room}</span>
              </div>
            )}
            {structured.credits && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>{structured.credits} кредитов</span>
              </div>
            )}
            {structured.contactInfo?.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4 text-indigo-400" />
                <span className="truncate">{structured.contactInfo.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {structured.objectives?.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-500" />
                  🎯 Цели курса
                </h2>
                <ul className="space-y-2">
                  {structured.objectives.map((obj, i) => (
                    <li key={i} className={`flex items-start gap-2.5 text-sm text-gray-700 rounded-xl px-3 py-2 -mx-3 transition-colors ${hlTerms.length && obj.toLowerCase().split('').some((_, j) => hlTerms.some(t => obj.toLowerCase().slice(j).startsWith(t.toLowerCase()))) ? 'bg-yellow-50/60' : ''}`}>
                      <span className="text-indigo-400 mt-0.5">✓</span>
                      <Hl text={obj} terms={hlTerms} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {structured.requiredMaterials?.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  📖 Необходимые материалы
                </h2>
                <ul className="space-y-2">
                  {structured.requiredMaterials.map((mat, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <span className="text-orange-400 mt-0.5">📗</span>
                      <Hl text={mat} terms={hlTerms} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {structured.officeHours && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-amber-800 mb-1">🕐 Office Hours</h3>
                <p className="text-sm text-amber-700">
                  <Hl text={structured.officeHours} terms={hlTerms} />
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Deadlines Tab ────────────────────────────────────────────────── */}
        {activeTab === 'deadlines' && (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">⏳ Предстоящие</h2>
                <div className="space-y-2">
                  {upcoming.map((d) => {
                    const days = d.date ? Math.ceil((new Date(d.date).getTime() - now.getTime()) / 86400000) : null
                    const isMatch = hlTerms.length > 0 && hlTerms.some(
                      (t) => d.title.toLowerCase().includes(t.toLowerCase()) ||
                             (d.description || '').toLowerCase().includes(t.toLowerCase())
                    )
                    return (
                      <div
                        key={d.id}
                        className={`bg-white rounded-xl p-4 shadow-sm border flex items-start gap-3 transition-all ${
                          isMatch
                            ? 'border-yellow-300 ring-2 ring-yellow-200/60'
                            : days !== null && days <= 3
                            ? 'border-red-200'
                            : 'border-gray-100'
                        }`}
                      >
                        <span className="text-xl">{DEADLINE_ICONS[d.type] || '📌'}</span>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-gray-900">
                                <Hl text={d.title} terms={hlTerms} />
                              </p>
                              {d.description && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  <Hl text={d.description} terms={hlTerms} />
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${DEADLINE_COLORS[d.type] || DEADLINE_COLORS.other}`}>
                                {d.type}
                              </span>
                              {d.weight && <span className="text-xs text-gray-500">{d.weight}%</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-500">
                              📅 {d.dateText || (d.date ? new Date(d.date).toLocaleDateString('ru') : '—')}
                            </span>
                            {days !== null && (
                              <span className={`text-xs font-bold ${days <= 1 ? 'text-red-600' : days <= 7 ? 'text-orange-600' : 'text-gray-500'}`}>
                                {days === 0 ? '⚠️ Сегодня!' : days === 1 ? '⚠️ Завтра!' : `→ ${days} дн.`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">✅ Прошедшие</h2>
                <div className="space-y-2 opacity-60">
                  {past.map((d) => (
                    <div key={d.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700 line-through">
                          <Hl text={d.title} terms={hlTerms} />
                        </p>
                        <p className="text-xs text-gray-400">
                          {d.dateText || (d.date ? new Date(d.date).toLocaleDateString('ru') : '—')}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${DEADLINE_COLORS[d.type] || DEADLINE_COLORS.other}`}>
                        {d.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.deadlines.filter((d) => !d.date).length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">📌 Без даты</h2>
                <div className="space-y-2">
                  {data.deadlines.filter((d) => !d.date).map((d) => (
                    <div key={d.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                      <AlertCircle className="w-4 h-4 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">
                          <Hl text={d.title} terms={hlTerms} />
                        </p>
                        {d.dateText && <p className="text-xs text-gray-500">{d.dateText}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Grades Tab ───────────────────────────────────────────────────── */}
        {activeTab === 'grades' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-500" />
              📊 Структура оценок
            </h2>
            <div className="space-y-3">
              {data.grades.map((g) => {
                const isMatch = hlTerms.length > 0 && hlTerms.some(
                  (t) => g.title.toLowerCase().includes(t.toLowerCase()) ||
                         (g.description || '').toLowerCase().includes(t.toLowerCase())
                )
                return (
                  <div
                    key={g.id}
                    className={`rounded-xl px-3 py-3 -mx-3 transition-all ${isMatch ? 'bg-yellow-50 ring-1 ring-yellow-200' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800">
                        <Hl text={g.title} terms={hlTerms} />
                      </span>
                      <span className="text-sm font-bold text-indigo-600">{g.weight}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full"
                        style={{ width: `${g.weight}%` }}
                      />
                    </div>
                    {g.description && (
                      <p className="text-xs text-gray-500 mt-1">
                        <Hl text={g.description} terms={hlTerms} />
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
            {totalWeight !== 100 && (
              <p className={`mt-4 text-sm font-medium ${Math.abs(totalWeight - 100) < 5 ? 'text-gray-500' : 'text-red-500'}`}>
                Итого: {totalWeight}% {Math.abs(totalWeight - 100) >= 5 ? '⚠️ не равно 100%' : ''}
              </p>
            )}
          </div>
        )}

        {/* ── Schedule Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'schedule' && (
          <div className="space-y-3">
            {structured.topics?.length > 0 ? (
              structured.topics.map((topic, i) => {
                const isMatch = hlTerms.length > 0 && hlTerms.some(
                  (t) => topic.title.toLowerCase().includes(t.toLowerCase()) ||
                         (topic.description || '').toLowerCase().includes(t.toLowerCase())
                )
                return (
                  <div
                    key={i}
                    className={`bg-white rounded-xl p-4 shadow-sm border flex gap-3 transition-all ${
                      isMatch ? 'border-yellow-300 ring-2 ring-yellow-200/60' : 'border-gray-100'
                    }`}
                  >
                    <div className="shrink-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${isMatch ? 'bg-yellow-100 text-yellow-700' : 'bg-indigo-100 text-indigo-600'}`}>
                        {topic.week ? topic.week.replace(/\D/g, '') || (i + 1) : i + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">
                        <Hl text={topic.title} terms={hlTerms} />
                      </p>
                      {topic.date && <p className="text-xs text-gray-500 mt-0.5">📅 {topic.date}</p>}
                      {topic.description && (
                        <p className="text-xs text-gray-600 mt-1">
                          <Hl text={topic.description} terms={hlTerms} />
                        </p>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">📅</div>
                <p>Расписание не найдено в силлабусе</p>
              </div>
            )}
          </div>
        )}

        {/* ── Full Text Tab ────────────────────────────────────────────────── */}
        {activeTab === 'fulltext' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
              <span className="text-sm font-semibold text-gray-700">📄 Полный текст силлабуса</span>
              {hlTerms.length > 0 && (
                <span className="text-xs text-gray-400 ml-auto">
                  {hlTerms.length} {hlTerms.length === 1 ? 'слово' : 'слова'} подсвечено
                </span>
              )}
            </div>
            <div className="p-5 max-h-[72vh] overflow-y-auto">
              <div className="text-sm text-gray-700 leading-relaxed font-mono whitespace-pre-wrap">
                <Hl text={data.rawText} terms={hlTerms} />
              </div>
            </div>
          </div>
        )}

        {/* ── Policies Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'policies' && (
          <div className="space-y-4">
            {structured.policies?.length > 0 ? (
              structured.policies.map((policy, i) => {
                const isMatch = hlTerms.length > 0 && hlTerms.some(
                  (t) => policy.title.toLowerCase().includes(t.toLowerCase()) ||
                         policy.content.toLowerCase().includes(t.toLowerCase())
                )
                return (
                  <div
                    key={i}
                    className={`bg-white rounded-2xl p-5 shadow-sm border transition-all ${
                      isMatch ? 'border-yellow-300 ring-2 ring-yellow-200/60' : 'border-gray-100'
                    }`}
                  >
                    <h3 className="font-semibold text-gray-900 mb-2">
                      <Hl text={policy.title} terms={hlTerms} />
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      <Hl text={policy.content} terms={hlTerms} />
                    </p>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">📜</div>
                <p>Правила не найдены в силлабусе</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

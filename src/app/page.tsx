'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Upload, Calendar, TrendingUp, Bell } from 'lucide-react'
import Link from 'next/link'
import UploadZone from '@/components/UploadZone'
import SyllabusCard from '@/components/SyllabusCard'
import SearchBar from '@/components/SearchBar'

interface Syllabus {
  id: string
  subject: string
  courseCode: string | null
  professor: string | null
  semester: string | null
  year: number | null
  structured: string
  deadlines: { id: string; date: Date | null; title: string; type: string }[]
}

export default function Dashboard() {
  const [syllabuses, setSyllabuses] = useState<Syllabus[]>([])
  const [displayed, setDisplayed] = useState<Syllabus[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  const fetchSyllabuses = useCallback(async () => {
    try {
      const res = await fetch('/api/syllabuses')
      const data = await res.json()
      setSyllabuses(data)
      setDisplayed(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSyllabuses() }, [fetchSyllabuses])

  const handleDelete = (id: string) => {
    setSyllabuses((prev) => prev.filter((s) => s.id !== id))
    setDisplayed((prev) => prev.filter((s) => s.id !== id))
  }

  const upcomingDeadlines = syllabuses
    .flatMap((s) =>
      s.deadlines
        .filter((d) => d.date && new Date(d.date) > new Date())
        .map((d) => ({ ...d, subject: s.subject, syllabusId: s.id }))
    )
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
    .slice(0, 3)

  const totalDeadlines = syllabuses.flatMap((s) => s.deadlines).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200/60 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                SyllabusAI
              </h1>
              <p className="text-[10px] text-gray-400 leading-none">Умный органайзер</p>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link href="/deadlines" className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Дедлайны</span>
            </Link>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:scale-105 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Загрузить</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { icon: '📚', label: 'Предметов', value: syllabuses.length },
            { icon: '📅', label: 'Дедлайнов', value: totalDeadlines },
            { icon: '⚡', label: 'Скоро', value: upcomingDeadlines.length },
            {
              icon: '✅',
              label: 'Прошло',
              value: syllabuses.flatMap(s => s.deadlines).filter(d => d.date && new Date(d.date) < new Date()).length
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {showUpload && (
          <div className="mb-8 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-500" />
              Загрузить силлабус
            </h2>
            <UploadZone onUploadSuccess={() => { fetchSyllabuses(); setShowUpload(false) }} />
          </div>
        )}

        {upcomingDeadlines.length > 0 && (
          <div className="mb-8 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-semibold text-orange-800">Ближайшие дедлайны</h3>
            </div>
            <div className="space-y-2">
              {upcomingDeadlines.map((d) => {
                const days = Math.ceil((new Date(d.date!).getTime() - Date.now()) / 86400000)
                return (
                  <Link key={d.id} href={`/syllabus/${d.syllabusId}`}>
                    <div className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-2 hover:bg-white transition-colors cursor-pointer">
                      <div>
                        <span className="text-sm font-medium text-gray-800">{d.title}</span>
                        <span className="text-xs text-gray-500 ml-2">· {d.subject}</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${days <= 1 ? 'bg-red-100 text-red-700' : days <= 3 ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {days === 0 ? 'Сегодня!' : days === 1 ? 'Завтра!' : `${days} дн.`}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        <div className="mb-6">
          <SearchBar
            onResults={(results) => { setDisplayed(results as Syllabus[]); setIsSearching(true) }}
            onClear={() => { setDisplayed(syllabuses); setIsSearching(false) }}
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mb-4" />
            <p>Загрузка...</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-7xl mb-4">📂</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {isSearching ? 'Ничего не найдено' : 'Нет силлабусов'}
            </h3>
            <p className="text-gray-500 mb-6">
              {isSearching ? 'Попробуй другой запрос' : 'Загрузи первый силлабус чтобы начать'}
            </p>
            {!isSearching && (
              <button
                onClick={() => setShowUpload(true)}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
              >
                📤 Загрузить силлабус
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-700">
                {isSearching ? `🔍 Найдено: ${displayed.length}` : `📚 Все предметы (${displayed.length})`}
              </h2>
              <Link href="/deadlines" className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Все дедлайны
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayed.map((s) => (
                <SyllabusCard key={s.id} syllabus={s} onDelete={handleDelete} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

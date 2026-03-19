'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, X, Command } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { SearchHit } from '@/app/api/search/route'

const TAB_LABELS: Record<string, string> = {
  overview: 'Обзор',
  deadlines: 'Дедлайны',
  grades: 'Оценки',
  schedule: 'Расписание',
  policies: 'Правила',
}

function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length || !text) return <>{text}</>
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

interface SearchResponse {
  syllabuses: unknown[]
  hits: SearchHit[]
}

interface Props {
  onResults: (syllabuses: unknown[]) => void
  onClear: () => void
}

export default function SearchBar({ onResults, onClear }: Props) {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [hits, setHits] = useState<SearchHit[]>([])
  const [showPanel, setShowPanel] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const selectedItemRef = useRef<HTMLButtonElement | null>(null)
  // Prevents onMouseEnter from clobbering keyboard selection
  const keyboardActiveRef = useRef(false)
  const keyboardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setHits([])
        setShowPanel(false)
        onClear()
        return
      }
      setIsSearching(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        const data: SearchResponse = await res.json()
        onResults(Array.isArray(data.syllabuses) ? data.syllabuses : [])
        const searchHits = Array.isArray(data.hits) ? data.hits : []
        setHits(searchHits)
        setShowPanel(true)
        setSelectedIdx(-1)
      } finally {
        setIsSearching(false)
      }
    },
    [onResults, onClear]
  )

  useEffect(() => {
    const timer = setTimeout(() => search(query), 280)
    return () => clearTimeout(timer)
  }, [query, search])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) setShowPanel(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Cmd+K focus shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Scroll selected item into view
  useEffect(() => {
    selectedItemRef.current?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  const navigateToHit = (hit: SearchHit) => {
    const params = new URLSearchParams({ tab: hit.tab, hl: hit.terms.join(',') })
    router.push(`/syllabus/${hit.syllabusId}?${params}`)
    setShowPanel(false)
  }

  const markKeyboardActive = () => {
    keyboardActiveRef.current = true
    if (keyboardTimerRef.current) clearTimeout(keyboardTimerRef.current)
    keyboardTimerRef.current = setTimeout(() => { keyboardActiveRef.current = false }, 500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showPanel || !hits.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      markKeyboardActive()
      setSelectedIdx((i) => Math.min(i + 1, hits.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      markKeyboardActive()
      setSelectedIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && selectedIdx >= 0) {
      e.preventDefault()
      navigateToHit(hits[selectedIdx])
    } else if (e.key === 'Escape') {
      setShowPanel(false)
      inputRef.current?.blur()
    }
  }

  const clear = () => {
    setQuery('')
    setHits([])
    setShowPanel(false)
    onClear()
  }

  // Parse subject:query syntax for hint
  const colonIdx = query.indexOf(':')
  const hasSubjectFilter = colonIdx > 0
  const subjectPart = hasSubjectFilter ? query.slice(0, colonIdx) : ''
  const contentPart = hasSubjectFilter ? query.slice(colonIdx + 1).trim() : query.trim()

  // Group hits by syllabusId
  const grouped = hits.reduce<Record<string, SearchHit[]>>((acc, hit) => {
    if (!acc[hit.syllabusId]) acc[hit.syllabusId] = []
    acc[hit.syllabusId].push(hit)
    return acc
  }, {})

  let globalIdx = 0

  return (
    <div className="relative">
      {/* Input */}
      <div className="relative">
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isSearching ? 'text-indigo-500 animate-pulse' : 'text-gray-400'}`} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Поиск… попробуй psychology:assignment1 criteria"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => hits.length > 0 && setShowPanel(true)}
          onKeyDown={handleKeyDown}
          className="w-full pl-11 pr-24 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all shadow-sm"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {query ? (
            <button onClick={clear} className="text-gray-400 hover:text-gray-600 p-0.5">
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-0.5 text-xs text-gray-300 bg-gray-100 px-2 py-1 rounded-lg">
              <Command className="w-3 h-3" /><span>K</span>
            </div>
          )}
        </div>
      </div>

      {/* Parsed query hint */}
      {hasSubjectFilter && query.length > colonIdx + 1 && (
        <div className="mt-2 flex items-center gap-2 px-1">
          <span className="text-xs text-gray-400">Ищем в</span>
          <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">{subjectPart}</span>
          {contentPart && (
            <>
              <span className="text-xs text-gray-400">по запросу</span>
              <span className="text-xs font-medium text-gray-600">«{contentPart}»</span>
            </>
          )}
        </div>
      )}

      {/* Results panel */}
      {showPanel && (
        <div
          ref={panelRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200/80 rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{ maxHeight: '70vh', overflowY: 'auto' }}
        >
          {hits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm">Ничего не найдено</p>
              {hasSubjectFilter && (
                <p className="text-xs mt-1 text-gray-300">Попробуй изменить название предмета</p>
              )}
            </div>
          ) : (
            <>
              <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">
                  {hits.length} {hits.length === 1 ? 'результат' : hits.length < 5 ? 'результата' : 'результатов'}
                </span>
                <span className="text-xs text-gray-300 hidden sm:block">
                  ↑↓ навигация · Enter открыть · Esc закрыть
                </span>
              </div>

              {Object.entries(grouped).map(([syllabusId, syllabusHits]) => {
                const first = syllabusHits[0]
                return (
                  <div key={syllabusId} className="border-b border-gray-100/70 last:border-0">
                    {/* Syllabus header */}
                    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white">
                      <span className="text-lg leading-none">{first.emoji}</span>
                      <span className="text-sm font-semibold text-gray-800 truncate">{first.subject}</span>
                      {first.courseCode && (
                        <span className="shrink-0 text-xs px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full font-medium">
                          {first.courseCode}
                        </span>
                      )}
                    </div>

                    {/* Hits */}
                    {syllabusHits.map((hit) => {
                      const idx = globalIdx++
                      const isSelected = idx === selectedIdx
                      return (
                        <button
                          key={`${hit.syllabusId}-${hit.section}-${idx}`}
                          ref={isSelected ? selectedItemRef : null}
                          onClick={() => navigateToHit(hit)}
                          onMouseEnter={() => {
                            if (!keyboardActiveRef.current) setSelectedIdx(idx)
                          }}
                          className={`w-full text-left px-4 py-3.5 flex items-start gap-3 border-l-2 transition-colors ${
                            isSelected ? 'bg-indigo-50 border-indigo-400' : 'border-transparent hover:bg-gray-50/80'
                          }`}
                        >
                          <span className="text-base shrink-0 mt-0.5">{hit.icon}</span>
                          <div className="flex-1 min-w-0">
                            {/* Title row */}
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-semibold text-gray-900 truncate">
                                <Highlighted text={hit.title} terms={hit.terms} />
                              </span>
                              <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                                isSelected ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'
                              }`}>
                                {TAB_LABELS[hit.tab]}
                              </span>
                            </div>
                            {/* Full text */}
                            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                              <Highlighted text={hit.fullText} terms={hit.terms} />
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}

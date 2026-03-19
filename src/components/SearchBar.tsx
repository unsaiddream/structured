'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, X } from 'lucide-react'

interface Props {
  onResults: (results: unknown[]) => void
  onClear: () => void
}

export default function SearchBar({ onResults, onClear }: Props) {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { onClear(); return }
    setIsSearching(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      onResults(Array.isArray(data) ? data : [])
    } finally {
      setIsSearching(false)
    }
  }, [onResults, onClear])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300)
    return () => clearTimeout(timer)
  }, [query, search])

  return (
    <div className="relative">
      <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isSearching ? 'text-indigo-500 animate-pulse' : 'text-gray-400'}`} />
      <input
        type="text"
        placeholder="🔍 Поиск по предмету, преподавателю, теме..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all shadow-sm"
      />
      {query && (
        <button
          onClick={() => { setQuery(''); onClear() }}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

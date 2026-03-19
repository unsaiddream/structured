'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface UploadZoneProps {
  onUploadSuccess: () => void
}

export default function UploadZone({ onUploadSuccess }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleFile = useCallback(
    async (file: File) => {
      setIsUploading(true)
      setStatus('idle')
      setMessage(`⚡ Analyzing "${file.name}"...`)

      const formData = new FormData()
      formData.append('file', file)

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()

        if (!res.ok) throw new Error(data.error || 'Upload failed')

        setStatus('success')
        setMessage(`✅ "${data.syllabus.subject}" added successfully!`)
        onUploadSuccess()
      } catch (error) {
        setStatus('error')
        setMessage(error instanceof Error ? error.message : 'Upload failed')
      } finally {
        setIsUploading(false)
      }
    },
    [onUploadSuccess]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div className="w-full">
      <label
        className={`
          flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200
          ${isDragging ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' : 'border-gray-300 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-400'}
          ${isUploading ? 'cursor-not-allowed opacity-70' : ''}
        `}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          {isUploading ? (
            <>
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
              <p className="text-sm text-indigo-600 font-medium">🤖 AI анализирует силлабус...</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center">
                <Upload className="w-7 h-7 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  Перетащи силлабус сюда или{' '}
                  <span className="text-indigo-600">нажми для выбора</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX до 10MB</p>
              </div>
            </>
          )}
        </div>
        <input
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.txt"
          onChange={onInputChange}
          disabled={isUploading}
        />
      </label>

      {message && (
        <div
          className={`mt-3 p-3 rounded-xl text-sm flex items-center gap-2 ${
            status === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : status === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
          }`}
        >
          {status === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : status === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
          )}
          {message}
        </div>
      )}
    </div>
  )
}

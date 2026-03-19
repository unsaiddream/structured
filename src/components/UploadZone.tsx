'use client'

import { useState, useCallback } from 'react'
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface UploadZoneProps {
  onUploadSuccess: () => void
}

async function extractPDFText(file: File, onProgress: (msg: string) => void): Promise<string> {
  onProgress('📄 Читаем PDF в браузере...')
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise
  const totalPages = pdf.numPages

  onProgress(`📄 Извлекаем текст из ${totalPages} страниц...`)

  let text = ''
  // Extract up to 40 pages — enough for any syllabus
  const maxPages = Math.min(totalPages, 40)
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ') + '\n'
  }

  return text.trim()
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
      setMessage(`⚡ Обрабатываем "${file.name}"...`)

      try {
        let body: FormData | string
        let headers: HeadersInit = {}
        let rawText = ''

        const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf')

        if (isPDF) {
          // Extract text client-side — file never uploaded, any size works
          rawText = await extractPDFText(file, (msg) => setMessage(msg))
          if (!rawText || rawText.length < 50) {
            throw new Error('Не удалось извлечь текст из PDF. Возможно, файл содержит только сканы.')
          }
          body = JSON.stringify({ rawText, fileName: file.name, fileSize: file.size })
          headers = { 'Content-Type': 'application/json' }
          setMessage('🤖 AI анализирует силлабус...')
        } else {
          // DOCX / TXT — upload file normally
          if (file.size > 50 * 1024 * 1024) {
            throw new Error('Файл слишком большой. Максимум 50MB для DOCX/TXT.')
          }
          const formData = new FormData()
          formData.append('file', file)
          body = formData
          setMessage('🤖 AI анализирует силлабус...')
        }

        const res = await fetch('/api/upload', { method: 'POST', body, headers })
        const text = await res.text()
        let data: { error?: string; syllabus?: { subject: string } }
        try {
          data = JSON.parse(text)
        } catch {
          throw new Error(`Server error (${res.status}): ${text.slice(0, 300)}`)
        }

        if (!res.ok) throw new Error(data.error || 'Upload failed')

        setStatus('success')
        setMessage(`✅ "${data.syllabus?.subject}" добавлен!`)
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
              <p className="text-sm text-indigo-600 font-medium">{message}</p>
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
                <p className="text-xs text-gray-500 mt-1">PDF любого размера · DOCX до 50MB</p>
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

      {!isUploading && message && (
        <div
          className={`mt-3 p-3 rounded-xl text-sm flex items-center gap-2 ${
            status === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {status === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {message}
        </div>
      )}
    </div>
  )
}

import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string> {
  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return extractFromPDF(buffer)
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword' ||
    fileName.endsWith('.docx') ||
    fileName.endsWith('.doc')
  ) {
    return extractFromDOCX(buffer)
  }

  if (mimeType === 'text/plain' || fileName.endsWith('.txt')) {
    return buffer.toString('utf-8')
  }

  throw new Error(`Unsupported file type: ${mimeType}`)
}

async function extractFromPDF(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfModule = await import('pdf-parse') as any
  const pdfParse = pdfModule.default || pdfModule
  const data = await pdfParse(buffer)
  return data.text
}

async function extractFromDOCX(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

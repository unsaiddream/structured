import Anthropic from '@anthropic-ai/sdk'
import type { StructuredSyllabus } from '@/types/syllabus'

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set. Add it to your .env file.')
  return new Anthropic({ apiKey })
}

const SUBJECT_EMOJIS: Record<string, string> = {
  math: '📐',
  mathematics: '📐',
  calculus: '📐',
  algebra: '📐',
  statistics: '📊',
  physics: '⚛️',
  chemistry: '🧪',
  biology: '🧬',
  computer: '💻',
  programming: '💻',
  software: '💻',
  data: '📊',
  history: '🏛️',
  literature: '📚',
  english: '✍️',
  writing: '✍️',
  economics: '💰',
  finance: '💰',
  psychology: '🧠',
  philosophy: '🤔',
  art: '🎨',
  music: '🎵',
  engineering: '⚙️',
  medicine: '🏥',
  law: '⚖️',
  business: '💼',
  marketing: '📣',
  design: '🎨',
  architecture: '🏗️',
  geography: '🌍',
  political: '🗳️',
  sociology: '👥',
  anthropology: '🦴',
  linguistics: '🗣️',
  default: '📋',
}

const SUBJECT_COLORS: Record<string, string> = {
  math: 'blue',
  physics: 'purple',
  chemistry: 'green',
  biology: 'emerald',
  computer: 'cyan',
  history: 'amber',
  literature: 'rose',
  english: 'pink',
  economics: 'yellow',
  psychology: 'violet',
  art: 'orange',
  default: 'slate',
}

function getSubjectEmoji(subject: string): string {
  const lower = subject.toLowerCase()
  for (const [key, emoji] of Object.entries(SUBJECT_EMOJIS)) {
    if (lower.includes(key)) return emoji
  }
  return SUBJECT_EMOJIS.default
}

function getSubjectColor(subject: string): string {
  const lower = subject.toLowerCase()
  for (const [key, color] of Object.entries(SUBJECT_COLORS)) {
    if (lower.includes(key)) return color
  }
  return SUBJECT_COLORS.default
}

export async function structureSyllabus(rawText: string): Promise<StructuredSyllabus> {
  const prompt = `You are an expert at parsing university/college syllabuses. Analyze the following syllabus text and extract all key information. Return a JSON object with this exact structure:

{
  "subject": "Full subject/course name",
  "courseCode": "Course code like CS101 (if found)",
  "professor": "Professor/instructor name (if found)",
  "semester": "Fall/Spring/Summer (if found)",
  "year": 2024,
  "credits": 3,
  "schedule": "Meeting days and times (if found)",
  "room": "Classroom location (if found)",
  "officeHours": "Professor office hours (if found)",
  "description": "Course description (1-2 sentences summary)",
  "objectives": ["Learning objective 1", "Learning objective 2"],
  "topics": [
    {"week": "Week 1", "date": "Jan 15", "title": "Topic title", "description": "Brief description"}
  ],
  "gradeBreakdown": [
    {"title": "Midterm Exam", "weight": 25, "description": "Covers chapters 1-5"}
  ],
  "deadlines": [
    {"title": "Assignment 1", "date": "2024-02-15", "dateText": "February 15", "type": "assignment", "description": "Brief description", "weight": 10}
  ],
  "requiredMaterials": ["Textbook name and author", "Other required materials"],
  "policies": [
    {"title": "Attendance", "content": "Brief policy description"}
  ],
  "contactInfo": {
    "email": "professor@university.edu",
    "phone": "555-1234",
    "officeLocation": "Building 101"
  }
}

Rules:
- Extract as much real data as possible from the syllabus
- For dates, try to provide ISO format (YYYY-MM-DD) in "date" field and human-readable in "dateText"
- Grade weights should be numbers (percentages)
- Types for deadlines: "assignment", "exam", "quiz", "project", "other"
- If year is not found, use current year
- Keep descriptions concise
- objectives should be actual learning outcomes from the syllabus
- If information is not found, omit the field or use null

Syllabus text:
${rawText.slice(0, 15000)}`

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')

  let jsonText = content.text
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonMatch) jsonText = jsonMatch[1]

  const parsed = JSON.parse(jsonText) as StructuredSyllabus

  parsed.emoji = getSubjectEmoji(parsed.subject)
  parsed.color = getSubjectColor(parsed.subject)

  return parsed
}

const VISION_PROMPT = `You are analyzing scanned pages of a university syllabus. Extract all key information from these images and return ONLY a JSON object (no markdown, no explanation) with this structure:

{"subject":"Full course name","courseCode":"CS101","professor":"Name","semester":"Fall","year":2024,"credits":3,"schedule":"Days/times","room":"Location","officeHours":"Hours","description":"1-2 sentence summary","objectives":["objective"],"topics":[{"week":"Week 1","date":"Jan 15","title":"Topic","description":"Brief"}],"gradeBreakdown":[{"title":"Midterm","weight":25,"description":"Details"}],"deadlines":[{"title":"Assignment 1","date":"2024-02-15","dateText":"Feb 15","type":"assignment","description":"Details","weight":10}],"requiredMaterials":["Textbook"],"policies":[{"title":"Attendance","content":"Policy text"}],"contactInfo":{"email":"prof@uni.edu","phone":"555-1234","officeLocation":"Bldg 101"}}

Rules:
- Extract everything visible in the scanned pages
- deadline types: "assignment", "exam", "quiz", "project", "other"
- dates in ISO format YYYY-MM-DD when possible
- weights are percentages (numbers)
- Return ONLY valid JSON, nothing else`

export async function structureSyllabusFromImages(
  images: { data: string; mediaType: 'image/jpeg' }[]
): Promise<StructuredSyllabus> {
  const content: Anthropic.MessageParam['content'] = [
    { type: 'text', text: VISION_PROMPT },
    ...images.map((img) => ({
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: img.mediaType, data: img.data },
    })),
  ]

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content }],
  })

  const responseContent = response.content[0]
  if (responseContent.type !== 'text') throw new Error('Unexpected response type from Claude')

  let jsonText = responseContent.text.trim()
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonMatch) jsonText = jsonMatch[1]

  const parsed = JSON.parse(jsonText) as StructuredSyllabus
  parsed.emoji = getSubjectEmoji(parsed.subject)
  parsed.color = getSubjectColor(parsed.subject)

  return parsed
}

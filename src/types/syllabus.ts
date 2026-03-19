export interface StructuredSyllabus {
  subject: string
  courseCode?: string
  professor?: string
  semester?: string
  year?: number
  credits?: number
  schedule?: string
  room?: string
  officeHours?: string
  description?: string
  objectives: string[]
  topics: Topic[]
  gradeBreakdown: GradeItem[]
  deadlines: DeadlineItem[]
  requiredMaterials: string[]
  policies: Policy[]
  contactInfo?: ContactInfo
  emoji: string
  color: string
}

export interface Topic {
  week?: string
  date?: string
  title: string
  description?: string
}

export interface GradeItem {
  title: string
  weight: number
  description?: string
}

export interface DeadlineItem {
  title: string
  date?: string
  dateText?: string
  type: 'assignment' | 'exam' | 'quiz' | 'project' | 'other'
  description?: string
  weight?: number
}

export interface Policy {
  title: string
  content: string
}

export interface ContactInfo {
  email?: string
  phone?: string
  officeLocation?: string
}

import { supabase } from '@/lib/supabase'
import type {
  CourseCategory,
  TrainingCourse,
  TrainingEnrollment,
  TrainingAssessment,
  TrainingAssessmentAttempt,
} from '@/types/database.types'

// ── Current Employee ──────────────────────────────────────────

export async function getCurrentEmployee(profileId: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('profile_id', profileId)
    .single()
  if (error) throw error
  return data
}

// ── Course Categories ──────────────────────────────────────────

export async function fetchCourseCategories(organizationId: string) {
  const { data, error } = await supabase
    .from('course_categories')
    .select('*')
    .eq('organization_id', organizationId)
    .order('category_name')
  if (error) throw error
  return data as CourseCategory[]
}

export async function createCourseCategory(payload: {
  organization_id: string
  category_name: string
  description?: string
}) {
  const { data, error } = await supabase
    .from('course_categories')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as CourseCategory
}

export async function updateCourseCategory(id: string, payload: Partial<CourseCategory>) {
  const { data, error } = await supabase
    .from('course_categories')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as CourseCategory
}

export async function deleteCourseCategory(id: string) {
  const { error } = await supabase.from('course_categories').delete().eq('id', id)
  if (error) throw error
}

// ── Training Courses ──────────────────────────────────────────

export async function fetchTrainingCourses(organizationId: string) {
  const { data, error } = await supabase
    .from('training_courses')
    .select('*, category:course_categories(id, category_name), creator:employees!training_courses_created_by_fkey(id, first_name, last_name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchTrainingCourse(id: string) {
  const { data, error } = await supabase
    .from('training_courses')
    .select('*, category:course_categories(id, category_name), creator:employees!training_courses_created_by_fkey(id, first_name, last_name)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createTrainingCourse(payload: {
  organization_id: string
  course_code: string
  course_name: string
  description?: string
  category_id?: string | null
  mode: string
  duration_hours?: number | null
  instructor_name?: string
  max_participants?: number | null
  syllabus?: string
  prerequisites?: string
  is_mandatory?: boolean
  created_by?: string
}) {
  const { data, error } = await supabase
    .from('training_courses')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as TrainingCourse
}

export async function updateTrainingCourse(id: string, payload: Partial<TrainingCourse>) {
  const { data, error } = await supabase
    .from('training_courses')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as TrainingCourse
}

export async function updateCourseStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from('training_courses')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as TrainingCourse
}

export async function deleteTrainingCourse(id: string) {
  const { error } = await supabase.from('training_courses').delete().eq('id', id)
  if (error) throw error
}

// ── Training Enrollments ──────────────────────────────────────

export async function fetchEnrollments(organizationId: string) {
  const { data, error } = await supabase
    .from('training_enrollments')
    .select('*, course:training_courses(id, course_code, course_name), employee:employees!training_enrollments_employee_id_fkey(id, first_name, last_name, employee_code)')
    .eq('organization_id', organizationId)
    .order('enrolled_date', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchCourseEnrollments(courseId: string) {
  const { data, error } = await supabase
    .from('training_enrollments')
    .select('*, employee:employees!training_enrollments_employee_id_fkey(id, first_name, last_name, employee_code)')
    .eq('course_id', courseId)
    .order('enrolled_date', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchMyEnrollments(employeeId: string) {
  const { data, error } = await supabase
    .from('training_enrollments')
    .select('*, course:training_courses(id, course_code, course_name, mode, duration_hours, status)')
    .eq('employee_id', employeeId)
    .order('enrolled_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createEnrollment(payload: {
  organization_id: string
  course_id: string
  employee_id: string
  enrolled_by?: string
  enrolled_date?: string
  status?: string
}) {
  const { data, error } = await supabase
    .from('training_enrollments')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as TrainingEnrollment
}

export async function bulkEnroll(payloads: Array<{
  organization_id: string
  course_id: string
  employee_id: string
  enrolled_by?: string
}>) {
  const { data, error } = await supabase
    .from('training_enrollments')
    .insert(payloads)
    .select()
  if (error) throw error
  return data as TrainingEnrollment[]
}

export async function updateEnrollment(id: string, payload: Partial<TrainingEnrollment>) {
  const { data, error } = await supabase
    .from('training_enrollments')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as TrainingEnrollment
}

export async function deleteEnrollment(id: string) {
  const { error } = await supabase.from('training_enrollments').delete().eq('id', id)
  if (error) throw error
}

// ── Training Assessments ──────────────────────────────────────

export async function fetchAssessments(courseId: string) {
  const { data, error } = await supabase
    .from('training_assessments')
    .select('*')
    .eq('course_id', courseId)
    .order('display_order')
  if (error) throw error
  return data as TrainingAssessment[]
}

export async function fetchAllAssessments(organizationId: string) {
  const { data, error } = await supabase
    .from('training_assessments')
    .select('*, course:training_courses(id, course_code, course_name, organization_id)')
    .order('created_at', { ascending: false })
  if (error) throw error
  // Filter by org since assessments don't have direct org_id
  return (data ?? []).filter((a: any) => a.course?.organization_id === organizationId)
}

export async function createAssessment(payload: {
  course_id: string
  assessment_name: string
  assessment_type: string
  total_marks?: number
  passing_marks?: number
  duration_minutes?: number | null
  is_mandatory?: boolean
  display_order?: number
}) {
  const { data, error } = await supabase
    .from('training_assessments')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as TrainingAssessment
}

export async function updateAssessment(id: string, payload: Partial<TrainingAssessment>) {
  const { data, error } = await supabase
    .from('training_assessments')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as TrainingAssessment
}

export async function deleteAssessment(id: string) {
  const { error } = await supabase.from('training_assessments').delete().eq('id', id)
  if (error) throw error
}

// ── Assessment Attempts ──────────────────────────────────────

export async function fetchAttempts(assessmentId: string) {
  const { data, error } = await supabase
    .from('training_assessment_attempts')
    .select('*, employee:employees(id, first_name, last_name, employee_code)')
    .eq('assessment_id', assessmentId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createAttempt(payload: {
  assessment_id: string
  employee_id: string
  attempt_number?: number
  score?: number
  status?: string
  completed_at?: string | null
}) {
  const { data, error } = await supabase
    .from('training_assessment_attempts')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as TrainingAssessmentAttempt
}

export async function updateAttempt(id: string, payload: Partial<TrainingAssessmentAttempt>) {
  const { data, error } = await supabase
    .from('training_assessment_attempts')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as TrainingAssessmentAttempt
}

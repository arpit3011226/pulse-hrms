import { supabase } from '@/lib/supabase'
import { one } from '@/lib/supabase-embed'
import type { SurveyTargetRule, SurveyCategory, SurveyQuestionType, SurveyQuestionOption, SurveyDisplayAs } from '@/types/database.types'
import { computeAnswerScore } from '../utils/survey-score'

// ── Survey CRUD ──────────────────────────────────────────────

export async function getSurveys(orgId: string) {
  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getSurvey(surveyId: string) {
  const { data, error } = await supabase
    .from('surveys')
    .select('*, survey_questions(*)')
    .eq('id', surveyId)
    .single()
  if (error) throw error
  return data
}

export async function createSurvey(data: {
  organization_id: string
  title: string
  description?: string | null
  target_rules?: SurveyTargetRule[]
  start_date: string
  end_date: string
  is_anonymous?: boolean
  is_pulse?: boolean
  recurrence?: string | null
  created_by: string
}) {
  const { data: survey, error } = await supabase
    .from('surveys')
    .insert({
      ...data,
      status: 'draft',
      target_rules: data.target_rules ?? [],
    })
    .select()
    .single()
  if (error) throw error
  return survey
}

export async function updateSurvey(
  surveyId: string,
  data: {
    title?: string
    description?: string | null
    status?: 'draft' | 'active' | 'closed'
    target_rules?: SurveyTargetRule[]
    start_date?: string
    end_date?: string
    is_anonymous?: boolean
    is_pulse?: boolean
    recurrence?: string | null
  }
) {
  const { data: survey, error } = await supabase
    .from('surveys')
    .update(data)
    .eq('id', surveyId)
    .select()
    .single()
  if (error) throw error
  return survey
}

export async function deleteSurvey(surveyId: string) {
  const { error } = await supabase.from('surveys').delete().eq('id', surveyId)
  if (error) throw error
}

// ── Survey Questions ──────────────────────────────────────────

export async function addSurveyQuestions(
  surveyId: string,
  orgId: string,
  questions: {
    question_text: string
    category: SurveyCategory
    question_order: number
    is_required: boolean
    question_type?: SurveyQuestionType
    options?: SurveyQuestionOption[] | null
    display_as?: SurveyDisplayAs | null
  }[]
) {
  const rows = questions.map((q) => ({
    survey_id: surveyId,
    organization_id: orgId,
    ...q,
  }))
  const { data, error } = await supabase.from('survey_questions').insert(rows).select()
  if (error) throw error
  return data
}

export async function deleteSurveyQuestions(surveyId: string) {
  const { error } = await supabase
    .from('survey_questions')
    .delete()
    .eq('survey_id', surveyId)
  if (error) throw error
}

// ── Survey Responses ──────────────────────────────────────────

export async function getMyResponse(surveyId: string, employeeId: string) {
  const { data, error } = await supabase
    .from('survey_responses')
    .select('id')
    .eq('survey_id', surveyId)
    .eq('employee_id', employeeId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function submitSurveyResponse(
  surveyId: string,
  orgId: string,
  employeeId: string,
  isAnonymous: boolean,
  answers: {
    question_id: string
    rating?: number | null
    comment?: string | null
    selected_options?: string[] | null
    text_value?: string | null
  }[]
) {
  // Insert response
  const { data: response, error: resError } = await supabase
    .from('survey_responses')
    .insert({
      survey_id: surveyId,
      organization_id: orgId,
      employee_id: employeeId,
      is_anonymous: isAnonymous,
    })
    .select()
    .single()
  if (resError) throw resError

  // Insert answers
  const answerRows = answers.map((a) => ({
    response_id: response.id,
    question_id: a.question_id,
    organization_id: orgId,
    rating: a.rating ?? null,
    comment: a.comment ?? null,
    selected_options: a.selected_options ?? null,
    text_value: a.text_value ?? null,
  }))
  const { error: ansError } = await supabase.from('survey_answers').insert(answerRows)
  if (ansError) throw ansError

  return response
}

// ── Response Counts ──────────────────────────────────────────

export async function getSurveyResponseCounts(orgId: string) {
  const { data, error } = await supabase
    .from('survey_responses')
    .select('survey_id')
    .eq('organization_id', orgId)
  if (error) throw error

  const counts = new Map<string, number>()
  for (const r of data ?? []) {
    counts.set(r.survey_id, (counts.get(r.survey_id) ?? 0) + 1)
  }
  return counts
}

// ── Sentiment Aggregation ──────────────────────────────────────

export async function getSentimentAggregation(
  orgId: string,
  startDate: string,
  endDate: string
) {
  // 1. Get surveys in the date range
  const { data: surveys, error: sErr } = await supabase
    .from('surveys')
    .select('id')
    .eq('organization_id', orgId)
    .in('status', ['active', 'closed'])
    .gte('start_date', startDate)
    .lte('end_date', endDate)
  if (sErr) throw sErr
  if (!surveys || surveys.length === 0) return []

  const surveyIds = surveys.map((s) => s.id)

  // 2. Get responses for those surveys
  const { data: responses, error: rErr } = await supabase
    .from('survey_responses')
    .select('id')
    .in('survey_id', surveyIds)
  if (rErr) throw rErr
  if (!responses || responses.length === 0) return []

  const responseIds = responses.map((r) => r.id)

  // 3. Get answers with question categories and type info
  const { data: answers, error: aErr } = await supabase
    .from('survey_answers')
    .select('rating, selected_options, text_value, question:survey_questions(category, question_type, options)')
    .in('response_id', responseIds)
  if (aErr) throw aErr

  // 4. Aggregate by category using normalized scores
  const categoryMap = new Map<string, { total: number; count: number }>()
  for (const answer of answers ?? []) {
    const q = answer.question as any
    const category = q?.category as string
    if (!category) continue
    const score = computeAnswerScore(answer, q)
    if (score == null) continue // skip text answers or invalid
    const existing = categoryMap.get(category) ?? { total: 0, count: 0 }
    existing.total += score
    existing.count += 1
    categoryMap.set(category, existing)
  }

  return Array.from(categoryMap.entries()).map(([category, { total, count }]) => ({
    category: category as SurveyCategory,
    avgRating: (total / count / 100) * 5, // back to 1-5 scale for display
    score: Math.round(total / count),
    responseCount: count,
  }))
}

export async function getSentimentByDepartment(
  orgId: string,
  startDate: string,
  endDate: string
) {
  // 1. Get surveys in range
  const { data: surveys, error: sErr } = await supabase
    .from('surveys')
    .select('id')
    .eq('organization_id', orgId)
    .in('status', ['active', 'closed'])
    .gte('start_date', startDate)
    .lte('end_date', endDate)
  if (sErr) throw sErr
  if (!surveys || surveys.length === 0) return []

  const surveyIds = surveys.map((s) => s.id)

  // 2. Get responses with employee department info
  const { data: responses, error: rErr } = await supabase
    .from('survey_responses')
    .select('id, employee:employees(department_id, department:departments!department_id(name))')
    .in('survey_id', surveyIds)
  if (rErr) throw rErr
  if (!responses || responses.length === 0) return []

  // Build a map: response_id → department_name
  const responseDeptMap = new Map<string, string>()
  for (const r of responses) {
    const deptName = one(one(r.employee)?.department)?.name ?? 'Unassigned'
    responseDeptMap.set(r.id, deptName)
  }

  const responseIds = responses.map((r) => r.id)

  // 3. Get answers with question type info
  const { data: answers, error: aErr } = await supabase
    .from('survey_answers')
    .select('response_id, rating, selected_options, text_value, question:survey_questions(category, question_type, options)')
    .in('response_id', responseIds)
  if (aErr) throw aErr

  // 4. Aggregate by department and category using normalized scores
  const deptCatMap = new Map<string, Map<string, { total: number; count: number }>>()
  for (const answer of answers ?? []) {
    const dept = responseDeptMap.get(answer.response_id) ?? 'Unassigned'
    const q = answer.question as any
    const category = q?.category as string
    if (!category) continue
    const score = computeAnswerScore(answer, q)
    if (score == null) continue // skip text answers or invalid

    if (!deptCatMap.has(dept)) deptCatMap.set(dept, new Map())
    const catMap = deptCatMap.get(dept)!
    const existing = catMap.get(category) ?? { total: 0, count: 0 }
    existing.total += score
    existing.count += 1
    catMap.set(category, existing)
  }

  return Array.from(deptCatMap.entries()).map(([department, catMap]) => {
    const scores: Record<string, number> = {}
    for (const [cat, { total, count }] of catMap.entries()) {
      scores[cat] = Math.round(total / count)
    }
    return { department, scores }
  })
}

// ── Audience Evaluation ──────────────────────────────────────

export function evaluateTargetRules(
  rules: SurveyTargetRule[],
  employee: {
    gender?: string | null
    department_id?: string | null
    designation_id?: string | null
    employment_type?: string | null
    status?: string | null
    date_of_joining?: string | null
    /** Comes from employee_personal now; a person can always read their own. */
    personal?: { date_of_birth?: string | null } | null
  }
): boolean {
  if (!rules || rules.length === 0) return true // No rules = all employees

  return rules.every((rule) => {
    const fieldValue =
      rule.field === 'date_of_birth'
        ? employee.personal?.date_of_birth
        : employee[rule.field as keyof typeof employee]

    switch (rule.operator) {
      case 'is':
        return fieldValue === rule.value
      case 'is_not':
        return fieldValue !== rule.value
      case 'before': {
        if (!fieldValue) return false
        return new Date(fieldValue as string) < new Date(rule.value as string)
      }
      case 'after': {
        if (!fieldValue) return false
        return new Date(fieldValue as string) > new Date(rule.value as string)
      }
      case 'less_than_days_ago': {
        if (!fieldValue) return false
        const daysAgo = new Date()
        daysAgo.setDate(daysAgo.getDate() - (rule.value as number))
        return new Date(fieldValue as string) >= daysAgo
      }
      case 'more_than_days_ago': {
        if (!fieldValue) return false
        const daysAgo = new Date()
        daysAgo.setDate(daysAgo.getDate() - (rule.value as number))
        return new Date(fieldValue as string) < daysAgo
      }
      default:
        return true
    }
  })
}

export async function getActiveSurveysForEmployee(
  orgId: string,
  employee: {
    id: string
    gender?: string | null
    department_id?: string | null
    designation_id?: string | null
    employment_type?: string | null
    status?: string | null
    date_of_joining?: string | null
    personal?: { date_of_birth?: string | null } | null
  }
) {
  const today = new Date().toISOString().split('T')[0]

  const { data: surveys, error } = await supabase
    .from('surveys')
    .select('*, survey_questions(*)')
    .eq('organization_id', orgId)
    .eq('status', 'active')
    .lte('start_date', today)
    .gte('end_date', today)
  if (error) throw error

  // Filter by target rules and check not already responded
  const { data: myResponses } = await supabase
    .from('survey_responses')
    .select('survey_id')
    .eq('employee_id', employee.id)

  const respondedSurveyIds = new Set((myResponses ?? []).map((r) => r.survey_id))

  return (surveys ?? []).filter((survey) => {
    if (respondedSurveyIds.has(survey.id)) return false
    return evaluateTargetRules(survey.target_rules as SurveyTargetRule[], employee)
  })
}

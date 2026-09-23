export type OnboardingCategory = 'pre_joining' | 'day_1' | 'week_1' | 'month_1' | 'ongoing'
export type OnboardingOwnerRole = 'hr' | 'it' | 'admin' | 'manager' | 'buddy' | 'employee' | 'finance'
export type OnboardingTaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped'
export type OnboardingRunStatus = 'not_started' | 'in_progress' | 'completed' | 'cancelled'

export const CATEGORY_LABELS: Record<OnboardingCategory, string> = {
  pre_joining: 'Before joining',
  day_1: 'Day 1',
  week_1: 'Week 1',
  month_1: 'Month 1',
  ongoing: 'Ongoing',
}

export const CATEGORY_ORDER: OnboardingCategory[] = [
  'pre_joining', 'day_1', 'week_1', 'month_1', 'ongoing',
]

export const OWNER_LABELS: Record<OnboardingOwnerRole, string> = {
  hr: 'HR',
  it: 'IT',
  admin: 'Admin',
  manager: 'Manager',
  buddy: 'Buddy',
  employee: 'New joiner',
  finance: 'Finance',
}

/** The milestones every new joiner is tracked against. */
export const JOURNEY_MILESTONES = [30, 60, 90, 180, 365] as const

export interface OnboardingTemplate {
  id: string
  organization_id: string
  name: string
  description: string | null
  department_id: string | null
  employment_type: string | null
  is_default: boolean
  is_active: boolean
  created_at: string
  department?: { id: string; name: string } | null
  onboarding_template_tasks?: OnboardingTemplateTask[]
}

export interface OnboardingTemplateTask {
  id: string
  organization_id: string
  template_id: string
  title: string
  description: string | null
  category: OnboardingCategory
  owner_role: OnboardingOwnerRole
  due_offset_days: number
  is_mandatory: boolean
  sort_order: number
}

export interface EmployeeOnboarding {
  id: string
  organization_id: string
  employee_id: string
  template_id: string | null
  joining_date: string
  buddy_id: string | null
  status: OnboardingRunStatus
  notes: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  employee?: {
    id: string; first_name: string; last_name: string; email: string
    employee_code: string | null; department_id: string | null
    designation?: { id: string; title: string } | null
    department?: { id: string; name: string } | null
  } | null
  buddy?: { id: string; first_name: string; last_name: string } | null
  onboarding_tasks?: OnboardingTask[]
  onboarding_journeys?: OnboardingJourney[]
}

export interface OnboardingTask {
  id: string
  organization_id: string
  employee_onboarding_id: string
  title: string
  description: string | null
  category: OnboardingCategory
  owner_role: OnboardingOwnerRole
  assigned_to: string | null
  due_date: string | null
  status: OnboardingTaskStatus
  is_mandatory: boolean
  sort_order: number
  notes: string | null
  completed_at: string | null
  assignee?: { id: string; first_name: string; last_name: string } | null
}

export interface OnboardingJourney {
  id: string
  organization_id: string
  employee_onboarding_id: string
  milestone_days: number
  due_date: string
  status: 'pending' | 'completed' | 'skipped'
  survey_id: string | null
  manager_notes: string | null
  employee_notes: string | null
  completed_at: string | null
}

/** Progress across the mandatory tasks of a run. */
export function taskProgress(tasks: OnboardingTask[] | undefined) {
  const list = tasks ?? []
  const counted = list.filter((t) => t.status !== 'skipped')
  const done = counted.filter((t) => t.status === 'completed').length
  const total = counted.length
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    overdue: list.filter(
      (t) =>
        t.status !== 'completed' &&
        t.status !== 'skipped' &&
        t.due_date != null &&
        t.due_date < new Date().toISOString().split('T')[0]
    ).length,
  }
}

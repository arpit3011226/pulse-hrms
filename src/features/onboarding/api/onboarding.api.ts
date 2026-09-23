import { supabase } from '@/lib/supabase'
import {
  JOURNEY_MILESTONES,
  type EmployeeOnboarding,
  type OnboardingTask,
  type OnboardingTemplate,
  type OnboardingTemplateTask,
} from '../types'

const RUN_SELECT =
  '*, employee:employees!employee_onboarding_employee_id_fkey(id, first_name, last_name, email, employee_code, department_id, designation:designations!designation_id(id, title), department:departments!department_id(id, name)),' +
  ' buddy:employees!employee_onboarding_buddy_id_fkey(id, first_name, last_name),' +
  ' onboarding_tasks(*), onboarding_journeys(*)'

/** Add days to a date string, returning YYYY-MM-DD. */
function shiftDate(isoDate: string, days: number): string {
  const d = new Date(isoDate)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// ── Templates ───────────────────────────────────────────────────────────────

export async function getTemplates(orgId: string) {
  const { data, error } = await supabase
    .from('onboarding_templates')
    .select('*, department:departments!department_id(id, name), onboarding_template_tasks(*)')
    .eq('organization_id', orgId)
    .order('name')
  if (error) throw error
  return data as unknown as OnboardingTemplate[]
}

export async function createTemplate(payload: Partial<OnboardingTemplate>) {
  const { data, error } = await supabase
    .from('onboarding_templates')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTemplate(id: string, updates: Partial<OnboardingTemplate>) {
  const { data, error } = await supabase
    .from('onboarding_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTemplate(id: string) {
  const { error } = await supabase.from('onboarding_templates').delete().eq('id', id)
  if (error) throw error
}

export async function upsertTemplateTasks(tasks: Partial<OnboardingTemplateTask>[]) {
  const { data, error } = await supabase.from('onboarding_template_tasks').insert(tasks).select()
  if (error) throw error
  return data
}

export async function deleteTemplateTask(id: string) {
  const { error } = await supabase.from('onboarding_template_tasks').delete().eq('id', id)
  if (error) throw error
}

// ── Runs ────────────────────────────────────────────────────────────────────

export async function getOnboardingRuns(orgId: string) {
  const { data, error } = await supabase
    .from('employee_onboarding')
    .select(RUN_SELECT)
    .eq('organization_id', orgId)
    .order('joining_date', { ascending: false })
  if (error) throw error
  return data as unknown as EmployeeOnboarding[]
}

export async function getOnboardingForEmployee(employeeId: string) {
  const { data, error } = await supabase
    .from('employee_onboarding')
    .select(RUN_SELECT)
    .eq('employee_id', employeeId)
    .maybeSingle()
  if (error) throw error
  return data as unknown as EmployeeOnboarding | null
}

/**
 * Start onboarding for a new joiner.
 *
 * Template tasks are COPIED, not referenced: editing a template afterwards must
 * not rewrite the plan of someone already halfway through it. Due dates are
 * worked out from the joining date and each task's offset, so a task set at -3
 * lands three days before they walk in.
 */
export async function startOnboarding(params: {
  orgId: string
  employeeId: string
  joiningDate: string
  templateId?: string | null
  buddyId?: string | null
  managerId?: string | null
  createdBy?: string | null
}) {
  const { orgId, employeeId, joiningDate, templateId, buddyId, managerId, createdBy } = params

  const { data: run, error: runError } = await supabase
    .from('employee_onboarding')
    .insert({
      organization_id: orgId,
      employee_id: employeeId,
      template_id: templateId ?? null,
      joining_date: joiningDate,
      buddy_id: buddyId ?? null,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      created_by: createdBy ?? null,
    })
    .select()
    .single()
  if (runError) throw runError

  // Copy the template's tasks across
  if (templateId) {
    const { data: templateTasks, error: ttError } = await supabase
      .from('onboarding_template_tasks')
      .select('*')
      .eq('template_id', templateId)
      .order('sort_order')
    if (ttError) throw ttError

    const rows = (templateTasks ?? []).map((t) => ({
      organization_id: orgId,
      employee_onboarding_id: run.id,
      title: t.title,
      description: t.description,
      category: t.category,
      owner_role: t.owner_role,
      // Resolve the owner where we can; HR/IT/Admin stay unassigned by person
      assigned_to:
        t.owner_role === 'employee' ? employeeId
        : t.owner_role === 'manager' ? managerId ?? null
        : t.owner_role === 'buddy' ? buddyId ?? null
        : null,
      due_date: shiftDate(joiningDate, t.due_offset_days ?? 0),
      status: 'pending',
      is_mandatory: t.is_mandatory,
      sort_order: t.sort_order,
    }))

    if (rows.length > 0) {
      const { error } = await supabase.from('onboarding_tasks').insert(rows)
      if (error) throw error
    }
  }

  // The 30/60/90/180/365 check-ins
  const journeys = JOURNEY_MILESTONES.map((days) => ({
    organization_id: orgId,
    employee_onboarding_id: run.id,
    milestone_days: days,
    due_date: shiftDate(joiningDate, days),
    status: 'pending' as const,
  }))
  const { error: jError } = await supabase.from('onboarding_journeys').insert(journeys)
  if (jError) throw jError

  return run
}

export async function updateOnboardingRun(id: string, updates: Partial<EmployeeOnboarding>) {
  const { data, error } = await supabase
    .from('employee_onboarding')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteOnboardingRun(id: string) {
  const { error } = await supabase.from('employee_onboarding').delete().eq('id', id)
  if (error) throw error
}

// ── Tasks ───────────────────────────────────────────────────────────────────

export async function updateTaskStatus(params: {
  id: string
  status: OnboardingTask['status']
  completedBy?: string | null
  notes?: string | null
}) {
  const done = params.status === 'completed'
  const { data, error } = await supabase
    .from('onboarding_tasks')
    .update({
      status: params.status,
      notes: params.notes ?? undefined,
      completed_by: done ? params.completedBy ?? null : null,
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq('id', params.id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function addTask(payload: Partial<OnboardingTask>) {
  const { data, error } = await supabase.from('onboarding_tasks').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from('onboarding_tasks').delete().eq('id', id)
  if (error) throw error
}

/** Onboarding tasks waiting on the signed-in person. */
export async function getMyOnboardingTasks(employeeId: string) {
  const { data, error } = await supabase
    .from('onboarding_tasks')
    .select('*, onboarding:employee_onboarding(id, joining_date, employee:employees!employee_onboarding_employee_id_fkey(id, first_name, last_name))')
    .eq('assigned_to', employeeId)
    .in('status', ['pending', 'in_progress'])
    .order('due_date')
  if (error) throw error
  return data
}

// ── Journeys ────────────────────────────────────────────────────────────────

export async function updateJourney(
  id: string,
  updates: {
    status?: 'pending' | 'completed' | 'skipped'
    manager_notes?: string | null
    employee_notes?: string | null
    survey_id?: string | null
    completed_by?: string | null
  }
) {
  const done = updates.status === 'completed'
  const { data, error } = await supabase
    .from('onboarding_journeys')
    .update({
      ...updates,
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Probation (F26) ─────────────────────────────────────────────────────────

/**
 * Employees whose probation ends within the given window and who have not been
 * confirmed yet.
 *
 * Note: probation_end_date and confirmation_date sit on `employees`. There is a
 * separate probation_applicable flag on leave_policy_details — that governs
 * leave accrual during probation and is unrelated to confirmation.
 */
export async function getProbationDue(orgId: string, withinDays = 30) {
  const today = new Date()
  const until = new Date()
  until.setDate(until.getDate() + withinDays)

  const { data, error } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email, employee_code, date_of_joining, probation_end_date, confirmation_date, status, department:departments!department_id(id, name), designation:designations!designation_id(id, title)')
    .eq('organization_id', orgId)
    .eq('status', 'active')
    .is('confirmation_date', null)
    .not('probation_end_date', 'is', null)
    .lte('probation_end_date', until.toISOString().split('T')[0])
    .order('probation_end_date')
  if (error) throw error

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>
    const end = r.probation_end_date as string
    const daysLeft = Math.round((new Date(end).getTime() - today.getTime()) / 86400000)
    return { ...r, days_left: daysLeft, is_overdue: daysLeft < 0 }
  })
}

/** Confirm an employee at the end of probation. */
export async function confirmEmployee(params: {
  employeeId: string
  confirmationDate: string
}) {
  const { data, error } = await supabase
    .from('employees')
    .update({ confirmation_date: params.confirmationDate })
    .eq('id', params.employeeId)
    .select()
    .single()
  if (error) throw error
  return data
}

import { supabase } from '@/lib/supabase'
import type { Workflow, Employee, WorkflowRunStatus } from '@/types/database.types'
import { executeWorkflowActions } from './execute-workflow'
import { logWorkflowRun } from '../api/workflows.api'

// ============================================================================
// MAIN: Evaluate and run all workflows on dashboard load
// ============================================================================

export async function evaluateAndRunWorkflows(orgId: string): Promise<void> {
  // Fetch all enabled workflows for this org
  const { data: workflows, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_enabled', true)
  if (error || !workflows || workflows.length === 0) return

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD

  for (const workflow of workflows as Workflow[]) {
    try {
      // Check if already run today (dedup)
      const alreadyRan = await hasRunToday(workflow.id, todayStr)
      if (alreadyRan) continue

      const matchedEmployees = await getMatchedEmployees(workflow, orgId, today)
      if (matchedEmployees.length === 0) continue

      // Execute the workflow
      await executeWorkflowActions(workflow, matchedEmployees, orgId)

      // Log success
      await logWorkflowRun({
        workflow_id: workflow.id,
        organization_id: orgId,
        status: 'success' as WorkflowRunStatus,
        affected_employee_ids: matchedEmployees.map((e) => e.id),
        result_summary: `Executed for ${matchedEmployees.length} employee(s)`,
        error_message: null,
      })
    } catch (err) {
      // Log failure
      await logWorkflowRun({
        workflow_id: workflow.id,
        organization_id: orgId,
        status: 'failed' as WorkflowRunStatus,
        affected_employee_ids: [],
        result_summary: null,
        error_message: err instanceof Error ? err.message : 'Unknown error',
      }).catch(() => {
        // Silently ignore logging errors to avoid cascading failures
      })
    }
  }
}

// ============================================================================
// CHECK IF WORKFLOW HAS ALREADY RUN TODAY
// ============================================================================

async function hasRunToday(workflowId: string, todayStr: string): Promise<boolean> {
  const startOfDay = `${todayStr}T00:00:00.000Z`
  const endOfDay = `${todayStr}T23:59:59.999Z`

  const { count, error } = await supabase
    .from('workflow_runs')
    .select('*', { count: 'exact', head: true })
    .eq('workflow_id', workflowId)
    .gte('triggered_at', startOfDay)
    .lte('triggered_at', endOfDay)
    .eq('status', 'success')

  if (error) return false
  return (count ?? 0) > 0
}

// ============================================================================
// GET MATCHED EMPLOYEES FOR A WORKFLOW
// ============================================================================

async function getMatchedEmployees(
  workflow: Workflow,
  orgId: string,
  today: Date
): Promise<Employee[]> {
  if (workflow.trigger_type === 'event') {
    return getEventMatchedEmployees(workflow, orgId, today)
  }

  if (workflow.trigger_type === 'time') {
    return getTimeMatchedEmployees(workflow, orgId, today)
  }

  return []
}

// ── Event-based trigger matching ─────────────────────────────────────────────

async function getEventMatchedEmployees(
  workflow: Workflow,
  orgId: string,
  today: Date
): Promise<Employee[]> {
  const event = workflow.trigger_config.event
  const month = today.getMonth() + 1 // 1-based
  const day = today.getDate()
  const daysOffset = workflow.trigger_config.days_offset ?? 0

  // Calculate the target date (offset applied)
  const targetDate = new Date(today)
  targetDate.setDate(targetDate.getDate() + daysOffset)
  const targetMonth = targetDate.getMonth() + 1
  const targetDay = targetDate.getDate()

  let query = supabase
    .from('employees')
    .select('*')
    .eq('organization_id', orgId)
    .eq('status', 'active')

  switch (event) {
    case 'employee_birthday': {
      // Match employees whose date_of_birth month and day match today
      const { data, error } = await query
      if (error || !data) return []
      return (data as Employee[]).filter((emp) => {
        if (!emp.date_of_birth) return false
        const dob = new Date(emp.date_of_birth)
        return dob.getMonth() + 1 === month && dob.getDate() === day
      })
    }

    case 'employee_work_anniversary': {
      // Match employees whose date_of_joining month and day match today (but not joined this year)
      const { data, error } = await query
      if (error || !data) return []
      return (data as Employee[]).filter((emp) => {
        if (!emp.date_of_joining) return false
        const doj = new Date(emp.date_of_joining)
        return (
          doj.getMonth() + 1 === month &&
          doj.getDate() === day &&
          doj.getFullYear() < today.getFullYear()
        )
      })
    }

    case 'employee_probation_completed': {
      // Match employees whose probation_end_date matches target date (with offset)
      const targetStr = `${targetDate.getFullYear()}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`
      const { data, error } = await query.eq('probation_end_date', targetStr)
      if (error || !data) return []
      return data as Employee[]
    }

    case 'employee_joined': {
      // Match employees who joined today
      const todayStr = `${today.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const { data, error } = await query.eq('date_of_joining', todayStr)
      if (error || !data) return []
      return data as Employee[]
    }

    default:
      // For inline events (department_changed, designation_changed, etc.)
      // these are handled via checkEventWorkflows, not the daily cron
      return []
  }
}

// ── Time-based trigger matching ──────────────────────────────────────────────

async function getTimeMatchedEmployees(
  workflow: Workflow,
  orgId: string,
  today: Date
): Promise<Employee[]> {
  const config = workflow.trigger_config
  const dayOfWeek = today.getDay()
  const dayOfMonth = today.getDate()

  let shouldRun = false

  switch (config.frequency) {
    case 'daily':
      shouldRun = true
      break

    case 'weekly':
      shouldRun = config.day_of_week === dayOfWeek
      break

    case 'monthly':
      shouldRun = config.day_of_month === dayOfMonth
      break
  }

  if (!shouldRun) return []

  // Time-based workflows typically don't target specific employees
  // Return a synthetic "trigger" employee to drive the action
  // For notifications that go to specific_roles or all_org, the employee context
  // isn't needed. We return a minimal placeholder.
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('organization_id', orgId)
    .eq('status', 'active')
    .limit(1)

  if (error || !data || data.length === 0) return []
  return data as Employee[]
}

// ============================================================================
// INLINE EVENT TRIGGER (called when a specific event happens)
// ============================================================================

export async function checkEventWorkflows(
  orgId: string,
  eventKey: string,
  employeeId: string
): Promise<void> {
  // Fetch enabled workflows matching this event
  const { data: workflows, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_enabled', true)
    .eq('trigger_type', 'event')

  if (error || !workflows || workflows.length === 0) return

  // Filter for workflows matching this specific event
  const matchingWorkflows = (workflows as Workflow[]).filter(
    (w) => w.trigger_config.event === eventKey
  )

  if (matchingWorkflows.length === 0) return

  // Fetch the employee
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .single()

  if (empError || !employee) return

  for (const workflow of matchingWorkflows) {
    try {
      await executeWorkflowActions(workflow, [employee as Employee], orgId)

      await logWorkflowRun({
        workflow_id: workflow.id,
        organization_id: orgId,
        status: 'success' as WorkflowRunStatus,
        affected_employee_ids: [employeeId],
        result_summary: `Event "${eventKey}" triggered for employee ${employeeId}`,
        error_message: null,
      })
    } catch (err) {
      await logWorkflowRun({
        workflow_id: workflow.id,
        organization_id: orgId,
        status: 'failed' as WorkflowRunStatus,
        affected_employee_ids: [employeeId],
        result_summary: null,
        error_message: err instanceof Error ? err.message : 'Unknown error',
      }).catch(() => {})
    }
  }
}

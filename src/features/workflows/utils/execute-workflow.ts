import { supabase } from '@/lib/supabase'
import type { Workflow, WorkflowAction, Employee } from '@/types/database.types'
import {
  createBulkNotifications,
  getProfileIdsByRole,
} from '@/features/resignation/api/notifications.api'
import { sendEmail } from '@/lib/send-email'

// ============================================================================
// EXECUTE WORKFLOW ACTIONS
// ============================================================================

export async function executeWorkflowActions(
  workflow: Workflow,
  matchedEmployees: Employee[],
  orgId: string
): Promise<void> {
  for (const action of workflow.actions) {
    for (const employee of matchedEmployees) {
      await executeAction(action, employee, orgId)
    }
  }
}

async function executeAction(
  action: WorkflowAction,
  employee: Employee,
  orgId: string
): Promise<void> {
  // Fetch organization name for placeholder resolution
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single()

  const orgName = org?.name ?? ''

  // Fetch department name
  let departmentName = ''
  if (employee.department_id) {
    const { data: dept } = await supabase
      .from('departments')
      .select('name')
      .eq('id', employee.department_id)
      .single()
    departmentName = dept?.name ?? ''
  }

  // Fetch designation name
  let designationName = ''
  if (employee.designation_id) {
    const { data: desig } = await supabase
      .from('designations')
      .select('title')
      .eq('id', employee.designation_id)
      .single()
    designationName = desig?.title ?? ''
  }

  const placeholderContext = {
    employee_name: `${employee.first_name} ${employee.last_name}`,
    first_name: employee.first_name,
    last_name: employee.last_name,
    email: employee.email,
    department: departmentName,
    designation: designationName,
    organization_name: orgName,
    employee_code: employee.employee_code ?? '',
  }

  // Resolve recipient profile IDs
  const recipientProfileIds = await resolveRecipients(
    action.config.recipients,
    employee,
    orgId,
    action.config.specific_roles
  )

  if (action.type === 'send_notification') {
    const title = resolveWorkflowPlaceholders(action.config.title, placeholderContext)
    const message = resolveWorkflowPlaceholders(action.config.message, placeholderContext)

    const notifications = recipientProfileIds.map((profileId) => ({
      recipient_profile_id: profileId,
      organization_id: orgId,
      type: 'workflow' as const,
      title,
      message,
      reference_id: null,
      reference_type: 'workflow',
    }))

    if (notifications.length > 0) {
      await createBulkNotifications(notifications)
    }
  }

  if (action.type === 'send_email') {
    const subject = resolveWorkflowPlaceholders(
      action.config.subject ?? action.config.title,
      placeholderContext
    )
    const body = resolveWorkflowPlaceholders(
      action.config.body ?? action.config.message,
      placeholderContext
    )

    // Fetch emails for recipient profile IDs
    const { data: profiles } = await supabase
      .from('profiles')
      .select('email')
      .in('id', recipientProfileIds)

    const emails = (profiles ?? []).map((p) => p.email).filter(Boolean) as string[]

    if (emails.length > 0) {
      await sendEmail({
        to: emails,
        subject,
        html: body,
      })
    }

    // Also send in-app notification if configured
    if (action.config.include_notification) {
      const title = resolveWorkflowPlaceholders(action.config.title, placeholderContext)
      const message = resolveWorkflowPlaceholders(action.config.message, placeholderContext)

      const notifications = recipientProfileIds.map((profileId) => ({
        recipient_profile_id: profileId,
        organization_id: orgId,
        type: 'workflow' as const,
        title,
        message,
        reference_id: null,
        reference_type: 'workflow',
      }))

      if (notifications.length > 0) {
        await createBulkNotifications(notifications)
      }
    }
  }
}

// ============================================================================
// RESOLVE RECIPIENTS
// ============================================================================

async function resolveRecipients(
  recipientType: string,
  employee: Employee,
  orgId: string,
  specificRoles?: string[]
): Promise<string[]> {
  switch (recipientType) {
    case 'employee': {
      return employee.profile_id ? [employee.profile_id] : []
    }

    case 'manager': {
      if (!employee.reporting_manager_id) return []
      const { data: manager } = await supabase
        .from('employees')
        .select('profile_id')
        .eq('id', employee.reporting_manager_id)
        .single()
      return manager?.profile_id ? [manager.profile_id] : []
    }

    case 'hr_admins': {
      return getProfileIdsByRole(orgId, ['hr_admin', 'admin'])
    }

    case 'all_org': {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('organization_id', orgId)
        .eq('is_active', true)
      return (profiles ?? []).map((p) => p.id)
    }

    case 'specific_roles': {
      if (!specificRoles || specificRoles.length === 0) return []
      return getProfileIdsByRole(orgId, specificRoles)
    }

    default:
      return []
  }
}

// ============================================================================
// PLACEHOLDER RESOLUTION
// ============================================================================

export function resolveWorkflowPlaceholders(
  template: string,
  context: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return context[key] ?? ''
  })
}

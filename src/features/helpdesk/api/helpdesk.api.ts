import { supabase } from '@/lib/supabase'

export type TicketStatus =
  | 'open' | 'in_progress' | 'waiting_on_employee' | 'resolved' | 'closed' | 'cancelled'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export const TICKET_STATUSES: { value: TicketStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'waiting_on_employee', label: 'Waiting on employee' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const TICKET_PRIORITIES: { value: TicketPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export interface HelpdeskCategory {
  id: string
  organization_id: string
  name: string
  description: string | null
  default_assignee_id: string | null
  response_sla_hours: number | null
  resolution_sla_hours: number | null
  is_active: boolean
}

export interface HelpdeskTicket {
  id: string
  organization_id: string
  ticket_number: string
  category_id: string | null
  raised_by: string
  assigned_to: string | null
  subject: string
  description: string | null
  priority: TicketPriority
  status: TicketStatus
  response_due_at: string | null
  resolution_due_at: string | null
  first_responded_at: string | null
  resolved_at: string | null
  escalated: boolean
  resolution_notes: string | null
  satisfaction_rating: number | null
  created_at: string
  category?: { id: string; name: string } | null
  raiser?: { id: string; first_name: string; last_name: string } | null
  assignee?: { id: string; first_name: string; last_name: string } | null
}

const TICKET_SELECT =
  '*, category:helpdesk_categories(id, name),' +
  ' raiser:employees!helpdesk_tickets_raised_by_fkey(id, first_name, last_name),' +
  ' assignee:employees!helpdesk_tickets_assigned_to_fkey(id, first_name, last_name)'

/** A ticket is overdue when its resolution deadline has passed and it is still open. */
export function isOverdue(t: HelpdeskTicket): boolean {
  if (!t.resolution_due_at) return false
  if (['resolved', 'closed', 'cancelled'].includes(t.status)) return false
  return new Date(t.resolution_due_at) < new Date()
}

export async function getCategories(orgId: string) {
  const { data, error } = await supabase
    .from('helpdesk_categories')
    .select('*')
    .eq('organization_id', orgId)
    .order('sort_order')
  if (error) throw error
  return data as HelpdeskCategory[]
}

export async function createCategory(payload: Partial<HelpdeskCategory>) {
  const { data, error } = await supabase
    .from('helpdesk_categories').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function getTickets(orgId: string) {
  const { data, error } = await supabase
    .from('helpdesk_tickets')
    .select(TICKET_SELECT)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as unknown as HelpdeskTicket[]
}

/** Next number in the HD-0001 series. */
async function nextTicketNumber(orgId: string): Promise<string> {
  const { data } = await supabase
    .from('helpdesk_tickets')
    .select('ticket_number')
    .eq('organization_id', orgId)
    .ilike('ticket_number', 'HD-%')
    .order('ticket_number', { ascending: false })
    .limit(1)
  let next = 1
  const code = data?.[0]?.ticket_number
  if (code) {
    const m = code.match(/HD-(\d+)/)
    if (m) next = parseInt(m[1], 10) + 1
  }
  return `HD-${String(next).padStart(4, '0')}`
}

export async function raiseTicket(params: {
  orgId: string
  raisedBy: string
  categoryId: string | null
  subject: string
  description: string | null
  priority: TicketPriority
}) {
  // SLA deadlines are stamped now from the category, so editing the category
  // later does not silently move an existing ticket's deadline.
  let responseDue: string | null = null
  let resolutionDue: string | null = null
  let assignee: string | null = null

  if (params.categoryId) {
    const { data: cat } = await supabase
      .from('helpdesk_categories')
      .select('response_sla_hours, resolution_sla_hours, default_assignee_id')
      .eq('id', params.categoryId)
      .maybeSingle()
    if (cat) {
      const now = Date.now()
      if (cat.response_sla_hours)
        responseDue = new Date(now + cat.response_sla_hours * 3600_000).toISOString()
      if (cat.resolution_sla_hours)
        resolutionDue = new Date(now + cat.resolution_sla_hours * 3600_000).toISOString()
      assignee = cat.default_assignee_id ?? null
    }
  }

  const { data, error } = await supabase
    .from('helpdesk_tickets')
    .insert({
      organization_id: params.orgId,
      ticket_number: await nextTicketNumber(params.orgId),
      category_id: params.categoryId,
      raised_by: params.raisedBy,
      assigned_to: assignee,
      subject: params.subject,
      description: params.description,
      priority: params.priority,
      status: 'open',
      response_due_at: responseDue,
      resolution_due_at: resolutionDue,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTicket(id: string, updates: Partial<HelpdeskTicket>) {
  const body: Record<string, unknown> = { ...updates }
  if (updates.status === 'resolved') body.resolved_at = new Date().toISOString()
  if (updates.status === 'closed') body.closed_at = new Date().toISOString()
  const { data, error } = await supabase
    .from('helpdesk_tickets').update(body).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function escalateTicket(params: { id: string; to: string }) {
  const { data, error } = await supabase
    .from('helpdesk_tickets')
    .update({
      escalated: true,
      escalated_at: new Date().toISOString(),
      escalated_to: params.to,
    })
    .eq('id', params.id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getComments(ticketId: string) {
  const { data, error } = await supabase
    .from('helpdesk_comments')
    .select('*, author:employees!helpdesk_comments_author_id_fkey(id, first_name, last_name)')
    .eq('ticket_id', ticketId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function addComment(payload: {
  organization_id: string
  ticket_id: string
  author_id: string
  body: string
  is_internal: boolean
}) {
  const { data, error } = await supabase
    .from('helpdesk_comments').insert(payload).select().single()
  if (error) throw error

  // First reply from someone other than the raiser stops the response clock
  const { data: ticket } = await supabase
    .from('helpdesk_tickets')
    .select('raised_by, first_responded_at')
    .eq('id', payload.ticket_id)
    .maybeSingle()
  if (ticket && !ticket.first_responded_at && ticket.raised_by !== payload.author_id) {
    await supabase
      .from('helpdesk_tickets')
      .update({ first_responded_at: new Date().toISOString() })
      .eq('id', payload.ticket_id)
  }
  return data
}

/** Shapes the mentorship screens read. The tables are defined in migration 00057. */

export interface MentorshipPerson {
  id: string
  first_name: string
  last_name: string
  employee_code?: string | null
  designation?: { title?: string } | { title?: string }[] | null
  department?: { name?: string } | { name?: string }[] | null
}

export type MentorshipHealth = 'on_track' | 'needs_attention' | 'stalled'
export type CheckinFrequency = 'fortnightly' | 'monthly' | 'quarterly'

export interface MentorProfileRow {
  employee_id: string
  organization_id: string
  is_accepting: boolean
  headline: string | null
  about: string | null
  focus_areas: string[]
  max_mentees: number
  employee?: MentorshipPerson | MentorshipPerson[] | null
  /** Worked out when the directory is read, not stored. */
  active_mentees?: number
  slots_left?: number
}

export interface MentorshipRequestRow {
  id: string
  organization_id: string
  mentee_id: string
  mentor_id: string
  message: string | null
  goal_summary: string | null
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn'
  decline_reason: string | null
  decided_at: string | null
  created_at: string
  mentee?: MentorshipPerson | MentorshipPerson[] | null
  mentor?: MentorshipPerson | MentorshipPerson[] | null
}

export interface MentorshipRow {
  id: string
  organization_id: string
  mentee_id: string
  mentor_id: string
  status: 'active' | 'completed' | 'ended'
  objective: string | null
  checkin_frequency: CheckinFrequency
  started_on: string
  next_checkin_on: string | null
  last_checkin_on: string | null
  last_health: MentorshipHealth | null
  checkin_count: number
  ended_on: string | null
  end_reason: string | null
  mentee?: MentorshipPerson | MentorshipPerson[] | null
  mentor?: MentorshipPerson | MentorshipPerson[] | null
}

export interface MentorshipGoalRow {
  id: string
  mentorship_id: string
  title: string
  detail: string | null
  target_date: string | null
  status: 'open' | 'achieved' | 'dropped'
  created_by: string | null
  created_at: string
}

export interface MentorshipCheckinRow {
  id: string
  mentorship_id: string
  logged_by: string | null
  checkin_date: string
  health: MentorshipHealth
  notes: string | null
  logged_by_employee?: MentorshipPerson | MentorshipPerson[] | null
}

export const HEALTH_LABELS: Record<MentorshipHealth, string> = {
  on_track: 'On track',
  needs_attention: 'Needs attention',
  stalled: 'Stalled',
}

export const FREQUENCY_LABELS: Record<CheckinFrequency, string> = {
  fortnightly: 'Every two weeks',
  monthly: 'Every month',
  quarterly: 'Every three months',
}

/** Is this mentorship past the date the pair agreed to meet again? */
export function isOverdue(m: MentorshipRow): boolean {
  if (m.status !== 'active' || !m.next_checkin_on) return false
  return m.next_checkin_on < new Date().toISOString().slice(0, 10)
}

export function personName(p: MentorshipPerson | null | undefined): string {
  return p ? `${p.first_name} ${p.last_name}` : 'Someone'
}

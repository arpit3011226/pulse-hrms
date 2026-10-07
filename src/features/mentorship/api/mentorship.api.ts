import { supabase } from '@/lib/supabase'
import { createBulkNotifications } from '@/features/resignation/api/notifications.api'

/**
 * The mentorship programme.
 *
 * The rules — three mentees to a mentor, one mentor to a mentee, no asking your
 * own reporting manager — are enforced by triggers in the database, not here.
 * These calls surface the messages those triggers raise, because they are
 * written for the person reading them.
 */

const PAIR_SELECT =
  '*, mentee:employees!mentorships_mentee_id_fkey(id, first_name, last_name, employee_code, designation:designations(title), department:departments(name)), mentor:employees!mentorships_mentor_id_fkey(id, first_name, last_name, employee_code, designation:designations(title), department:departments(name))'

const REQUEST_SELECT =
  '*, mentee:employees!mentorship_requests_mentee_id_fkey(id, first_name, last_name, employee_code, designation:designations(title), department:departments(name)), mentor:employees!mentorship_requests_mentor_id_fkey(id, first_name, last_name, employee_code)'

// ── Mentor profiles ─────────────────────────────────────────────────────────

/** Everyone who has offered to mentor, with how many mentees they are carrying. */
export async function getMentorDirectory(orgId: string) {
  const { data, error } = await supabase
    .from('mentor_profiles')
    .select('*, employee:employees(id, first_name, last_name, employee_code, designation:designations(title), department:departments(name))')
    .eq('organization_id', orgId)
  if (error) throw error

  // How full each mentor is. Read from the mentorships table rather than kept
  // as a counter, so it cannot drift out of step with reality.
  const { data: counts, error: countErr } = await supabase
    .from('mentorships')
    .select('mentor_id')
    .eq('organization_id', orgId)
    .eq('status', 'active')
  if (countErr) throw countErr

  const carrying = new Map<string, number>()
  for (const row of counts ?? []) {
    const id = (row as { mentor_id: string }).mentor_id
    carrying.set(id, (carrying.get(id) ?? 0) + 1)
  }

  return (data ?? []).map((m) => {
    const profile = m as typeof m & { employee_id: string; max_mentees: number }
    const taken = carrying.get(profile.employee_id) ?? 0
    return { ...m, active_mentees: taken, slots_left: Math.max(0, profile.max_mentees - taken) }
  })
}

export async function getMyMentorProfile(employeeId: string) {
  const { data, error } = await supabase
    .from('mentor_profiles')
    .select('*')
    .eq('employee_id', employeeId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertMentorProfile(payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('mentor_profiles')
    .upsert(payload, { onConflict: 'employee_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function leaveMentorPool(employeeId: string) {
  const { error } = await supabase.from('mentor_profiles').delete().eq('employee_id', employeeId)
  if (error) throw error
}

// ── Requests ────────────────────────────────────────────────────────────────

export async function getMentorshipRequests(orgId: string) {
  const { data, error } = await supabase
    .from('mentorship_requests')
    .select(REQUEST_SELECT)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function requestMentor(payload: {
  organization_id: string
  mentee_id: string
  mentor_id: string
  message: string
  goal_summary: string
}) {
  const { data, error } = await supabase
    .from('mentorship_requests')
    .insert(payload)
    .select('id')
    .single()
  if (error) throw error

  await notifyEmployee(
    payload.organization_id,
    payload.mentor_id,
    'A mentoring request',
    'Someone has asked you to be their mentor. Open Mentorship to accept or decline.',
    data.id
  )
  return data
}

/** Accepting and starting the mentorship happen together, in the database. */
export async function acceptMentorshipRequest(params: {
  request_id: string
  objective: string
  frequency: string
  organization_id: string
  mentee_id: string
}) {
  const { data, error } = await supabase.rpc('accept_mentorship_request', {
    p_request_id: params.request_id,
    p_objective: params.objective,
    p_frequency: params.frequency,
  })
  if (error) throw error

  await notifyEmployee(
    params.organization_id,
    params.mentee_id,
    'Your mentoring request was accepted',
    'You have a mentor. Open Mentorship to see what you agreed and when you next meet.',
    data as string
  )
  return data as string
}

export async function declineMentorshipRequest(params: {
  request_id: string
  reason: string
  organization_id: string
  mentee_id: string
}) {
  const { error } = await supabase
    .from('mentorship_requests')
    .update({
      status: 'declined',
      decline_reason: params.reason,
      decided_at: new Date().toISOString(),
    })
    .eq('id', params.request_id)
  if (error) throw error

  await notifyEmployee(
    params.organization_id,
    params.mentee_id,
    'Your mentoring request was declined',
    'They have given a reason. You are free to ask someone else.',
    params.request_id
  )
}

export async function withdrawMentorshipRequest(id: string) {
  const { error } = await supabase
    .from('mentorship_requests')
    .update({ status: 'withdrawn', decided_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ── Mentorships ─────────────────────────────────────────────────────────────

export async function getMentorships(orgId: string) {
  const { data, error } = await supabase
    .from('mentorships')
    .select(PAIR_SELECT)
    .eq('organization_id', orgId)
    .order('started_on', { ascending: false })
  if (error) throw error
  return data
}

export async function updateMentorship(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('mentorships')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function endMentorship(params: {
  id: string
  status: 'completed' | 'ended'
  reason: string
  organization_id: string
  /** The other person, who should be told it has finished. */
  notify_employee_id: string
}) {
  const { error } = await supabase
    .from('mentorships')
    .update({
      status: params.status,
      end_reason: params.reason,
      ended_on: new Date().toISOString().slice(0, 10),
    })
    .eq('id', params.id)
  if (error) throw error

  await notifyEmployee(
    params.organization_id,
    params.notify_employee_id,
    params.status === 'completed' ? 'A mentorship was completed' : 'A mentorship was ended',
    'Open Mentorship to see the note that was left.',
    params.id
  )
}

// ── Goals ───────────────────────────────────────────────────────────────────

export async function getMentorshipGoals(mentorshipId: string) {
  const { data, error } = await supabase
    .from('mentorship_goals')
    .select('*')
    .eq('mentorship_id', mentorshipId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function addMentorshipGoal(payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('mentorship_goals')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMentorshipGoal(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('mentorship_goals')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMentorshipGoal(id: string) {
  const { error } = await supabase.from('mentorship_goals').delete().eq('id', id)
  if (error) throw error
}

// ── Check-ins ───────────────────────────────────────────────────────────────

/**
 * Only the two people in the mentorship can read these. For anybody else the
 * query comes back empty — that is row-level security doing its job, not a
 * fault, so the screen says so rather than showing an error.
 */
export async function getMentorshipCheckins(mentorshipId: string) {
  const { data, error } = await supabase
    .from('mentorship_checkins')
    .select('*, logged_by_employee:employees(id, first_name, last_name)')
    .eq('mentorship_id', mentorshipId)
    .order('checkin_date', { ascending: false })
  if (error) throw error
  return data
}

export async function logMentorshipCheckin(payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('mentorship_checkins')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Telling people ──────────────────────────────────────────────────────────

/** Notifications go to a profile, and an employee may not have a login yet. */
async function notifyEmployee(
  orgId: string,
  employeeId: string,
  title: string,
  message: string,
  referenceId: string
) {
  const { data: employee } = await supabase
    .from('employees')
    .select('profile_id')
    .eq('id', employeeId)
    .maybeSingle()
  if (!employee?.profile_id) return

  await createBulkNotifications([
    {
      organization_id: orgId,
      recipient_profile_id: employee.profile_id,
      type: 'general' as const,
      title,
      message,
      reference_id: referenceId,
      reference_type: 'mentorship',
    },
  ])
}

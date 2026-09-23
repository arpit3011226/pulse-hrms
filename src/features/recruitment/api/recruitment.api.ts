import { supabase } from '@/lib/supabase'
import type {
  InterviewStage,
  JobRequisition,
  Candidate,
  CandidateApplication,
  CandidateStageHistory,
  Interview,
  InterviewFeedback,
  OfferLetter,
  CandidateConversionRecord,
} from '@/types/database.types'

// ============================================
// Interview Stages (Pipeline Config)
// ============================================

export async function getInterviewStages(orgId: string) {
  const { data, error } = await supabase
    .from('interview_stages')
    .select('*')
    .eq('organization_id', orgId)
    .order('stage_order')
  if (error) throw error
  return data
}

export async function createInterviewStage(data: Partial<InterviewStage>) {
  const { data: newData, error } = await supabase
    .from('interview_stages')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return newData
}

export async function updateInterviewStage(id: string, updates: Partial<InterviewStage>) {
  const { data, error } = await supabase
    .from('interview_stages')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteInterviewStage(id: string) {
  const { error } = await supabase
    .from('interview_stages')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw error
}

// ============================================
// Job Requisitions
// ============================================

export async function getJobRequisitions(orgId: string) {
  const { data, error } = await supabase
    .from('job_requisitions')
    .select('*, department:departments(id, name), hiring_manager:employees!job_requisitions_hiring_manager_id_fkey(id, first_name, last_name)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createJobRequisition(data: Partial<JobRequisition>) {
  const { data: newData, error } = await supabase
    .from('job_requisitions')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return newData
}

export async function updateJobRequisition(id: string, updates: Partial<JobRequisition>) {
  const { data, error } = await supabase
    .from('job_requisitions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateJobRequisitionStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from('job_requisitions')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteJobRequisition(id: string) {
  const { error } = await supabase
    .from('job_requisitions')
    .delete()
    .eq('id', id)
    .eq('status', 'draft')
  if (error) throw error
}

// ============================================
// Candidates
// ============================================

export async function getCandidates(orgId: string) {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createCandidate(data: Partial<Candidate>) {
  const { data: newData, error } = await supabase
    .from('candidates')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return newData
}

export async function updateCandidate(id: string, updates: Partial<Candidate>) {
  const { data, error } = await supabase
    .from('candidates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCandidate(id: string) {
  const { error } = await supabase
    .from('candidates')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ============================================
// Candidate Applications
// ============================================

export async function getCandidateApplications(orgId: string, requisitionId?: string) {
  let query = supabase
    .from('candidate_applications')
    .select('*, candidate:candidates(id, first_name, last_name, email, phone, experience_years, source), job_requisition:job_requisitions(id, title, requisition_code), current_stage:interview_stages(id, stage_name, stage_order)')
    .eq('organization_id', orgId)

  if (requisitionId) query = query.eq('job_requisition_id', requisitionId)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createCandidateApplication(data: Partial<CandidateApplication>) {
  const { data: newData, error } = await supabase
    .from('candidate_applications')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return newData
}

export async function updateCandidateApplicationStatus(id: string, status: string, rejectionReason?: string) {
  const updates: Record<string, unknown> = { status }
  if (rejectionReason) updates.rejection_reason = rejectionReason
  const { data, error } = await supabase
    .from('candidate_applications')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function moveCandidateToStage(
  applicationId: string,
  toStageId: string,
  fromStageId: string | null,
  movedBy: string | null,
  notes?: string
) {
  // Update current_stage_id
  const { error: updateError } = await supabase
    .from('candidate_applications')
    .update({ current_stage_id: toStageId, status: 'in_progress' })
    .eq('id', applicationId)
  if (updateError) throw updateError

  // Insert stage history
  const historyData: Partial<CandidateStageHistory> = {
    candidate_application_id: applicationId,
    from_stage_id: fromStageId,
    to_stage_id: toStageId,
    moved_by: movedBy,
    notes,
  }
  const { error: histError } = await supabase
    .from('candidate_stage_history')
    .insert(historyData)
  if (histError) throw histError
}

export async function getCandidateStageHistory(applicationId: string) {
  const { data, error } = await supabase
    .from('candidate_stage_history')
    .select('*, from_stage:interview_stages!candidate_stage_history_from_stage_id_fkey(id, stage_name), to_stage:interview_stages!candidate_stage_history_to_stage_id_fkey(id, stage_name), mover:employees!candidate_stage_history_moved_by_fkey(id, first_name, last_name)')
    .eq('candidate_application_id', applicationId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ============================================
// Interviews
// ============================================

export async function getInterviews(orgId: string) {
  const { data, error } = await supabase
    .from('interviews')
    .select('*, candidate_application:candidate_applications(id, candidate:candidates(id, first_name, last_name, email), job_requisition:job_requisitions(id, title, requisition_code), current_stage:interview_stages(id, stage_name)), interview_stage:interview_stages(id, stage_name), interviewer:employees!interviews_interviewer_id_fkey(id, first_name, last_name), interview_feedback:interview_feedback(*)')
    .eq('organization_id', orgId)
    .order('scheduled_start', { ascending: false })
  if (error) throw error
  return data
}

export async function createInterview(data: Partial<Interview>) {
  const { data: newData, error } = await supabase
    .from('interviews')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return newData
}

export async function updateInterview(id: string, updates: Partial<Interview>) {
  const { data, error } = await supabase
    .from('interviews')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateInterviewStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from('interviews')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ============================================
// Interview Feedback
// ============================================

export async function submitInterviewFeedback(data: Partial<InterviewFeedback>) {
  const { data: newData, error } = await supabase
    .from('interview_feedback')
    .upsert(data, { onConflict: 'interview_id' })
    .select()
    .single()
  if (error) throw error

  // Mark interview as completed
  if (data.interview_id) {
    const { error: updateError } = await supabase
      .from('interviews')
      .update({ status: 'completed' })
      .eq('id', data.interview_id)
    if (updateError) throw updateError
  }

  return newData
}

// ============================================
// Offer Letters
// ============================================

export async function getOfferLetters(orgId: string) {
  const { data, error } = await supabase
    .from('offer_letters')
    .select('*, candidate_application:candidate_applications(id, candidate:candidates(id, first_name, last_name, email), job_requisition:job_requisitions(id, title, requisition_code))')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createOfferLetter(data: Partial<OfferLetter>) {
  const { data: newData, error } = await supabase
    .from('offer_letters')
    .insert(data)
    .select()
    .single()
  if (error) throw error

  // Update application status to 'offer'
  if (data.candidate_application_id) {
    await supabase
      .from('candidate_applications')
      .update({ status: 'offer' })
      .eq('id', data.candidate_application_id)
  }

  return newData
}

export async function updateOfferLetter(id: string, updates: Partial<OfferLetter>) {
  const { data, error } = await supabase
    .from('offer_letters')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateOfferStatus(id: string, offerStatus: string, applicationId?: string) {
  const { data, error } = await supabase
    .from('offer_letters')
    .update({ offer_status: offerStatus })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  // If accepted, update application status to 'hired'
  if (offerStatus === 'accepted' && applicationId) {
    await supabase
      .from('candidate_applications')
      .update({ status: 'hired' })
      .eq('id', applicationId)
  }

  return data
}

// ============================================
// Candidate Conversion
// ============================================

export async function createCandidateConversion(data: Partial<CandidateConversionRecord>) {
  const { data: newData, error } = await supabase
    .from('candidate_conversion_records')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return newData
}

// ============================================
// F12 — Requisition approval
// ============================================

export async function submitRequisitionForApproval(params: {
  id: string
  approverId: string
  submittedBy: string
  budgetAmount?: number | null
}) {
  const { data, error } = await supabase
    .from('job_requisitions')
    .update({
      approval_status: 'pending',
      approver_id: params.approverId,
      submitted_by: params.submittedBy,
      submitted_at: new Date().toISOString(),
      budget_amount: params.budgetAmount ?? null,
    })
    .eq('id', params.id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function decideRequisition(params: {
  id: string
  decision: 'approved' | 'rejected'
  notes?: string | null
}) {
  const { data, error } = await supabase
    .from('job_requisitions')
    .update({
      approval_status: params.decision,
      approved_at: new Date().toISOString(),
      approval_notes: params.notes ?? null,
      // Approving a requisition is what opens it for applications
      ...(params.decision === 'approved' ? { status: 'open' } : {}),
    })
    .eq('id', params.id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ============================================
// F13 — Offer response and revision
// ============================================

export async function markOfferSent(id: string) {
  const { data, error } = await supabase
    .from('offer_letters')
    .update({ offer_status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function recordOfferResponse(params: {
  id: string
  response: 'accepted' | 'rejected'
  remarks?: string | null
  declineReason?: string | null
}) {
  const { data, error } = await supabase
    .from('offer_letters')
    .update({
      offer_status: params.response,
      responded_at: new Date().toISOString(),
      candidate_remarks: params.remarks ?? null,
      decline_reason: params.response === 'rejected' ? params.declineReason ?? null : null,
    })
    .eq('id', params.id)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Revise an offer: the old one is withdrawn and a new version created that
 * points back at it, so the negotiation history survives.
 */
export async function reviseOffer(params: {
  previous: {
    id: string
    organization_id: string
    candidate_application_id: string
    offered_designation?: string | null
    offered_ctc?: number | null
    joining_date?: string | null
    valid_until?: string | null
    version?: number | null
  }
  offeredCtc: number
  joiningDate: string
  offeredDesignation?: string | null
  validUntil?: string | null
  revisionReason: string
  createdBy?: string | null
}) {
  const { error: withdrawError } = await supabase
    .from('offer_letters')
    .update({ offer_status: 'withdrawn' })
    .eq('id', params.previous.id)
  if (withdrawError) throw withdrawError

  const { data, error } = await supabase
    .from('offer_letters')
    .insert({
      organization_id: params.previous.organization_id,
      candidate_application_id: params.previous.candidate_application_id,
      offered_designation: params.offeredDesignation ?? params.previous.offered_designation,
      offered_ctc: params.offeredCtc,
      joining_date: params.joiningDate,
      valid_until: params.validUntil ?? params.previous.valid_until,
      offer_status: 'draft',
      version: (params.previous.version ?? 1) + 1,
      supersedes_offer_id: params.previous.id,
      revision_reason: params.revisionReason,
      created_by: params.createdBy ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// ============================================
// F15 — Interview competencies and scorecards
// ============================================

export async function getInterviewCompetencies(orgId: string) {
  const { data, error } = await supabase
    .from('interview_competencies')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw error
  return data
}

export async function createInterviewCompetency(payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('interview_competencies')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function addScorecardItems(items: Record<string, unknown>[]) {
  if (items.length === 0) return []
  const { data, error } = await supabase.from('interview_scorecard_items').insert(items).select()
  if (error) throw error
  return data
}

export async function getScorecardForFeedback(feedbackId: string) {
  const { data, error } = await supabase
    .from('interview_scorecard_items')
    .select('*')
    .eq('interview_feedback_id', feedbackId)
  if (error) throw error
  return data
}

// ============================================
// F16 — Talent pool
// ============================================

export async function getTalentPool(orgId: string) {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('organization_id', orgId)
    .eq('in_talent_pool', true)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

export async function updateCandidatePool(params: {
  id: string
  inTalentPool: boolean
  tags?: string[]
  revisitAfter?: string | null
  poolNotes?: string | null
  rejectionReason?: string | null
  rejectionStage?: string | null
}) {
  const { data, error } = await supabase
    .from('candidates')
    .update({
      in_talent_pool: params.inTalentPool,
      tags: params.tags,
      revisit_after: params.revisitAfter ?? null,
      pool_notes: params.poolNotes ?? null,
      rejection_reason: params.rejectionReason ?? null,
      rejection_stage: params.rejectionStage ?? null,
    })
    .eq('id', params.id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ============================================
// F18 — Background verification
// ============================================

export async function getBackgroundChecks(orgId: string) {
  const { data, error } = await supabase
    .from('background_verifications')
    .select('*, candidate:candidates(id, first_name, last_name, email), employee:employees!background_verifications_employee_id_fkey(id, first_name, last_name, employee_code)')
    .eq('organization_id', orgId)
    .order('initiated_on', { ascending: false })
  if (error) throw error
  return data
}

export async function createBackgroundCheck(payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('background_verifications')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateBackgroundCheck(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('background_verifications')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ============================================
// F14 — Reschedule
// ============================================

/**
 * Reschedule an interview. The original is marked rescheduled and a new row is
 * created pointing back at it, so the history of moves survives — three
 * reschedules is itself a signal worth seeing.
 */
export async function rescheduleInterview(params: {
  original: {
    id: string
    organization_id: string
    candidate_application_id: string
    interview_stage_id: string | null
    interviewer_id: string | null
    mode: string
    location_or_link: string | null
  }
  scheduledStart: string
  scheduledEnd: string
  reason: string
}) {
  const { error: updateError } = await supabase
    .from('interviews')
    .update({ status: 'rescheduled', reschedule_reason: params.reason })
    .eq('id', params.original.id)
  if (updateError) throw updateError

  const { data, error } = await supabase
    .from('interviews')
    .insert({
      organization_id: params.original.organization_id,
      candidate_application_id: params.original.candidate_application_id,
      interview_stage_id: params.original.interview_stage_id,
      interviewer_id: params.original.interviewer_id,
      mode: params.original.mode,
      location_or_link: params.original.location_or_link,
      scheduled_start: params.scheduledStart,
      scheduled_end: params.scheduledEnd,
      status: 'scheduled',
      rescheduled_from: params.original.id,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// ============================================
// F17 — Candidate portal
// ============================================

/** Everything the signed-in candidate is allowed to see about themselves. */
export async function getMyCandidateView(profileId: string) {
  const { data: candidate, error: candError } = await supabase
    .from('candidates')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()
  if (candError) throw candError
  if (!candidate) return null

  const { data: applications, error: appError } = await supabase
    .from('candidate_applications')
    .select('*, job_requisition:job_requisitions(id, title, requisition_code, location, employment_type), current_stage:interview_stages(id, stage_name, stage_order)')
    .eq('candidate_id', candidate.id)
    .order('applied_date', { ascending: false })
  if (appError) throw appError

  const appIds = (applications ?? []).map((a) => a.id)

  const [interviewsRes, offersRes] = await Promise.all([
    appIds.length
      ? supabase
          .from('interviews')
          .select('*, interview_stage:interview_stages(id, stage_name)')
          .in('candidate_application_id', appIds)
          .order('scheduled_start')
      : Promise.resolve({ data: [], error: null }),
    appIds.length
      ? supabase
          .from('offer_letters')
          .select('*')
          .in('candidate_application_id', appIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ])
  if (interviewsRes.error) throw interviewsRes.error
  if (offersRes.error) throw offersRes.error

  return {
    candidate,
    applications: applications ?? [],
    interviews: interviewsRes.data ?? [],
    offers: offersRes.data ?? [],
  }
}

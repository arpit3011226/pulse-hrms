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

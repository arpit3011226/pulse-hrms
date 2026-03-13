import { supabase } from '@/lib/supabase'
import type {
  PerformanceCycle,
  ReviewCompetency,
  EmployeeGoal,
  GoalKeyResult,
  GoalCheckin,
  PerformanceReview,
  SelfReview,
  ManagerReview,
  PerformanceImprovementPlan,
} from '@/types/database.types'

// ============================================
// Performance Cycles
// ============================================

export async function getPerformanceCycles(orgId: string) {
  const { data, error } = await supabase
    .from('performance_cycles')
    .select('*')
    .eq('organization_id', orgId)
    .order('start_date', { ascending: false })
  if (error) throw error
  return data
}

export async function getActiveCycle(orgId: string) {
  const { data, error } = await supabase
    .from('performance_cycles')
    .select('*')
    .eq('organization_id', orgId)
    .in('status', ['active', 'goal_setting', 'self_review', 'manager_review', 'calibration'])
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createPerformanceCycle(data: Partial<PerformanceCycle>) {
  const { data: newData, error } = await supabase
    .from('performance_cycles')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return newData
}

export async function updatePerformanceCycle(id: string, updates: Partial<PerformanceCycle>) {
  const { data, error } = await supabase
    .from('performance_cycles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCycleStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from('performance_cycles')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePerformanceCycle(id: string) {
  const { error } = await supabase
    .from('performance_cycles')
    .delete()
    .eq('id', id)
    .eq('status', 'draft')
  if (error) throw error
}

// ============================================
// Review Competencies
// ============================================

export async function getReviewCompetencies(orgId: string) {
  const { data, error } = await supabase
    .from('review_competencies')
    .select('*')
    .eq('organization_id', orgId)
    .order('display_order')
  if (error) throw error
  return data
}

export async function createReviewCompetency(data: Partial<ReviewCompetency>) {
  const { data: newData, error } = await supabase
    .from('review_competencies')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return newData
}

export async function updateReviewCompetency(id: string, updates: Partial<ReviewCompetency>) {
  const { data, error } = await supabase
    .from('review_competencies')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteReviewCompetency(id: string) {
  const { error } = await supabase
    .from('review_competencies')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw error
}

// ============================================
// Employee Goals
// ============================================

export async function getEmployeeGoals(orgId: string, cycleId?: string) {
  let query = supabase
    .from('employee_goals')
    .select('*, employee:employees(id, first_name, last_name, email, employee_code), performance_cycle:performance_cycles(id, cycle_name, cycle_code), goal_key_results(*)')
    .eq('organization_id', orgId)

  if (cycleId) query = query.eq('performance_cycle_id', cycleId)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getMyGoals(employeeId: string, cycleId?: string) {
  let query = supabase
    .from('employee_goals')
    .select('*, employee:employees(id, first_name, last_name, email, employee_code), performance_cycle:performance_cycles(id, cycle_name, cycle_code), goal_key_results(*)')
    .eq('employee_id', employeeId)

  if (cycleId) query = query.eq('performance_cycle_id', cycleId)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createEmployeeGoal(data: Partial<EmployeeGoal>) {
  const { data: newData, error } = await supabase
    .from('employee_goals')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return newData
}

export async function updateEmployeeGoal(id: string, updates: Partial<EmployeeGoal>) {
  const { data, error } = await supabase
    .from('employee_goals')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteEmployeeGoal(id: string) {
  const { error } = await supabase
    .from('employee_goals')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function upsertGoalKeyResults(goalId: string, keyResults: Partial<GoalKeyResult>[]) {
  // Delete existing key results for this goal
  const { error: deleteError } = await supabase
    .from('goal_key_results')
    .delete()
    .eq('employee_goal_id', goalId)
  if (deleteError) throw deleteError

  // Bulk insert new ones
  const { data, error } = await supabase
    .from('goal_key_results')
    .insert(keyResults)
    .select()
  if (error) throw error
  return data
}

export async function getGoalCheckins(goalId: string) {
  const { data, error } = await supabase
    .from('goal_checkins')
    .select('*')
    .eq('employee_goal_id', goalId)
    .order('checkin_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createGoalCheckin(data: Partial<GoalCheckin>) {
  const { data: newData, error } = await supabase
    .from('goal_checkins')
    .insert(data)
    .select()
    .single()
  if (error) throw error

  // Update the parent goal's current_value
  if (data.employee_goal_id && data.progress_value !== undefined) {
    const { error: updateError } = await supabase
      .from('employee_goals')
      .update({ current_value: data.progress_value })
      .eq('id', data.employee_goal_id)
    if (updateError) throw updateError
  }

  return newData
}

// ============================================
// Performance Reviews
// ============================================

const REVIEW_SELECT = '*, employee:employees!performance_reviews_employee_id_fkey(id, first_name, last_name, email, employee_code, department_id, department:departments(id, name)), performance_cycle:performance_cycles(id, cycle_name, cycle_code), self_review:self_reviews(*), manager_review:manager_reviews(*)'

export async function getPerformanceReviews(orgId: string, cycleId?: string) {
  let query = supabase
    .from('performance_reviews')
    .select(REVIEW_SELECT)
    .eq('organization_id', orgId)

  if (cycleId) query = query.eq('performance_cycle_id', cycleId)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getMyReview(employeeId: string, cycleId: string) {
  const { data, error } = await supabase
    .from('performance_reviews')
    .select(REVIEW_SELECT)
    .eq('employee_id', employeeId)
    .eq('performance_cycle_id', cycleId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getTeamReviews(reviewerId: string, cycleId?: string) {
  let query = supabase
    .from('performance_reviews')
    .select(REVIEW_SELECT)
    .eq('reviewer_id', reviewerId)

  if (cycleId) query = query.eq('performance_cycle_id', cycleId)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createPerformanceReview(data: Partial<PerformanceReview>) {
  const { data: newData, error } = await supabase
    .from('performance_reviews')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return newData
}

export async function updatePerformanceReviewStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from('performance_reviews')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function submitSelfReview(data: Partial<SelfReview>) {
  // Upsert self_review (on conflict performance_review_id)
  const { data: newData, error } = await supabase
    .from('self_reviews')
    .upsert(data, { onConflict: 'performance_review_id' })
    .select()
    .single()
  if (error) throw error

  // Update parent performance_review status
  const { error: updateError } = await supabase
    .from('performance_reviews')
    .update({ status: 'self_review_done' })
    .eq('id', data.performance_review_id!)
  if (updateError) throw updateError

  return newData
}

export async function submitManagerReview(data: Partial<ManagerReview>) {
  // Upsert manager_review
  const { data: newData, error } = await supabase
    .from('manager_reviews')
    .upsert(data, { onConflict: 'performance_review_id' })
    .select()
    .single()
  if (error) throw error

  // Update parent performance_review status and overall_rating
  const { error: updateError } = await supabase
    .from('performance_reviews')
    .update({ status: 'manager_review_done', overall_rating: data.rating })
    .eq('id', data.performance_review_id!)
  if (updateError) throw updateError

  return newData
}

export async function finalizeReview(reviewId: string, finalRating: number, ratingLabel: string) {
  const { data, error } = await supabase
    .from('performance_reviews')
    .update({ final_rating: finalRating, rating_label: ratingLabel, status: 'finalized' })
    .eq('id', reviewId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ============================================
// Initiate Cycle Reviews
// ============================================

export async function initiateCycleReviews(cycleId: string, orgId: string) {
  // 1. Get all active employees
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id')
    .eq('organization_id', orgId)
    .eq('status', 'active')
  if (empError) throw empError

  // 2. Get work profiles to find reporting managers
  const { data: workProfiles, error: wpError } = await supabase
    .from('employee_work_profiles')
    .select('employee_id, reporting_manager_id')
    .eq('is_current', true)
    .eq('organization_id', orgId)
  if (wpError) throw wpError

  // Build a map of employee_id -> reporting_manager_id
  const managerMap = new Map<string, string | null>()
  for (const wp of workProfiles || []) {
    managerMap.set(wp.employee_id, wp.reporting_manager_id)
  }

  // 3. Create performance_reviews for each employee
  const reviews: Partial<PerformanceReview>[] = (employees || []).map((emp) => ({
    organization_id: orgId,
    employee_id: emp.id,
    performance_cycle_id: cycleId,
    reviewer_id: managerMap.get(emp.id) || null,
    status: 'self_review_pending',
  }))

  if (reviews.length > 0) {
    const { error: insertError } = await supabase
      .from('performance_reviews')
      .insert(reviews)
    if (insertError) throw insertError
  }

  // 4. Update cycle status to 'self_review'
  const { error: updateError } = await supabase
    .from('performance_cycles')
    .update({ status: 'self_review' })
    .eq('id', cycleId)
  if (updateError) throw updateError

  return reviews.length
}

// ============================================
// Performance Improvement Plans (PIPs)
// ============================================

export async function getPerformanceImprovementPlans(orgId: string) {
  const { data, error } = await supabase
    .from('performance_improvement_plans')
    .select('*, employee:employees!performance_improvement_plans_employee_id_fkey(id, first_name, last_name, email, employee_code)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createPIP(data: Partial<PerformanceImprovementPlan>) {
  const { data: newData, error } = await supabase
    .from('performance_improvement_plans')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return newData
}

export async function updatePIP(id: string, updates: Partial<PerformanceImprovementPlan>) {
  const { data, error } = await supabase
    .from('performance_improvement_plans')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePIPStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from('performance_improvement_plans')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ============================================
// Current Employee Helper
// ============================================

export async function getCurrentEmployee(profileId: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('profile_id', profileId)
    .single()
  if (error) throw error
  return data
}

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
  PeerReview,
  SkipLevelReview,
  ReviewParticipant,
  SkipCriteria,
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

const REVIEW_SELECT = '*, employee:employees!performance_reviews_employee_id_fkey(id, first_name, last_name, email, employee_code, department_id, department:departments(id, name)), performance_cycle:performance_cycles(id, cycle_name, cycle_code), self_review:self_reviews(*), manager_review:manager_reviews(*), peer_reviews(*, peer:employees!peer_reviews_peer_id_fkey(id, first_name, last_name, email, employee_code)), skip_level_review:skip_level_reviews(*, skip_level_manager:employees!skip_level_reviews_skip_level_manager_id_fkey(id, first_name, last_name, email, employee_code)), review_participants(*, reviewer:employees!review_participants_reviewer_id_fkey(id, first_name, last_name, email, employee_code))'

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
  // 1. Get cycle to check skip criteria
  const { data: cycle, error: cycleError } = await supabase
    .from('performance_cycles')
    .select('skip_criteria')
    .eq('id', cycleId)
    .single()
  if (cycleError) throw cycleError

  const skipCriteria = (cycle?.skip_criteria || {}) as SkipCriteria

  // 2. Get all active employees with date_of_joining and employment_type
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, date_of_joining, employment_type')
    .eq('organization_id', orgId)
    .eq('status', 'active')
  if (empError) throw empError

  // 3. Get work profiles to find reporting managers
  const { data: workProfiles, error: wpError } = await supabase
    .from('employee_work_profiles')
    .select('employee_id, reporting_manager_id')
    .eq('is_current', true)
    .eq('organization_id', orgId)
  if (wpError) throw wpError

  const managerMap = new Map<string, string | null>()
  for (const wp of workProfiles || []) {
    managerMap.set(wp.employee_id, wp.reporting_manager_id)
  }

  // 4. Apply skip criteria
  const now = new Date()
  const eligible = (employees || []).filter((emp) => {
    // Skip by tenure
    if (skipCriteria.min_tenure_months && emp.date_of_joining) {
      const joinDate = new Date(emp.date_of_joining)
      const monthsDiff = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth())
      if (monthsDiff < skipCriteria.min_tenure_months) return false
    }
    // Skip by employment type
    if (skipCriteria.exclude_employment_types?.length && emp.employment_type) {
      if (skipCriteria.exclude_employment_types.includes(emp.employment_type)) return false
    }
    return true
  })

  const skippedCount = (employees || []).length - eligible.length

  // 5. Create performance_reviews for eligible employees
  const reviews: Partial<PerformanceReview>[] = eligible.map((emp) => ({
    organization_id: orgId,
    employee_id: emp.id,
    performance_cycle_id: cycleId,
    reviewer_id: managerMap.get(emp.id) || null,
    status: 'self_review_pending',
  }))

  if (reviews.length > 0) {
    const { data: insertedReviews, error: insertError } = await supabase
      .from('performance_reviews')
      .insert(reviews)
      .select('id, employee_id, reviewer_id')
    if (insertError) throw insertError

    // 6. Create review_participants for self + manager
    const participants: Partial<ReviewParticipant>[] = []
    for (const rev of insertedReviews || []) {
      participants.push({
        organization_id: orgId,
        performance_review_id: rev.id,
        reviewer_id: rev.employee_id,
        reviewer_type: 'self',
        status: 'pending',
        is_mandatory: true,
      })
      if (rev.reviewer_id) {
        participants.push({
          organization_id: orgId,
          performance_review_id: rev.id,
          reviewer_id: rev.reviewer_id,
          reviewer_type: 'manager',
          status: 'pending',
          is_mandatory: true,
        })
      }
    }
    if (participants.length > 0) {
      const { error: partError } = await supabase
        .from('review_participants')
        .insert(participants)
      if (partError) throw partError
    }
  }

  // 7. Update cycle status to 'self_review'
  const { error: updateError } = await supabase
    .from('performance_cycles')
    .update({ status: 'self_review' })
    .eq('id', cycleId)
  if (updateError) throw updateError

  return { created: reviews.length, skipped: skippedCount }
}

// ============================================
// Skipped Employees
// ============================================

export async function getSkippedEmployees(cycleId: string, orgId: string) {
  // Get cycle skip criteria
  const { data: cycle, error: cycleError } = await supabase
    .from('performance_cycles')
    .select('skip_criteria')
    .eq('id', cycleId)
    .single()
  if (cycleError) throw cycleError

  const skipCriteria = (cycle?.skip_criteria || {}) as SkipCriteria

  // Get all active employees
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, first_name, last_name, employee_code, date_of_joining, employment_type, department:departments(id, name)')
    .eq('organization_id', orgId)
    .eq('status', 'active')
  if (empError) throw empError

  // Get existing reviews for this cycle
  const { data: existingReviews, error: revError } = await supabase
    .from('performance_reviews')
    .select('employee_id')
    .eq('performance_cycle_id', cycleId)
  if (revError) throw revError

  const reviewedIds = new Set((existingReviews || []).map((r) => r.employee_id))

  const now = new Date()
  const skipped: { employee: typeof employees[0]; reason: string }[] = []

  for (const emp of employees || []) {
    if (reviewedIds.has(emp.id)) continue

    let reason = ''
    if (skipCriteria.min_tenure_months && emp.date_of_joining) {
      const joinDate = new Date(emp.date_of_joining)
      const monthsDiff = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth())
      if (monthsDiff < skipCriteria.min_tenure_months) {
        reason = `Less than ${skipCriteria.min_tenure_months} months tenure`
      }
    }
    if (!reason && skipCriteria.exclude_employment_types?.length && emp.employment_type) {
      if (skipCriteria.exclude_employment_types.includes(emp.employment_type)) {
        reason = `Employment type: ${emp.employment_type}`
      }
    }
    if (reason) {
      skipped.push({ employee: emp, reason })
    }
  }

  return skipped
}

export async function manuallyIncludeEmployee(cycleId: string, employeeId: string, orgId: string) {
  // Get manager from work profile
  const { data: wp } = await supabase
    .from('employee_work_profiles')
    .select('reporting_manager_id')
    .eq('employee_id', employeeId)
    .eq('is_current', true)
    .maybeSingle()

  const { data: review, error } = await supabase
    .from('performance_reviews')
    .insert({
      organization_id: orgId,
      employee_id: employeeId,
      performance_cycle_id: cycleId,
      reviewer_id: wp?.reporting_manager_id || null,
      status: 'self_review_pending',
    })
    .select('id, employee_id, reviewer_id')
    .single()
  if (error) throw error

  // Create review_participants
  const participants: Partial<ReviewParticipant>[] = [
    { organization_id: orgId, performance_review_id: review.id, reviewer_id: employeeId, reviewer_type: 'self', status: 'pending', is_mandatory: true },
  ]
  if (review.reviewer_id) {
    participants.push({ organization_id: orgId, performance_review_id: review.id, reviewer_id: review.reviewer_id, reviewer_type: 'manager', status: 'pending', is_mandatory: true })
  }
  await supabase.from('review_participants').insert(participants)

  return review
}

export async function manuallyExcludeEmployee(reviewId: string) {
  // Delete participants first
  await supabase.from('review_participants').delete().eq('performance_review_id', reviewId)
  await supabase.from('peer_reviews').delete().eq('performance_review_id', reviewId)
  await supabase.from('skip_level_reviews').delete().eq('performance_review_id', reviewId)

  const { error } = await supabase
    .from('performance_reviews')
    .delete()
    .eq('id', reviewId)
    .in('status', ['self_review_pending', 'draft'])
  if (error) throw error
}

// ============================================
// 360 Review: Peer Reviews
// ============================================

export async function getReviewParticipants(reviewId: string) {
  const { data, error } = await supabase
    .from('review_participants')
    .select('*, reviewer:employees!review_participants_reviewer_id_fkey(id, first_name, last_name, email, employee_code)')
    .eq('performance_review_id', reviewId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function addReviewParticipant(data: Partial<ReviewParticipant>) {
  const { data: newData, error } = await supabase
    .from('review_participants')
    .insert(data)
    .select('*, reviewer:employees!review_participants_reviewer_id_fkey(id, first_name, last_name, email, employee_code)')
    .single()
  if (error) throw error

  // Also create the corresponding peer_review or skip_level_review record
  if (data.reviewer_type === 'peer' && data.performance_review_id && data.reviewer_id) {
    await supabase.from('peer_reviews').insert({
      organization_id: data.organization_id,
      performance_review_id: data.performance_review_id,
      peer_id: data.reviewer_id,
      status: 'pending',
    })
  } else if (data.reviewer_type === 'skip_level' && data.performance_review_id && data.reviewer_id) {
    await supabase.from('skip_level_reviews').insert({
      organization_id: data.organization_id,
      performance_review_id: data.performance_review_id,
      skip_level_manager_id: data.reviewer_id,
      status: 'pending',
    })
  }

  return newData
}

export async function removeReviewParticipant(id: string, reviewId: string, reviewerId: string, reviewerType: string) {
  const { error } = await supabase
    .from('review_participants')
    .delete()
    .eq('id', id)
    .eq('status', 'pending')
  if (error) throw error

  // Also remove the corresponding review record
  if (reviewerType === 'peer') {
    await supabase.from('peer_reviews').delete()
      .eq('performance_review_id', reviewId)
      .eq('peer_id', reviewerId)
  } else if (reviewerType === 'skip_level') {
    await supabase.from('skip_level_reviews').delete()
      .eq('performance_review_id', reviewId)
      .eq('skip_level_manager_id', reviewerId)
  }
}

export async function getPeerReviews(reviewId: string) {
  const { data, error } = await supabase
    .from('peer_reviews')
    .select('*, peer:employees!peer_reviews_peer_id_fkey(id, first_name, last_name, email, employee_code)')
    .eq('performance_review_id', reviewId)
  if (error) throw error
  return data
}

export async function submitPeerReview(data: Partial<PeerReview>) {
  const { data: newData, error } = await supabase
    .from('peer_reviews')
    .upsert({ ...data, status: 'submitted', submitted_at: new Date().toISOString() }, { onConflict: 'performance_review_id,peer_id' })
    .select()
    .single()
  if (error) throw error

  // Update participant status
  if (data.performance_review_id && data.peer_id) {
    await supabase
      .from('review_participants')
      .update({ status: 'submitted' })
      .eq('performance_review_id', data.performance_review_id)
      .eq('reviewer_id', data.peer_id)
      .eq('reviewer_type', 'peer')
  }

  return newData
}

export async function getSkipLevelReview(reviewId: string) {
  const { data, error } = await supabase
    .from('skip_level_reviews')
    .select('*, skip_level_manager:employees!skip_level_reviews_skip_level_manager_id_fkey(id, first_name, last_name, email, employee_code)')
    .eq('performance_review_id', reviewId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function submitSkipLevelReview(data: Partial<SkipLevelReview>) {
  const { data: newData, error } = await supabase
    .from('skip_level_reviews')
    .upsert({ ...data, status: 'submitted', submitted_at: new Date().toISOString() }, { onConflict: 'performance_review_id' })
    .select()
    .single()
  if (error) throw error

  // Update participant status
  if (data.performance_review_id && data.skip_level_manager_id) {
    await supabase
      .from('review_participants')
      .update({ status: 'submitted' })
      .eq('performance_review_id', data.performance_review_id)
      .eq('reviewer_id', data.skip_level_manager_id)
      .eq('reviewer_type', 'skip_level')
  }

  return newData
}

// ============================================
// OKR Goals: Organization & Team Goals
// ============================================

export async function getOrganizationGoals(orgId: string, cycleId?: string) {
  let query = supabase
    .from('employee_goals')
    .select('*, employee:employees(id, first_name, last_name, email, employee_code), performance_cycle:performance_cycles(id, cycle_name, cycle_code), goal_key_results(*), creator:employees!employee_goals_created_by_fkey(id, first_name, last_name)')
    .eq('organization_id', orgId)
    .in('category', ['organizational', 'team'])

  if (cycleId) query = query.eq('performance_cycle_id', cycleId)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getGoalHierarchy(parentGoalId: string) {
  const { data, error } = await supabase
    .from('employee_goals')
    .select('*, employee:employees(id, first_name, last_name, email, employee_code), goal_key_results(*)')
    .eq('parent_goal_id', parentGoalId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getTeamGoals(managerId: string, orgId: string, cycleId?: string) {
  // Get employees reporting to this manager
  const { data: reports, error: repError } = await supabase
    .from('employee_work_profiles')
    .select('employee_id')
    .eq('reporting_manager_id', managerId)
    .eq('is_current', true)
    .eq('organization_id', orgId)
  if (repError) throw repError

  const reportIds = (reports || []).map((r) => r.employee_id)
  if (reportIds.length === 0) return []

  let query = supabase
    .from('employee_goals')
    .select('*, employee:employees(id, first_name, last_name, email, employee_code), performance_cycle:performance_cycles(id, cycle_name, cycle_code), goal_key_results(*)')
    .in('employee_id', reportIds)

  if (cycleId) query = query.eq('performance_cycle_id', cycleId)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createGoalForEmployee(data: Partial<EmployeeGoal>) {
  const { data: newData, error } = await supabase
    .from('employee_goals')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return newData
}

// ============================================
// Performance Analytics
// ============================================

export async function getPerformanceAnalytics(orgId: string, cycleId: string, teamManagerId?: string) {
  // Get all reviews for this cycle
  let query = supabase
    .from('performance_reviews')
    .select('id, employee_id, final_rating, status, employee:employees!performance_reviews_employee_id_fkey(id, department_id, department:departments(id, name))')
    .eq('organization_id', orgId)
    .eq('performance_cycle_id', cycleId)

  if (teamManagerId) {
    query = query.eq('reviewer_id', teamManagerId)
  }

  const { data: reviews, error } = await query
  if (error) throw error

  const allReviews = reviews || []
  const totalReviews = allReviews.length
  const finalizedReviews = allReviews.filter((r) => r.status === 'finalized')
  const ratedReviews = finalizedReviews.filter((r) => r.final_rating != null)

  const avgRating = ratedReviews.length > 0
    ? ratedReviews.reduce((sum, r) => sum + (r.final_rating || 0), 0) / ratedReviews.length
    : 0

  const completionRate = totalReviews > 0 ? Math.round((finalizedReviews.length / totalReviews) * 100) : 0
  const topPerformers = ratedReviews.filter((r) => (r.final_rating || 0) >= 4.0).length

  // Ratings by department
  const deptMap = new Map<string, { name: string; ratings: number[]; count: number }>()
  for (const rev of ratedReviews) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const emp = rev.employee as any
    const deptName = emp?.department?.name || 'Unassigned'
    const deptId = emp?.department_id || 'unassigned'
    if (!deptMap.has(deptId)) {
      deptMap.set(deptId, { name: deptName, ratings: [], count: 0 })
    }
    const dept = deptMap.get(deptId)!
    dept.ratings.push(rev.final_rating || 0)
    dept.count++
  }

  const ratingsByDepartment = Array.from(deptMap.entries()).map(([, dept]) => ({
    department: dept.name,
    avgRating: dept.ratings.reduce((s, r) => s + r, 0) / dept.ratings.length,
    reviewCount: dept.count,
  })).sort((a, b) => b.avgRating - a.avgRating)

  return {
    avgRating: Math.round(avgRating * 10) / 10,
    completionRate,
    topPerformers,
    totalReviews,
    finalizedCount: finalizedReviews.length,
    ratingsByDepartment,
  }
}

export async function getRatingTrend(orgId: string, teamManagerId?: string) {
  // Get all completed cycles
  const { data: cycles, error: cycleError } = await supabase
    .from('performance_cycles')
    .select('id, cycle_name, cycle_code, start_date')
    .eq('organization_id', orgId)
    .in('status', ['completed', 'calibration', 'manager_review'])
    .order('start_date')
  if (cycleError) throw cycleError

  const trend: { cycleName: string; avgRating: number }[] = []

  for (const cycle of cycles || []) {
    let query = supabase
      .from('performance_reviews')
      .select('final_rating')
      .eq('performance_cycle_id', cycle.id)
      .eq('status', 'finalized')
      .not('final_rating', 'is', null)

    if (teamManagerId) {
      query = query.eq('reviewer_id', teamManagerId)
    }

    const { data: reviews } = await query
    if (reviews && reviews.length > 0) {
      const avg = reviews.reduce((s, r) => s + (r.final_rating || 0), 0) / reviews.length
      trend.push({ cycleName: cycle.cycle_name, avgRating: Math.round(avg * 10) / 10 })
    }
  }

  return trend
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

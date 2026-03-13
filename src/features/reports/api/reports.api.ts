import { supabase } from '@/lib/supabase'

// ── Employee Reports ──────────────────────────────────────

export async function fetchEmployeesByDepartment(organizationId: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('id, status, employment_type, department:departments(id, name), created_at')
    .eq('organization_id', organizationId)
  if (error) throw error
  return data
}

// ── Leave Reports ──────────────────────────────────────

export async function fetchLeaveReport(organizationId: string) {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('id, status, leave_type:leave_types(name), start_date, end_date, total_days, employee:employees(first_name, last_name, employee_code)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ── Attendance Reports ──────────────────────────────────

export async function fetchAttendanceReport(organizationId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('id, date, status, employee:employees(first_name, last_name, employee_code, department:departments(name))')
    .eq('organization_id', organizationId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

// ── Payroll Reports ──────────────────────────────────

export async function fetchPayrollReport(organizationId: string) {
  const { data, error } = await supabase
    .from('payslips')
    .select('id, net_pay, gross_earnings, total_deductions, pay_period_start, pay_period_end, status, employee:employees(first_name, last_name, employee_code, department:departments(name))')
    .eq('organization_id', organizationId)
    .order('pay_period_start', { ascending: false })
  if (error) throw error
  return data
}

// ── Recruitment Reports ──────────────────────────────────

export async function fetchRecruitmentReport(organizationId: string) {
  const { data, error } = await supabase
    .from('job_requisitions')
    .select('id, title, requisition_code, status, headcount, created_at, department:departments(name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchApplicationsReport(organizationId: string) {
  const { data, error } = await supabase
    .from('candidate_applications')
    .select('id, status, applied_date, candidate:candidates(full_name), requisition:job_requisitions(title)')
    .eq('organization_id', organizationId)
    .order('applied_date', { ascending: false })
  if (error) throw error
  return data
}

// ── Learning Reports ──────────────────────────────────

export async function fetchLearningReport(organizationId: string) {
  const { data, error } = await supabase
    .from('training_enrollments')
    .select('id, status, progress_percent, enrolled_date, completion_date, course:training_courses(course_name, course_code), employee:employees(first_name, last_name, employee_code)')
    .eq('organization_id', organizationId)
    .order('enrolled_date', { ascending: false })
  if (error) throw error
  return data
}

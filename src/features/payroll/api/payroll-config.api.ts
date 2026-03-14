import { supabase } from '@/lib/supabase'
import type { PayrollConfig, PayrollApproval } from '@/types/database.types'

// ============================================
// Payroll Config
// ============================================

const DEFAULT_CONFIG: Omit<PayrollConfig, 'id' | 'organization_id' | 'created_at' | 'updated_at'> = {
  pay_day_type: 'last_working_friday',
  fixed_pay_day: null,
  skip_holidays: true,
  reminder_days_before: 5,
  reminder_enabled: true,
  require_two_level_approval: true,
  first_approver_role: 'payroll_admin',
  second_approver_role: 'hr_admin',
}

export async function getPayrollConfig(orgId: string): Promise<PayrollConfig> {
  const { data, error } = await supabase
    .from('payroll_config')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle()
  if (error) throw error

  if (data) return data as PayrollConfig

  // Create default config if none exists
  const { data: created, error: createError } = await supabase
    .from('payroll_config')
    .insert({ organization_id: orgId, ...DEFAULT_CONFIG })
    .select()
    .single()
  if (createError) throw createError
  return created as PayrollConfig
}

export async function updatePayrollConfig(
  orgId: string,
  updates: Partial<PayrollConfig>
): Promise<PayrollConfig> {
  const { data, error } = await supabase
    .from('payroll_config')
    .upsert(
      { organization_id: orgId, ...updates },
      { onConflict: 'organization_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data as PayrollConfig
}

// ============================================
// Payroll Approvals
// ============================================

export async function getPayrollApprovals(cycleId: string): Promise<PayrollApproval[]> {
  const { data, error } = await supabase
    .from('payroll_approvals')
    .select('*, approver:employees!approver_id(id, first_name, last_name)')
    .eq('payroll_cycle_id', cycleId)
    .order('approval_level')
  if (error) throw error
  return (data || []) as PayrollApproval[]
}

export async function submitForApproval(
  cycleId: string,
  orgId: string,
  submittedBy: string
) {
  // Create L1 approval record
  const { error: approvalError } = await supabase
    .from('payroll_approvals')
    .insert({
      organization_id: orgId,
      payroll_cycle_id: cycleId,
      approval_level: 1,
      status: 'pending',
    })
  if (approvalError) throw approvalError

  // Update cycle approval status
  const { data, error } = await supabase
    .from('payroll_cycles')
    .update({
      approval_status: 'pending_l1',
      submitted_for_approval_at: new Date().toISOString(),
      submitted_by: submittedBy,
    })
    .eq('id', cycleId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function approvePayroll(
  cycleId: string,
  orgId: string,
  level: 1 | 2,
  approverId: string,
  remarks?: string
) {
  // Update the approval record
  const { error: approvalError } = await supabase
    .from('payroll_approvals')
    .update({
      status: 'approved',
      approver_id: approverId,
      approved_at: new Date().toISOString(),
      remarks: remarks || null,
    })
    .eq('payroll_cycle_id', cycleId)
    .eq('approval_level', level)
  if (approvalError) throw approvalError

  if (level === 1) {
    // Check if two-level approval is required
    const config = await getPayrollConfig(orgId)

    if (config.require_two_level_approval) {
      // Create L2 approval record
      const { error: l2Error } = await supabase
        .from('payroll_approvals')
        .insert({
          organization_id: orgId,
          payroll_cycle_id: cycleId,
          approval_level: 2,
          status: 'pending',
        })
      if (l2Error) throw l2Error

      // Update cycle to pending L2
      const { data, error } = await supabase
        .from('payroll_cycles')
        .update({ approval_status: 'pending_l2' })
        .eq('id', cycleId)
        .select()
        .single()
      if (error) throw error
      return data
    }
  }

  // Final approval (L2 or single-level L1)
  const { data, error } = await supabase
    .from('payroll_cycles')
    .update({ approval_status: 'approved', processing_status: 'approved' })
    .eq('id', cycleId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function rejectPayroll(
  cycleId: string,
  level: 1 | 2,
  approverId: string,
  remarks: string
) {
  // Update the approval record
  const { error: approvalError } = await supabase
    .from('payroll_approvals')
    .update({
      status: 'rejected',
      approver_id: approverId,
      approved_at: new Date().toISOString(),
      remarks,
    })
    .eq('payroll_cycle_id', cycleId)
    .eq('approval_level', level)
  if (approvalError) throw approvalError

  // Update cycle to rejected
  const { data, error } = await supabase
    .from('payroll_cycles')
    .update({ approval_status: 'rejected' })
    .eq('id', cycleId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ============================================
// Next Pay Date Calculation
// ============================================

export function calculateNextPayDate(config: PayrollConfig): Date {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() // 0-indexed

  switch (config.pay_day_type) {
    case 'fixed_date': {
      const day = config.fixed_pay_day || 28
      let payDate = new Date(year, month, day)
      if (payDate <= today) {
        payDate = new Date(year, month + 1, day)
      }
      // If skip_holidays, shift to previous working day (skip Sat/Sun)
      if (config.skip_holidays) {
        while (payDate.getDay() === 0 || payDate.getDay() === 6) {
          payDate.setDate(payDate.getDate() - 1)
        }
      }
      return payDate
    }

    case 'last_day_of_month': {
      let payDate = new Date(year, month + 1, 0) // last day of current month
      if (payDate <= today) {
        payDate = new Date(year, month + 2, 0) // last day of next month
      }
      if (config.skip_holidays) {
        while (payDate.getDay() === 0 || payDate.getDay() === 6) {
          payDate.setDate(payDate.getDate() - 1)
        }
      }
      return payDate
    }

    case 'last_working_friday':
    default: {
      // Find the last Friday of the current month
      let lastDay = new Date(year, month + 1, 0)
      while (lastDay.getDay() !== 5) {
        lastDay.setDate(lastDay.getDate() - 1)
      }
      if (lastDay <= today) {
        // Move to next month
        lastDay = new Date(year, month + 2, 0)
        while (lastDay.getDay() !== 5) {
          lastDay.setDate(lastDay.getDate() - 1)
        }
      }
      return lastDay
    }
  }
}

import { supabase } from '@/lib/supabase'
import { DEFAULT_INDIA_SALARY_COMPONENTS } from '@/lib/constants'
import type {
  SalaryComponent,
  SalaryStructure,
  SalaryStructureComponent,
  EmployeeCompensation,
  EmployeeCompensationComponent,
  PayrollCycle,
  PayrollRun,
  PayrollRunEmployee,
  PayrollEarning,
  PayrollDeduction,
  Payslip,
  PayrollAdjustment,
} from '@/types/database.types'
import { computeEmployeePayroll, generatePayslipNumber, generatePayrollCSV, downloadCSV, getMonthName } from '../utils/payroll-utils'
import type { PayrollCSVRow } from '../utils/payroll-utils'

// ============================================
// Salary Components
// ============================================

export async function getSalaryComponents(orgId: string) {
  const { data, error } = await supabase
    .from('salary_components')
    .select('*')
    .eq('organization_id', orgId)
    .order('display_order')
  if (error) throw error
  return data
}

export async function createSalaryComponent(component: Partial<SalaryComponent>) {
  const { data, error } = await supabase
    .from('salary_components')
    .insert(component)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSalaryComponent(id: string, updates: Partial<SalaryComponent>) {
  const { data, error } = await supabase
    .from('salary_components')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSalaryComponent(id: string) {
  const { error } = await supabase
    .from('salary_components')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw error
}

export async function seedDefaultComponents(orgId: string) {
  const records = DEFAULT_INDIA_SALARY_COMPONENTS.map((c) => ({
    ...c,
    organization_id: orgId,
  }))
  const { data, error } = await supabase
    .from('salary_components')
    .insert(records)
    .select()
  if (error) throw error
  return data
}

// ============================================
// Salary Structures
// ============================================

export async function getSalaryStructures(orgId: string) {
  const { data, error } = await supabase
    .from('salary_structures')
    .select('*, salary_structure_components(*, salary_component:salary_components(*))')
    .eq('organization_id', orgId)
    .order('structure_name')
  if (error) throw error
  return data
}

export async function createSalaryStructure(structure: Partial<SalaryStructure>) {
  const { data, error } = await supabase
    .from('salary_structures')
    .insert(structure)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSalaryStructure(id: string, updates: Partial<SalaryStructure>) {
  const { data, error } = await supabase
    .from('salary_structures')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSalaryStructure(id: string) {
  const { error } = await supabase
    .from('salary_structures')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw error
}

export async function upsertStructureComponents(
  structureId: string,
  components: Partial<SalaryStructureComponent>[]
) {
  // Delete existing components for this structure
  const { error: deleteError } = await supabase
    .from('salary_structure_components')
    .delete()
    .eq('salary_structure_id', structureId)
  if (deleteError) throw deleteError

  // Attach salary_structure_id to each component before insert
  const withStructureId = components.map((c) => ({
    ...c,
    salary_structure_id: structureId,
  }))

  // Bulk insert new ones
  const { data, error } = await supabase
    .from('salary_structure_components')
    .insert(withStructureId)
    .select()
  if (error) throw error
  return data
}

// ============================================
// Employee Compensation
// ============================================

export async function getEmployeeCompensations(orgId: string) {
  const { data, error } = await supabase
    .from('employee_compensation')
    .select('*, employee:employees!employee_id(id, first_name, last_name, email, employee_code, department_id, department:departments!department_id(id, name)), salary_structure:salary_structures(id, structure_name, structure_code), employee_compensation_components(*, salary_component:salary_components(id, component_name, component_code, component_type))')
    .eq('is_current', true)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getEmployeeCompensation(employeeId: string) {
  const { data, error } = await supabase
    .from('employee_compensation')
    .select('*, employee:employees!employee_id(id, first_name, last_name, email, employee_code, department_id, department:departments!department_id(id, name)), salary_structure:salary_structures(id, structure_name, structure_code), employee_compensation_components(*, salary_component:salary_components(id, component_name, component_code, component_type))')
    .eq('employee_id', employeeId)
    .eq('is_current', true)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createEmployeeCompensation(data: Partial<EmployeeCompensation>) {
  // Mark existing current compensation as not current
  const { error: updateError } = await supabase
    .from('employee_compensation')
    .update({ is_current: false })
    .eq('employee_id', data.employee_id!)
    .eq('is_current', true)
  if (updateError) throw updateError

  // Insert new compensation record
  const { data: newData, error } = await supabase
    .from('employee_compensation')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return newData
}

export async function createCompensationComponents(components: Partial<EmployeeCompensationComponent>[]) {
  const { data, error } = await supabase
    .from('employee_compensation_components')
    .insert(components)
    .select()
  if (error) throw error
  return data
}

// ============================================
// Payroll Cycles
// ============================================

export async function getPayrollCycles(orgId: string, year?: number) {
  let query = supabase
    .from('payroll_cycles')
    .select('*')
    .eq('organization_id', orgId)

  if (year) query = query.eq('payroll_year', year)

  const { data, error } = await query
    .order('payroll_year', { ascending: false })
    .order('payroll_month', { ascending: false })
  if (error) throw error
  return data
}

export async function createPayrollCycle(cycle: Partial<PayrollCycle>) {
  const { data, error } = await supabase
    .from('payroll_cycles')
    .insert(cycle)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePayrollCycleStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from('payroll_cycles')
    .update({ processing_status: status as PayrollCycle['processing_status'] })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ============================================
// Payroll Runs
// ============================================

export async function getPayrollRuns(cycleId: string) {
  const { data, error } = await supabase
    .from('payroll_runs')
    .select('*')
    .eq('payroll_cycle_id', cycleId)
    .order('run_number')
  if (error) throw error
  return data
}

export async function createPayrollRun(run: Partial<PayrollRun>) {
  const { data, error } = await supabase
    .from('payroll_runs')
    .insert(run)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePayrollRunStatus(id: string, updates: Partial<PayrollRun>) {
  const { data, error } = await supabase
    .from('payroll_runs')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getPayrollRunDetail(runId: string) {
  const { data, error } = await supabase
    .from('payroll_run_employees')
    .select('*, employee:employees!employee_id(id, first_name, last_name, email, employee_code, department_id, department:departments!department_id(id, name)), payroll_earnings(*, salary_component:salary_components(id, component_name, component_code)), payroll_deductions(*, salary_component:salary_components(id, component_name, component_code))')
    .eq('payroll_run_id', runId)
    .order('created_at')
  if (error) throw error
  return data
}

// ============================================
// Payroll Computation
// ============================================

export async function computePayrollForRun(runId: string, orgId: string) {
  // 1. Get the payroll run to find the cycle
  const { data: run, error: runError } = await supabase
    .from('payroll_runs')
    .select('*')
    .eq('id', runId)
    .single()
  if (runError) throw runError

  // 2. Get the payroll cycle for month/year
  const { data: cycle, error: cycleError } = await supabase
    .from('payroll_cycles')
    .select('*')
    .eq('id', run.payroll_cycle_id)
    .single()
  if (cycleError) throw cycleError

  // 3. Get all active employees with is_current compensation and components
  const { data: compensations, error: compError } = await supabase
    .from('employee_compensation')
    .select('*, employee:employees!employee_id(id, first_name, last_name, email, employee_code, status), employee_compensation_components(*, salary_component:salary_components(id, component_name, component_code, component_type, is_statutory, statutory_type))')
    .eq('organization_id', orgId)
    .eq('is_current', true)
  if (compError) throw compError

  // Filter to only active employees
  const activeCompensations = (compensations || []).filter((c) => {
    const emp = c.employee as { status?: string } | null
    return emp?.status === 'active'
  })

  // 4. Get unprocessed adjustments for the month/year
  const { data: adjustments, error: adjError } = await supabase
    .from('payroll_adjustments')
    .select('*')
    .eq('organization_id', orgId)
    .eq('adjustment_month', cycle.payroll_month)
    .eq('adjustment_year', cycle.payroll_year)
    .eq('is_processed', false)
  if (adjError) throw adjError

  const totalWorkingDays = 22 // MVP simplification

  const runEmployees: Partial<PayrollRunEmployee>[] = []
  const allEarnings: Partial<PayrollEarning>[] = []
  const allDeductions: Partial<PayrollDeduction>[] = []

  // 5. For each employee: compute payroll
  for (const comp of activeCompensations) {
    const empId = (comp.employee as { id: string } | null)?.id
    if (!empId) continue

    const empAdjustments = (adjustments || [])
      .filter((a) => a.employee_id === empId)
      .map((a) => ({
        adjustment_type: a.adjustment_type,
        amount: a.amount,
        salary_component_id: a.salary_component_id,
      }))

    const components = ((comp.employee_compensation_components as Array<{
      salary_component_id: string
      calculation_type: string
      monthly_amount: number
      salary_component: {
        id: string
        component_name: string
        component_code: string
        component_type: string
        is_statutory: boolean
        statutory_type: string | null
      } | null
    }>) || []).map((cc) => ({
      salary_component_id: cc.salary_component_id,
      component_code: cc.salary_component?.component_code || '',
      component_type: cc.salary_component?.component_type || 'earning',
      calculation_type: cc.calculation_type,
      monthly_amount: cc.monthly_amount,
      is_statutory: cc.salary_component?.is_statutory || false,
      statutory_type: cc.salary_component?.statutory_type || null,
    }))

    const result = computeEmployeePayroll(
      comp.monthly_gross,
      components,
      empAdjustments,
      totalWorkingDays, // presentDays
      0, // lopDays
      totalWorkingDays
    )

    const runEmployee: Partial<PayrollRunEmployee> = {
      organization_id: orgId,
      payroll_run_id: runId,
      employee_id: empId,
      employee_compensation_id: comp.id,
      gross_earnings: result.grossEarnings,
      total_deductions: result.totalDeductions,
      net_pay: result.netPay,
      total_employer_contributions: result.totalEmployerContributions,
      working_days: totalWorkingDays,
      present_days: totalWorkingDays,
      lop_days: 0,
      payroll_status: 'computed',
    }
    runEmployees.push(runEmployee)

    // Store earnings and deductions keyed by employee index for later bulk insert
    allEarnings.push(
      ...result.earnings.map((e) => ({
        salary_component_id: e.salary_component_id,
        amount: e.amount,
      }))
    )
    allDeductions.push(
      ...result.deductions.map((d) => ({
        salary_component_id: d.salary_component_id,
        amount: d.amount,
      }))
    )
  }

  // 6. Bulk insert payroll_run_employees
  const { data: insertedEmployees, error: insertEmpError } = await supabase
    .from('payroll_run_employees')
    .insert(runEmployees)
    .select()
  if (insertEmpError) throw insertEmpError

  // 7. For each employee: bulk insert payroll_earnings and payroll_deductions
  let earningIdx = 0
  let deductionIdx = 0
  for (let i = 0; i < activeCompensations.length; i++) {
    const comp = activeCompensations[i]
    const runEmpId = insertedEmployees[i]?.id
    if (!runEmpId) continue

    const empId = (comp.employee as { id: string } | null)?.id
    if (!empId) continue

    const empAdjustments = (adjustments || [])
      .filter((a) => a.employee_id === empId)
      .map((a) => ({
        adjustment_type: a.adjustment_type,
        amount: a.amount,
        salary_component_id: a.salary_component_id,
      }))

    const components = ((comp.employee_compensation_components as Array<{
      salary_component_id: string
      calculation_type: string
      monthly_amount: number
      salary_component: {
        id: string
        component_code: string
        component_type: string
        is_statutory: boolean
        statutory_type: string | null
      } | null
    }>) || []).map((cc) => ({
      salary_component_id: cc.salary_component_id,
      component_code: cc.salary_component?.component_code || '',
      component_type: cc.salary_component?.component_type || 'earning',
      calculation_type: cc.calculation_type,
      monthly_amount: cc.monthly_amount,
      is_statutory: cc.salary_component?.is_statutory || false,
      statutory_type: cc.salary_component?.statutory_type || null,
    }))

    const result = computeEmployeePayroll(
      comp.monthly_gross,
      components,
      empAdjustments,
      totalWorkingDays,
      0,
      totalWorkingDays
    )

    const earningsToInsert = result.earnings.map((e) => ({
      payroll_run_employee_id: runEmpId,
      salary_component_id: e.salary_component_id,
      amount: e.amount,
    }))

    const deductionsToInsert = result.deductions.map((d) => ({
      payroll_run_employee_id: runEmpId,
      salary_component_id: d.salary_component_id,
      amount: d.amount,
    }))

    if (earningsToInsert.length > 0) {
      const { error: eErr } = await supabase
        .from('payroll_earnings')
        .insert(earningsToInsert)
      if (eErr) throw eErr
    }

    if (deductionsToInsert.length > 0) {
      const { error: dErr } = await supabase
        .from('payroll_deductions')
        .insert(deductionsToInsert)
      if (dErr) throw dErr
    }

    earningIdx += result.earnings.length
    deductionIdx += result.deductions.length
  }

  // 8. Update payroll_run with totals and status='completed'
  const totalGross = insertedEmployees.reduce((sum, e) => sum + (e.gross_earnings || 0), 0)
  const totalDeductions = insertedEmployees.reduce((sum, e) => sum + (e.total_deductions || 0), 0)
  const totalNetPay = insertedEmployees.reduce((sum, e) => sum + (e.net_pay || 0), 0)

  const { error: updateRunError } = await supabase
    .from('payroll_runs')
    .update({
      run_status: 'completed',
      total_employees: insertedEmployees.length,
      total_gross: totalGross,
      total_deductions: totalDeductions,
      total_net_pay: totalNetPay,
      processed_at: new Date().toISOString(),
    })
    .eq('id', runId)
  if (updateRunError) throw updateRunError

  // 9. Mark adjustments as processed
  const adjustmentIds = (adjustments || []).map((a) => a.id)
  if (adjustmentIds.length > 0) {
    const { error: adjUpdateError } = await supabase
      .from('payroll_adjustments')
      .update({ is_processed: true })
      .in('id', adjustmentIds)
    if (adjUpdateError) throw adjUpdateError
  }

  // 10. Update parent cycle status to 'computed'
  const { error: cycleUpdateError } = await supabase
    .from('payroll_cycles')
    .update({ processing_status: 'computed' })
    .eq('id', run.payroll_cycle_id)
  if (cycleUpdateError) throw cycleUpdateError

  return insertedEmployees
}

// ============================================
// Execute Payroll (CSV Export + Mark Paid)
// ============================================

export async function executePayrollForCycle(cycleId: string, orgId: string) {
  // 1. Get the cycle for month/year
  const { data: cycle, error: cycleError } = await supabase
    .from('payroll_cycles')
    .select('*')
    .eq('id', cycleId)
    .single()
  if (cycleError) throw cycleError

  // 2. Get all runs for this cycle
  const { data: runs, error: runsError } = await supabase
    .from('payroll_runs')
    .select('id')
    .eq('payroll_cycle_id', cycleId)
  if (runsError) throw runsError

  if (!runs || runs.length === 0) throw new Error('No payroll runs found for this cycle')

  const runIds = runs.map((r) => r.id)

  // 3. Get all payroll_run_employees with employee details
  const { data: runEmployees, error: reError } = await supabase
    .from('payroll_run_employees')
    .select('*, employee:employees!employee_id(id, first_name, last_name, employee_code)')
    .in('payroll_run_id', runIds)
  if (reError) throw reError

  if (!runEmployees || runEmployees.length === 0) throw new Error('No employees found in payroll runs')

  // 4. Get bank accounts for all employees (salary accounts)
  const employeeIds = runEmployees.map((re) => (re.employee as { id: string })?.id).filter(Boolean)
  const { data: bankAccounts, error: bankError } = await supabase
    .from('employee_bank_accounts')
    .select('employee_id, bank_name, account_number, ifsc_code, is_salary_account')
    .in('employee_id', employeeIds)
    .eq('is_salary_account', true)
  if (bankError) throw bankError

  // Build a lookup map: employee_id -> bank account
  const bankMap = new Map<string, { bank_name: string; account_number: string; ifsc_code: string }>()
  for (const ba of bankAccounts || []) {
    bankMap.set(ba.employee_id, {
      bank_name: ba.bank_name,
      account_number: ba.account_number,
      ifsc_code: ba.ifsc_code,
    })
  }

  // 5. Build CSV rows
  const csvRows: PayrollCSVRow[] = runEmployees.map((re) => {
    const emp = re.employee as { id: string; first_name: string; last_name: string; employee_code: string }
    const bank = bankMap.get(emp?.id || '') || { bank_name: '', account_number: '', ifsc_code: '' }
    return {
      employeeName: `${emp?.first_name || ''} ${emp?.last_name || ''}`.trim(),
      employeeCode: emp?.employee_code || '',
      netPay: re.net_pay || 0,
      bankName: bank.bank_name,
      accountNumber: bank.account_number,
      ifscCode: bank.ifsc_code,
    }
  })

  // 6. Generate and download CSV
  const csvContent = generatePayrollCSV(csvRows, cycle.payroll_month, cycle.payroll_year)
  const monthName = getMonthName(cycle.payroll_month)
  const filename = `Payroll_${monthName}_${cycle.payroll_year}_BankTransfer.csv`
  downloadCSV(csvContent, filename)

  // 7. Update cycle status to 'paid'
  const { error: updateError } = await supabase
    .from('payroll_cycles')
    .update({ processing_status: 'paid' })
    .eq('id', cycleId)
  if (updateError) throw updateError

  return csvRows
}

// ============================================
// Payslips
// ============================================

export async function getMyPayslips(employeeId: string) {
  const { data, error } = await supabase
    .from('payslips')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('published_flag', true)
    .order('payroll_year', { ascending: false })
    .order('payroll_month', { ascending: false })
  if (error) throw error
  return data
}

export async function getAllPayslips(orgId: string, month?: number, year?: number) {
  let query = supabase
    .from('payslips')
    .select('*, employee:employees(id, first_name, last_name, email, employee_code)')
    .eq('organization_id', orgId)

  if (month) query = query.eq('payroll_month', month)
  if (year) query = query.eq('payroll_year', year)

  const { data, error } = await query
    .order('payroll_year', { ascending: false })
    .order('payroll_month', { ascending: false })
  if (error) throw error
  return data
}

export async function getPayslipDetail(payslipId: string) {
  // Fetch payslip with employee details
  const { data: payslip, error: psError } = await supabase
    .from('payslips')
    .select('*, employee:employees!employee_id(id, first_name, last_name, email, employee_code, date_of_joining, statutory:employee_statutory(pan_number, uan_number, bank_details), department:departments!department_id(id, name), designation:designations!designation_id(id, title))')
    .eq('id', payslipId)
    .single()
  if (psError) throw psError

  // Fetch earnings and deductions via payroll_run_employee
  const { data: runEmployee, error: reError } = await supabase
    .from('payroll_run_employees')
    .select('*, payroll_earnings(*, salary_component:salary_components(id, component_name, component_code, component_type)), payroll_deductions(*, salary_component:salary_components(id, component_name, component_code, component_type))')
    .eq('id', payslip.payroll_run_employee_id)
    .single()
  if (reError) throw reError

  return {
    ...payslip,
    earnings: runEmployee.payroll_earnings || [],
    deductions: runEmployee.payroll_deductions || [],
    working_days: runEmployee.working_days,
    present_days: runEmployee.present_days,
    lop_days: runEmployee.lop_days,
  }
}

export async function generatePayslips(runId: string, orgId: string) {
  // Get payroll_run_employees for this run
  const { data: runEmployees, error: reError } = await supabase
    .from('payroll_run_employees')
    .select('*')
    .eq('payroll_run_id', runId)
  if (reError) throw reError

  // Get the payroll run to find the cycle
  const { data: run, error: runError } = await supabase
    .from('payroll_runs')
    .select('*')
    .eq('id', runId)
    .single()
  if (runError) throw runError

  // Get the payroll cycle for month/year
  const { data: cycle, error: cycleError } = await supabase
    .from('payroll_cycles')
    .select('*')
    .eq('id', run.payroll_cycle_id)
    .single()
  if (cycleError) throw cycleError

  // Build payslip records
  const payslips: Partial<Payslip>[] = (runEmployees || []).map((re, index) => ({
    organization_id: orgId,
    payroll_run_employee_id: re.id,
    employee_id: re.employee_id,
    payslip_number: generatePayslipNumber(cycle.payroll_month, cycle.payroll_year, index + 1),
    payroll_month: cycle.payroll_month,
    payroll_year: cycle.payroll_year,
    gross_earnings: re.gross_earnings,
    total_deductions: re.total_deductions,
    net_pay: re.net_pay,
    generated_on: new Date().toISOString(),
    published_flag: false,
  }))

  const { data, error } = await supabase
    .from('payslips')
    .insert(payslips)
    .select()
  if (error) throw error
  return data
}

export async function publishPayslips(runId: string) {
  // Get payroll_run_employee ids for this run
  const { data: runEmployees, error: reError } = await supabase
    .from('payroll_run_employees')
    .select('id')
    .eq('payroll_run_id', runId)
  if (reError) throw reError

  const runEmployeeIds = (runEmployees || []).map((re) => re.id)
  if (runEmployeeIds.length === 0) return

  const { error } = await supabase
    .from('payslips')
    .update({ published_flag: true, published_at: new Date().toISOString() })
    .in('payroll_run_employee_id', runEmployeeIds)
  if (error) throw error
}

// ============================================
// Payroll Adjustments
// ============================================

export async function getPayrollAdjustments(orgId: string, month?: number, year?: number) {
  let query = supabase
    .from('payroll_adjustments')
    .select('*, employee:employees!employee_id(id, first_name, last_name)')
    .eq('organization_id', orgId)

  if (month) query = query.eq('adjustment_month', month)
  if (year) query = query.eq('adjustment_year', year)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createPayrollAdjustment(adjustment: Partial<PayrollAdjustment>) {
  const { data, error } = await supabase
    .from('payroll_adjustments')
    .insert(adjustment)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePayrollAdjustment(id: string) {
  const { error } = await supabase
    .from('payroll_adjustments')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ============================================
// Current Employee Helper
// ============================================

export async function getCurrentEmployee(profileId: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()
  if (error) throw error
  return data
}

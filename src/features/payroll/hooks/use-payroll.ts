import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import type {
  SalaryComponent,
  SalaryStructure,
  SalaryStructureComponent,
  EmployeeCompensation,
  EmployeeCompensationComponent,
  PayrollCycle,
  PayrollRun,
  Payslip,
  PayrollAdjustment,
} from '@/types/database.types'
import {
  getCurrentEmployee,
  getSalaryComponents,
  createSalaryComponent,
  updateSalaryComponent,
  deleteSalaryComponent,
  seedDefaultComponents,
  getSalaryStructures,
  createSalaryStructure,
  updateSalaryStructure,
  deleteSalaryStructure,
  upsertStructureComponents,
  getEmployeeCompensations,
  getEmployeeCompensation,
  createEmployeeCompensation,
  createCompensationComponents,
  getPayrollCycles,
  createPayrollCycle,
  updatePayrollCycleStatus,
  getPayrollRuns,
  getPayrollRunDetail,
  createPayrollRun,
  computePayrollForRun,
  updatePayrollRunStatus,
  getMyPayslips,
  getAllPayslips,
  generatePayslips,
  publishPayslips,
  getPayrollAdjustments,
  createPayrollAdjustment,
  deletePayrollAdjustment,
  getPayslipDetail,
} from '../api/payroll.api'

// ============================================
// Current Employee Hook
// ============================================

export function useCurrentEmployee() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['current-employee', profile?.id],
    queryFn: () => getCurrentEmployee(profile!.id),
    enabled: !!profile?.id,
  })
}

// ============================================
// Salary Components
// ============================================

export function useSalaryComponents() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['salary-components', organization?.id],
    queryFn: () => getSalaryComponents(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateSalaryComponent() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<SalaryComponent>) =>
      createSalaryComponent({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-components'] })
    },
  })
}

export function useUpdateSalaryComponent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<SalaryComponent> & { id: string }) =>
      updateSalaryComponent(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-components'] })
    },
  })
}

export function useDeleteSalaryComponent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteSalaryComponent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-components'] })
    },
  })
}

export function useSeedDefaultComponents() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: () => seedDefaultComponents(organization!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-components'] })
    },
  })
}

// ============================================
// Salary Structures
// ============================================

export function useSalaryStructures() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['salary-structures', organization?.id],
    queryFn: () => getSalaryStructures(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateSalaryStructure() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: async ({
      structure,
      components,
    }: {
      structure: Partial<SalaryStructure>
      components: Partial<SalaryStructureComponent>[]
    }) => {
      const created = await createSalaryStructure({
        ...structure,
        organization_id: organization!.id,
      })
      if (components.length > 0) {
        await upsertStructureComponents(created.id, components)
      }
      return created
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-structures'] })
    },
  })
}

export function useUpdateSalaryStructure() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      structure,
      components,
    }: {
      id: string
      structure: Partial<SalaryStructure>
      components: Partial<SalaryStructureComponent>[]
    }) => {
      const updated = await updateSalaryStructure(id, structure)
      if (components.length > 0) {
        await upsertStructureComponents(id, components)
      }
      return updated
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-structures'] })
    },
  })
}

export function useDeleteSalaryStructure() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteSalaryStructure,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-structures'] })
    },
  })
}

// ============================================
// Employee Compensations
// ============================================

export function useEmployeeCompensations() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['employee-compensations', organization?.id],
    queryFn: () => getEmployeeCompensations(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useEmployeeCompensation(employeeId: string) {
  return useQuery({
    queryKey: ['employee-compensation', employeeId],
    queryFn: () => getEmployeeCompensation(employeeId),
    enabled: !!employeeId,
  })
}

export function useAssignCompensation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      compensation,
      components,
    }: {
      compensation: Partial<EmployeeCompensation>
      components: Partial<EmployeeCompensationComponent>[]
    }) => {
      const created = await createEmployeeCompensation(compensation)
      if (components.length > 0) {
        await createCompensationComponents(
          components.map((c) => ({ ...c, employee_compensation_id: created.id }))
        )
      }
      return created
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-compensations'] })
    },
  })
}

// ============================================
// Payroll Cycles
// ============================================

export function usePayrollCycles(year?: number) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['payroll-cycles', organization?.id, year],
    queryFn: () => getPayrollCycles(organization!.id, year),
    enabled: !!organization?.id,
  })
}

export function useCreatePayrollCycle() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<PayrollCycle>) =>
      createPayrollCycle({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-cycles'] })
    },
  })
}

export function useUpdatePayrollCycleStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updatePayrollCycleStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-cycles'] })
    },
  })
}

// ============================================
// Payroll Runs
// ============================================

export function usePayrollRuns(cycleId: string) {
  return useQuery({
    queryKey: ['payroll-runs', cycleId],
    queryFn: () => getPayrollRuns(cycleId),
    enabled: !!cycleId,
  })
}

export function usePayrollRunDetail(runId: string) {
  return useQuery({
    queryKey: ['payroll-run-detail', runId],
    queryFn: () => getPayrollRunDetail(runId),
    enabled: !!runId,
  })
}

export function useCreatePayrollRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<PayrollRun>) => createPayrollRun(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
    },
  })
}

export function useComputePayroll() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (runId: string) => computePayrollForRun(runId, organization!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-run-detail'] })
    },
  })
}

export function useApprovePayrollRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ runId, approvedBy }: { runId: string; approvedBy?: string }) =>
      updatePayrollRunStatus(runId, { run_status: 'approved', approved_by: approvedBy, approved_at: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-run-detail'] })
    },
  })
}

// ============================================
// Payslips
// ============================================

export function useMyPayslips(employeeId: string) {
  return useQuery({
    queryKey: ['payslips', 'my', employeeId],
    queryFn: () => getMyPayslips(employeeId),
    enabled: !!employeeId,
  })
}

export function useAllPayslips(month?: number, year?: number) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['payslips', 'all', organization?.id, month, year],
    queryFn: () => getAllPayslips(organization!.id, month, year),
    enabled: !!organization?.id,
  })
}

export function usePayslipDetail(payslipId: string) {
  return useQuery({
    queryKey: ['payslip-detail', payslipId],
    queryFn: () => getPayslipDetail(payslipId),
    enabled: !!payslipId,
  })
}

export function useGeneratePayslips() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (runId: string) => generatePayslips(runId, organization!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] })
    },
  })
}

export function usePublishPayslips() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (runId: string) => publishPayslips(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] })
    },
  })
}

// ============================================
// Payroll Adjustments
// ============================================

export function usePayrollAdjustments(month?: number, year?: number) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['payroll-adjustments', organization?.id, month, year],
    queryFn: () => getPayrollAdjustments(organization!.id, month, year),
    enabled: !!organization?.id,
  })
}

export function useCreatePayrollAdjustment() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<PayrollAdjustment>) =>
      createPayrollAdjustment({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-adjustments'] })
    },
  })
}

export function useDeletePayrollAdjustment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deletePayrollAdjustment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-adjustments'] })
    },
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import * as api from '../api/onboarding.api'
import type { EmployeeOnboarding, OnboardingTask, OnboardingTemplate } from '../types'

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['onboarding'] })
}

// ── Templates ───────────────────────────────────────────────────────────────

export function useOnboardingTemplates() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['onboarding', 'templates', organization?.id],
    queryFn: () => api.getTemplates(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (payload: Partial<OnboardingTemplate>) =>
      api.createTemplate({ ...payload, organization_id: organization!.id }),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<OnboardingTemplate> & { id: string }) =>
      api.updateTemplate(id, updates),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.deleteTemplate, onSuccess: () => invalidateAll(qc) })
}

export function useAddTemplateTasks() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (tasks: Record<string, unknown>[]) =>
      api.upsertTemplateTasks(
        tasks.map((t) => ({ ...t, organization_id: organization!.id })) as never
      ),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useDeleteTemplateTask() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.deleteTemplateTask, onSuccess: () => invalidateAll(qc) })
}

// ── Runs ────────────────────────────────────────────────────────────────────

export function useOnboardingRuns() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['onboarding', 'runs', organization?.id],
    queryFn: () => api.getOnboardingRuns(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useEmployeeOnboarding(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['onboarding', 'employee', employeeId],
    queryFn: () => api.getOnboardingForEmployee(employeeId!),
    enabled: !!employeeId,
  })
}

export function useStartOnboarding() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (params: Omit<Parameters<typeof api.startOnboarding>[0], 'orgId'>) =>
      api.startOnboarding({ ...params, orgId: organization!.id }),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdateOnboardingRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<EmployeeOnboarding> & { id: string }) =>
      api.updateOnboardingRun(id, updates),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useDeleteOnboardingRun() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.deleteOnboardingRun, onSuccess: () => invalidateAll(qc) })
}

// ── Tasks ───────────────────────────────────────────────────────────────────

export function useUpdateTaskStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.updateTaskStatus,
    onSuccess: () => invalidateAll(qc),
  })
}

export function useAddOnboardingTask() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (payload: Partial<OnboardingTask>) =>
      api.addTask({ ...payload, organization_id: organization!.id }),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useDeleteOnboardingTask() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.deleteTask, onSuccess: () => invalidateAll(qc) })
}

export function useMyOnboardingTasks(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['onboarding', 'my-tasks', employeeId],
    queryFn: () => api.getMyOnboardingTasks(employeeId!),
    enabled: !!employeeId,
  })
}

// ── Journeys ────────────────────────────────────────────────────────────────

export function useUpdateJourney() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Parameters<typeof api.updateJourney>[1] & { id: string }) =>
      api.updateJourney(id, updates),
    onSuccess: () => invalidateAll(qc),
  })
}

// ── Probation ───────────────────────────────────────────────────────────────

export function useProbationDue(withinDays = 30) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['onboarding', 'probation', organization?.id, withinDays],
    queryFn: () => api.getProbationDue(organization!.id, withinDays),
    enabled: !!organization?.id,
  })
}

export function useConfirmEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.confirmEmployee,
    onSuccess: () => {
      invalidateAll(qc)
      qc.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}

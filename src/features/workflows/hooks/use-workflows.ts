import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  toggleWorkflow,
  getWorkflowRuns,
  getWorkflowRunCounts,
  logWorkflowRun,
} from '../api/workflows.api'
import type { Workflow, WorkflowRun } from '@/types/database.types'

// ============================================================================
// LIST WORKFLOWS
// ============================================================================

export function useWorkflows(orgId: string) {
  return useQuery({
    queryKey: ['workflows', orgId],
    queryFn: () => getWorkflows(orgId),
    enabled: !!orgId,
  })
}

// ============================================================================
// SINGLE WORKFLOW
// ============================================================================

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ['workflow', id],
    queryFn: () => getWorkflow(id),
    enabled: !!id,
  })
}

// ============================================================================
// CREATE WORKFLOW
// ============================================================================

export function useCreateWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<Workflow, 'id' | 'created_at' | 'updated_at'>) =>
      createWorkflow(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      toast.success('Workflow created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create workflow')
    },
  })
}

// ============================================================================
// UPDATE WORKFLOW
// ============================================================================

export function useUpdateWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Partial<Omit<Workflow, 'id' | 'created_at' | 'organization_id' | 'created_by'>>
    }) => updateWorkflow(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      queryClient.invalidateQueries({ queryKey: ['workflow'] })
      toast.success('Workflow updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update workflow')
    },
  })
}

// ============================================================================
// DELETE WORKFLOW
// ============================================================================

export function useDeleteWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      toast.success('Workflow deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete workflow')
    },
  })
}

// ============================================================================
// TOGGLE WORKFLOW
// ============================================================================

export function useToggleWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      toggleWorkflow(id, isEnabled),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      queryClient.invalidateQueries({ queryKey: ['workflow'] })
      toast.success(
        variables.isEnabled ? 'Workflow enabled' : 'Workflow disabled'
      )
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to toggle workflow')
    },
  })
}

// ============================================================================
// WORKFLOW RUNS
// ============================================================================

export function useWorkflowRuns(
  orgId: string,
  options?: { workflowId?: string; status?: string }
) {
  return useQuery({
    queryKey: ['workflow-runs', orgId, options?.workflowId, options?.status],
    queryFn: () => getWorkflowRuns(orgId, options),
    enabled: !!orgId,
  })
}

export function useWorkflowRunCounts(orgId: string) {
  return useQuery({
    queryKey: ['workflow-run-counts', orgId],
    queryFn: () => getWorkflowRunCounts(orgId),
    enabled: !!orgId,
  })
}

// ============================================================================
// LOG WORKFLOW RUN
// ============================================================================

export function useLogWorkflowRun() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<WorkflowRun, 'id' | 'triggered_at'>) =>
      logWorkflowRun(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-runs'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to log workflow run')
    },
  })
}

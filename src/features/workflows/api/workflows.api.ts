import { supabase } from '@/lib/supabase'
import type {
  Workflow,
  WorkflowWithCreator,
  WorkflowRun,
  WorkflowRunWithWorkflow,
} from '@/types/database.types'

// ============================================================================
// WORKFLOWS CRUD
// ============================================================================

export async function getWorkflows(orgId: string): Promise<WorkflowWithCreator[]> {
  const { data, error } = await supabase
    .from('workflows')
    .select('*, creator:profiles!workflows_created_by_fkey(first_name, last_name)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as WorkflowWithCreator[]
}

export async function getWorkflow(id: string): Promise<Workflow> {
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Workflow
}

export async function createWorkflow(
  workflow: Omit<Workflow, 'id' | 'created_at' | 'updated_at'>
): Promise<Workflow> {
  const { data, error } = await supabase
    .from('workflows')
    .insert(workflow)
    .select()
    .single()
  if (error) throw error
  return data as Workflow
}

export async function updateWorkflow(
  id: string,
  updates: Partial<Omit<Workflow, 'id' | 'created_at' | 'organization_id' | 'created_by'>>
): Promise<Workflow> {
  const { data, error } = await supabase
    .from('workflows')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Workflow
}

export async function deleteWorkflow(id: string): Promise<void> {
  const { error } = await supabase
    .from('workflows')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function toggleWorkflow(id: string, isEnabled: boolean): Promise<Workflow> {
  const { data, error } = await supabase
    .from('workflows')
    .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Workflow
}

// ============================================================================
// WORKFLOW RUNS
// ============================================================================

export async function getWorkflowRuns(
  orgId: string,
  options?: { workflowId?: string; status?: string; limit?: number }
): Promise<WorkflowRunWithWorkflow[]> {
  let query = supabase
    .from('workflow_runs')
    .select('*, workflow:workflows!workflow_runs_workflow_id_fkey(id, name, trigger_type)')
    .eq('organization_id', orgId)
    .order('triggered_at', { ascending: false })
    .limit(options?.limit ?? 100)

  if (options?.workflowId) {
    query = query.eq('workflow_id', options.workflowId)
  }
  if (options?.status) {
    query = query.eq('status', options.status)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as WorkflowRunWithWorkflow[]
}

/** Get total run counts per workflow for the org */
export async function getWorkflowRunCounts(
  orgId: string
): Promise<Record<string, { total: number; success: number; failed: number }>> {
  const { data, error } = await supabase
    .from('workflow_runs')
    .select('workflow_id, status')
    .eq('organization_id', orgId)
  if (error) throw error

  const counts: Record<string, { total: number; success: number; failed: number }> = {}
  for (const row of data ?? []) {
    const id = row.workflow_id
    if (!counts[id]) counts[id] = { total: 0, success: 0, failed: 0 }
    counts[id].total++
    if (row.status === 'success') counts[id].success++
    if (row.status === 'failed') counts[id].failed++
  }
  return counts
}

export async function logWorkflowRun(
  run: Omit<WorkflowRun, 'id' | 'triggered_at'>
): Promise<WorkflowRun> {
  const { data, error } = await supabase
    .from('workflow_runs')
    .insert(run)
    .select()
    .single()
  if (error) throw error
  return data as WorkflowRun
}

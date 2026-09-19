import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { useWorkflows, useToggleWorkflow, useDeleteWorkflow, useWorkflowRunCounts } from '../hooks/use-workflows'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Pencil, Trash2, Zap, Clock, Loader2, Play, History } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { format } from 'date-fns'
import type { Workflow, WorkflowWithCreator } from '@/types/database.types'

interface WorkflowListProps {
  onEdit: (workflow: Workflow) => void
  onViewLogs?: (workflowId: string) => void
}

export function WorkflowList({ onEdit, onViewLogs }: WorkflowListProps) {
  const { organization } = useAuth()
  const { canManageWorkflows } = usePermissions()
  const orgId = organization?.id ?? ''
  const { data: workflows, isLoading } = useWorkflows(orgId)
  const { data: runCounts } = useWorkflowRunCounts(orgId)
  const toggleWorkflow = useToggleWorkflow()
  const deleteWorkflow = useDeleteWorkflow()

  const [deleteTarget, setDeleteTarget] = useState<WorkflowWithCreator | null>(null)

  function handleToggle(workflow: WorkflowWithCreator) {
    toggleWorkflow.mutate({ id: workflow.id, isEnabled: !workflow.is_enabled })
  }

  function handleDelete() {
    if (!deleteTarget) return
    deleteWorkflow.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!workflows || workflows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Zap className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm font-medium">No workflows yet</p>
          <p className="text-muted-foreground text-xs mt-1">
            Create your first workflow to automate tasks and notifications.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium w-16">Status</th>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Trigger Type</th>
              <th className="px-4 py-3 text-left font-medium">Runs</th>
              <th className="px-4 py-3 text-left font-medium">Created By</th>
              <th className="px-4 py-3 text-left font-medium">Created At</th>
              {canManageWorkflows && (
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {workflows.map((workflow) => {
              const creatorName = workflow.creator
                ? `${workflow.creator.first_name ?? ''} ${workflow.creator.last_name ?? ''}`.trim()
                : 'Unknown'

              return (
                <tr key={workflow.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Switch
                      checked={workflow.is_enabled}
                      onCheckedChange={() => handleToggle(workflow)}
                      disabled={!canManageWorkflows || toggleWorkflow.isPending}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{workflow.name}</p>
                      {workflow.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {workflow.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="gap-1">
                      {workflow.trigger_type === 'event' ? (
                        <Zap className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      {workflow.trigger_type === 'event' ? 'Event' : 'Time-based'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const counts = runCounts?.[workflow.id]
                      if (!counts || counts.total === 0) {
                        return <span className="text-muted-foreground">—</span>
                      }
                      return (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className="inline-flex items-center gap-1.5 text-sm cursor-pointer hover:underline"
                                onClick={() => onViewLogs?.(workflow.id)}
                              >
                                <Play className="h-3 w-3 text-green-600" />
                                <span className="font-medium">{counts.total}</span>
                                {counts.failed > 0 && (
                                  <span className="text-xs text-destructive">({counts.failed} failed)</span>
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{counts.success} successful, {counts.failed} failed</p>
                              <p className="text-xs text-muted-foreground">Click to view logs</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{creatorName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(workflow.created_at), 'dd MMM yyyy')}
                  </td>
                  {canManageWorkflows && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="View Logs"
                          onClick={() => onViewLogs?.(workflow.id)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(workflow)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(workflow)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Workflow"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteWorkflow.isPending}
        onConfirm={handleDelete}
      />
    </>
  )
}

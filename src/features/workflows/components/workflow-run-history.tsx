import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useWorkflows, useWorkflowRuns } from '../hooks/use-workflows'
import { format } from 'date-fns'
import { Loader2, History, Zap, Clock, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, MinusCircle } from 'lucide-react'
import type { WorkflowRunStatus, WorkflowRunWithWorkflow } from '@/types/database.types'

const STATUS_CONFIG: Record<
  WorkflowRunStatus,
  { label: string; variant: 'default' | 'destructive' | 'secondary'; className: string; icon: typeof CheckCircle2 }
> = {
  success: {
    label: 'Success',
    variant: 'default',
    className: 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle2,
  },
  failed: {
    label: 'Failed',
    variant: 'destructive',
    className: '',
    icon: AlertCircle,
  },
  skipped: {
    label: 'Skipped',
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
    icon: MinusCircle,
  },
}

interface WorkflowRunHistoryProps {
  /** Pre-select a workflow filter (e.g. from clicking "Runs" in the list) */
  initialWorkflowId?: string
}

export function WorkflowRunHistory({ initialWorkflowId }: WorkflowRunHistoryProps) {
  const { organization } = useAuth()
  const orgId = organization?.id ?? ''

  const [workflowFilter, setWorkflowFilter] = useState<string>(initialWorkflowId ?? 'all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const { data: workflows } = useWorkflows(orgId)
  const { data: runs, isLoading } = useWorkflowRuns(orgId, {
    workflowId: workflowFilter !== 'all' ? workflowFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  })

  function toggleExpand(id: string) {
    setExpandedRow((prev) => (prev === id ? null : id))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All Workflows" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Workflows</SelectItem>
            {(workflows ?? []).map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>

        {(workflowFilter !== 'all' || statusFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setWorkflowFilter('all')
              setStatusFilter('all')
            }}
          >
            Clear filters
          </Button>
        )}

        <span className="ml-auto text-xs text-muted-foreground">
          {runs?.length ?? 0} run{(runs?.length ?? 0) !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Empty state */}
      {(!runs || runs.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <History className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm font-medium">No workflow runs yet</p>
            <p className="text-muted-foreground text-xs mt-1">
              {workflowFilter !== 'all' || statusFilter !== 'all'
                ? 'No runs match your filters. Try adjusting or clearing them.'
                : 'Workflow runs will appear here once workflows are triggered.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Runs table */}
      {runs && runs.length > 0 && (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium w-8"></th>
                <th className="px-4 py-3 text-left font-medium">Workflow</th>
                <th className="px-4 py-3 text-left font-medium">Triggered At</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Affected</th>
                <th className="px-4 py-3 text-left font-medium">Summary</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const statusConfig = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.skipped
                const StatusIcon = statusConfig.icon
                const workflowName = run.workflow?.name ?? 'Deleted Workflow'
                const triggerType = run.workflow?.trigger_type
                const isExpanded = expandedRow === run.id
                const hasDetails = run.error_message || (run.affected_employee_ids && run.affected_employee_ids.length > 0)

                return (
                  <>
                    <tr
                      key={run.id}
                      className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${hasDetails ? 'cursor-pointer' : ''}`}
                      onClick={() => hasDetails && toggleExpand(run.id)}
                    >
                      <td className="px-4 py-3 text-muted-foreground">
                        {hasDetails && (
                          isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {triggerType === 'event' ? (
                            <Zap className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className="font-medium">{workflowName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(run.triggered_at), 'dd MMM yyyy, hh:mm a')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={statusConfig.variant}
                          className={`gap-1 ${statusConfig.className}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {run.affected_employee_ids?.length ?? 0} employee{(run.affected_employee_ids?.length ?? 0) !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-[300px] truncate">
                        {run.result_summary || run.error_message || '—'}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${run.id}-detail`} className="border-b last:border-0 bg-muted/20">
                        <td colSpan={6} className="px-6 py-4">
                          <RunDetails run={run} />
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** Expanded detail panel for a single run */
function RunDetails({ run }: { run: WorkflowRunWithWorkflow }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-4 max-w-xl">
        <div>
          <p className="text-muted-foreground text-xs font-medium mb-1">Run ID</p>
          <p className="font-mono text-xs">{run.id}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs font-medium mb-1">Triggered At</p>
          <p>{format(new Date(run.triggered_at), 'dd MMM yyyy, hh:mm:ss a')}</p>
        </div>
      </div>

      {run.result_summary && (
        <div>
          <p className="text-muted-foreground text-xs font-medium mb-1">Result Summary</p>
          <p>{run.result_summary}</p>
        </div>
      )}

      {run.error_message && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-destructive text-xs font-medium mb-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Error Message
          </p>
          <p className="text-destructive text-xs font-mono whitespace-pre-wrap">{run.error_message}</p>
        </div>
      )}

      {run.affected_employee_ids && run.affected_employee_ids.length > 0 && (
        <div>
          <p className="text-muted-foreground text-xs font-medium mb-1">
            Affected Employee IDs ({run.affected_employee_ids.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {run.affected_employee_ids.map((id) => (
              <Badge key={id} variant="outline" className="font-mono text-[10px]">
                {id.slice(0, 8)}…
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

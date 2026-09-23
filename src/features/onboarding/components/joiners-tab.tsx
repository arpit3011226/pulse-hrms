import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Rocket, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { StartOnboardingDialog } from './start-onboarding-dialog'
import { OnboardingDetailDialog } from './onboarding-detail-dialog'
import { useOnboardingRuns, useDeleteOnboardingRun } from '../hooks/use-onboarding'
import { taskProgress, type EmployeeOnboarding } from '../types'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface Props {
  canManage: boolean
  currentEmployeeId?: string
}

export function JoinersTab({ canManage, currentEmployeeId }: Props) {
  const { data: runs, isLoading } = useOnboardingRuns()
  const deleteRun = useDeleteOnboardingRun()

  const [startOpen, setStartOpen] = useState(false)
  const [detail, setDetail] = useState<EmployeeOnboarding | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const rows = runs ?? []

  // Keep the dialog showing fresh data after a task is ticked
  const liveDetail = detail ? rows.find((r) => r.id === detail.id) ?? detail : null

  const columns: ColumnDef<EmployeeOnboarding>[] = [
    {
      id: 'employee',
      header: 'New Joiner',
      cell: ({ row }) => {
        const e = row.original.employee
        return (
          <div>
            <p className="font-medium">{e ? `${e.first_name} ${e.last_name}` : '—'}</p>
            <p className="text-xs text-muted-foreground">
              {e?.designation?.title ?? e?.employee_code ?? '—'}
            </p>
          </div>
        )
      },
    },
    {
      id: 'department',
      header: 'Department',
      cell: ({ row }) => row.original.employee?.department?.name ?? '—',
    },
    {
      accessorKey: 'joining_date',
      header: 'Joined',
      cell: ({ row }) => formatDate(row.original.joining_date),
    },
    {
      id: 'buddy',
      header: 'Buddy',
      cell: ({ row }) => {
        const b = row.original.buddy
        return b ? `${b.first_name} ${b.last_name}` : <span className="text-muted-foreground">—</span>
      },
    },
    {
      id: 'progress',
      header: 'Progress',
      cell: ({ row }) => {
        const p = taskProgress(row.original.onboarding_tasks)
        return (
          <div className="w-36">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{p.done}/{p.total}</span>
              {p.overdue > 0 && (
                <span className="font-medium text-rose-600">{p.overdue} overdue</span>
              )}
            </div>
            <Progress value={p.percent} className="h-1.5" />
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status
        return s === 'completed' ? (
          <Badge className="bg-emerald-100 text-emerald-800">Completed</Badge>
        ) : s === 'cancelled' ? (
          <Badge variant="secondary">Cancelled</Badge>
        ) : (
          <Badge className="bg-blue-100 text-blue-800">In progress</Badge>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setDetail(row.original)}>
            Open
          </Button>
          {canManage && (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => setDeleteId(row.original.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {!isLoading && rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 rounded-full bg-blue-50 p-3">
              <Rocket className="h-6 w-6 text-blue-600" />
            </div>
            <p className="font-medium">No one is being onboarded yet</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Starting onboarding creates the task list from a template and sets up the
              30/60/90/180/365 day check-ins.
            </p>
            {canManage && (
              <Button className="mt-4" onClick={() => setStartOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Start onboarding
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchKey="employee"
          searchPlaceholder="Search joiners…"
          toolbarActions={
            canManage && (
              <Button onClick={() => setStartOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Start onboarding
              </Button>
            )
          }
        />
      )}

      <StartOnboardingDialog
        open={startOpen}
        onOpenChange={setStartOpen}
        currentEmployeeId={currentEmployeeId}
      />

      <OnboardingDetailDialog
        open={!!detail}
        onOpenChange={(open) => !open && setDetail(null)}
        run={liveDetail}
        currentEmployeeId={currentEmployeeId}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete this onboarding"
        description="The task list and all check-ins for this joiner will be removed. The employee record stays."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          try {
            await deleteRun.mutateAsync(deleteId!)
            toast.success('Onboarding deleted')
          } catch {
            toast.error('Could not delete the onboarding')
          } finally {
            setDeleteId(null)
          }
        }}
      />
    </div>
  )
}

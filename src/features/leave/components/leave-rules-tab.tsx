import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { CalendarX, Loader2, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { BlackoutFormDialog } from './blackout-form-dialog'
import {
  useBlackoutPeriods, useDeleteBlackoutPeriod,
  useCarryForwardLogs, useProcessCarryForward,
} from '../hooks/use-leave'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { LeaveBlackoutPeriod } from '@/types/database.types'

type CarryForwardRow = {
  id: string
  days_carried: number
  days_lapsed: number
  from_year: number
  to_year: number
  processed_at: string | null
  leave_type?: { id: string; name: string } | null
  employee?: { id: string; first_name: string; last_name: string } | null
}

export function LeaveRulesTab() {
  const currentYear = new Date().getFullYear()

  // ── Blackout periods ──────────────────────────────
  const { data: periods, isLoading: periodsLoading } = useBlackoutPeriods()
  const deletePeriod = useDeleteBlackoutPeriod()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LeaveBlackoutPeriod | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // ── Carry forward ─────────────────────────────────
  const [fromYear, setFromYear] = useState(currentYear - 1)
  const { data: logs, isLoading: logsLoading } = useCarryForwardLogs(fromYear)
  const processCarryForward = useProcessCarryForward()
  const [confirmProcess, setConfirmProcess] = useState(false)

  const yearOptions = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3]

  const periodColumns: ColumnDef<LeaveBlackoutPeriod>[] = [
    { accessorKey: 'name', header: 'Name' },
    {
      id: 'window',
      header: 'Window',
      cell: ({ row }) =>
        `${formatDate(row.original.start_date)} – ${formatDate(row.original.end_date)}`,
    },
    {
      id: 'applies_to',
      header: 'Applies To',
      cell: ({ row }) => {
        const ids = row.original.applicable_leave_type_ids
        return !ids || ids.length === 0 ? (
          <Badge variant="secondary">All leave types</Badge>
        ) : (
          <Badge variant="outline">{ids.length} type{ids.length === 1 ? '' : 's'}</Badge>
        )
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge status={row.original.is_active ? 'active' : 'terminated'} />
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setEditing(row.original); setFormOpen(true) }}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeleteId(row.original.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const logColumns: ColumnDef<CarryForwardRow>[] = [
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const e = row.original.employee
        return e ? `${e.first_name} ${e.last_name}` : '—'
      },
    },
    {
      id: 'leave_type',
      header: 'Leave Type',
      cell: ({ row }) => row.original.leave_type?.name ?? '—',
    },
    { accessorKey: 'days_carried', header: 'Carried' },
    { accessorKey: 'days_lapsed', header: 'Lapsed' },
    {
      id: 'years',
      header: 'Year',
      cell: ({ row }) => `${row.original.from_year} → ${row.original.to_year}`,
    },
    {
      accessorKey: 'processed_at',
      header: 'Processed On',
      cell: ({ row }) =>
        row.original.processed_at ? formatDate(row.original.processed_at) : '—',
    },
  ]

  async function runCarryForward() {
    try {
      await processCarryForward.mutateAsync({ fromYear, toYear: fromYear + 1 })
      toast.success(`Carry forward processed from ${fromYear} to ${fromYear + 1}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Carry forward failed')
    } finally {
      setConfirmProcess(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Blackout periods */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-semibold">
              <CalendarX className="h-4 w-4" /> Blackout Periods
            </h3>
            <p className="text-sm text-muted-foreground">
              Windows where leave cannot be applied for.
            </p>
          </div>
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Add Period
          </Button>
        </div>
        <DataTable
          columns={periodColumns}
          data={(periods ?? []) as LeaveBlackoutPeriod[]}
          isLoading={periodsLoading}
        />
      </section>

      {/* Carry forward */}
      <section>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="h-4 w-4" /> Year-End Carry Forward
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Moves unused balance into the next year for leave types that allow it, capped at each
              type's carry-forward limit. Anything above the cap is recorded as lapsed.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Carry forward from</label>
                <Select
                  value={String(fromYear)}
                  onValueChange={(v) => setFromYear(Number(v))}
                >
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y} → {y + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => setConfirmProcess(true)}
                disabled={processCarryForward.isPending}
              >
                {processCarryForward.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Run Carry Forward
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4">
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">
            Carry forward log — {fromYear} → {fromYear + 1}
          </h4>
          <DataTable
            columns={logColumns}
            data={(logs ?? []) as CarryForwardRow[]}
            isLoading={logsLoading}
          />
        </div>
      </section>

      <BlackoutFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null) }}
        period={editing}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete blackout period"
        description="This blackout period will be removed. Leave applications in that window will no longer be blocked."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          try {
            await deletePeriod.mutateAsync(deleteId!)
            toast.success('Blackout period deleted')
          } catch {
            toast.error('Could not delete the blackout period')
          } finally {
            setDeleteId(null)
          }
        }}
      />

      <ConfirmDialog
        open={confirmProcess}
        onOpenChange={() => setConfirmProcess(false)}
        title={`Run carry forward for ${fromYear}?`}
        description={`Unused balances from ${fromYear} will be carried into ${fromYear + 1}, up to each leave type's limit. Anything above the limit will be marked as lapsed. Check the balances before running this.`}
        confirmLabel="Run carry forward"
        onConfirm={runCarryForward}
      />
    </div>
  )
}

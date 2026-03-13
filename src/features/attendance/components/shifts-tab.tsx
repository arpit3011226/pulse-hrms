import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, Trash2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ShiftFormDialog } from './shift-form-dialog'
import { ShiftRosterDialog } from './shift-roster-dialog'
import { useShifts, useDeleteShift, useShiftRosters, useDeleteShiftRoster } from '../hooks/use-attendance'
import { formatDate } from '@/lib/utils'
import type { Shift, ShiftRosterWithRelations } from '@/types/database.types'
import { toast } from 'sonner'

export function ShiftsTab() {
  const { data: shifts, isLoading: shiftsLoading } = useShifts()
  const deleteShift = useDeleteShift()
  const { data: rosters, isLoading: rostersLoading } = useShiftRosters()
  const deleteRoster = useDeleteShiftRoster()

  const [shiftFormOpen, setShiftFormOpen] = useState(false)
  const [editShift, setEditShift] = useState<Shift | null>(null)
  const [deleteShiftId, setDeleteShiftId] = useState<string | null>(null)
  const [rosterOpen, setRosterOpen] = useState(false)
  const [deleteRosterId, setDeleteRosterId] = useState<string | null>(null)

  const shiftColumns: ColumnDef<Shift>[] = [
    { accessorKey: 'name', header: 'Shift Name', cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    )},
    { accessorKey: 'start_time', header: 'Start Time' },
    { accessorKey: 'end_time', header: 'End Time' },
    { accessorKey: 'grace_period_minutes', header: 'Grace (min)' },
    { id: 'default', header: 'Default', cell: ({ row }) => (
      row.original.is_default ? <StatusBadge status="active" /> : '-'
    )},
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => { setEditShift(row.original); setShiftFormOpen(true) }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteShiftId(row.original.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  const rosterColumns: ColumnDef<ShiftRosterWithRelations>[] = [
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const emp = row.original.employee
        return emp ? `${emp.first_name} ${emp.last_name}` : '-'
      },
    },
    {
      id: 'shift',
      header: 'Shift',
      cell: ({ row }) => {
        const s = row.original.shift
        return s ? `${s.name} (${s.start_time} - ${s.end_time})` : '-'
      },
    },
    { accessorKey: 'start_date', header: 'From', cell: ({ row }) => formatDate(row.original.start_date) },
    { id: 'end_date', header: 'To', cell: ({ row }) => row.original.end_date ? formatDate(row.original.end_date) : 'Ongoing' },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteRosterId(row.original.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-8">
      {/* Shifts Section */}
      <div>
        <DataTable
          columns={shiftColumns}
          data={(shifts || []) as Shift[]}
          isLoading={shiftsLoading}
          searchKey="name"
          searchPlaceholder="Search shifts..."
          toolbarActions={
            <Button onClick={() => { setEditShift(null); setShiftFormOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" /> Add Shift
            </Button>
          }
        />
      </div>

      {/* Shift Rosters Section */}
      <div>
        <h3 className="mb-3 text-base font-semibold">Shift Assignments</h3>
        <DataTable
          columns={rosterColumns}
          data={(rosters || []) as ShiftRosterWithRelations[]}
          isLoading={rostersLoading}
          searchKey="employee"
          searchPlaceholder="Search assignments..."
          toolbarActions={
            <Button onClick={() => setRosterOpen(true)}>
              <Calendar className="mr-2 h-4 w-4" /> Assign Shift
            </Button>
          }
        />
      </div>

      <ShiftFormDialog
        open={shiftFormOpen}
        onOpenChange={(open) => { setShiftFormOpen(open); if (!open) setEditShift(null) }}
        shift={editShift}
      />

      <ShiftRosterDialog open={rosterOpen} onOpenChange={setRosterOpen} />

      <ConfirmDialog
        open={!!deleteShiftId}
        onOpenChange={() => setDeleteShiftId(null)}
        title="Delete Shift"
        description="Are you sure? This will deactivate the shift."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteShift.isPending}
        onConfirm={async () => {
          if (deleteShiftId) {
            try {
              await deleteShift.mutateAsync(deleteShiftId)
              toast.success('Shift deleted')
            } catch {
              toast.error('Failed to delete shift')
            }
            setDeleteShiftId(null)
          }
        }}
      />

      <ConfirmDialog
        open={!!deleteRosterId}
        onOpenChange={() => setDeleteRosterId(null)}
        title="Remove Assignment"
        description="Are you sure you want to remove this shift assignment?"
        confirmLabel="Remove"
        variant="destructive"
        isLoading={deleteRoster.isPending}
        onConfirm={async () => {
          if (deleteRosterId) {
            try {
              await deleteRoster.mutateAsync(deleteRosterId)
              toast.success('Assignment removed')
            } catch {
              toast.error('Failed to remove assignment')
            }
            setDeleteRosterId(null)
          }
        }}
      />
    </div>
  )
}

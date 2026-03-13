import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { HolidayFormDialog } from './holiday-form-dialog'
import { useHolidays, useCreateHoliday, useUpdateHoliday, useDeleteHoliday } from '../hooks/use-leave'
import { usePermissions } from '@/hooks/use-permissions'
import { formatDate } from '@/lib/utils'
import type { Holiday } from '@/types/database.types'
import { toast } from 'sonner'

export function HolidaysTab() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const { data: holidays, isLoading } = useHolidays(selectedYear)
  const createHoliday = useCreateHoliday()
  const updateHoliday = useUpdateHoliday()
  const deleteHoliday = useDeleteHoliday()
  const { canManageLeaveTypes } = usePermissions()
  const [formOpen, setFormOpen] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<Holiday | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const years = Array.from({ length: 3 }, (_, i) => currentYear - 1 + i)

  const columns: ColumnDef<Holiday>[] = [
    {
      accessorKey: 'name',
      header: 'Holiday',
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => {
        const d = new Date(row.original.date)
        const day = d.toLocaleDateString('en-IN', { weekday: 'short' })
        return (
          <div>
            <span>{formatDate(row.original.date)}</span>
            <span className="ml-2 text-xs text-muted-foreground">({day})</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => <StatusBadge status={row.original.type} />,
    },
  ]

  if (canManageLeaveTypes) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setEditingHoliday(row.original); setFormOpen(true) }}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(row.original.id)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    })
  }

  const handleSave = async (data: { name: string; date: string; type: string }) => {
    try {
      if (editingHoliday) {
        await updateHoliday.mutateAsync({ id: editingHoliday.id, ...data })
        toast.success('Holiday updated')
      } else {
        await createHoliday.mutateAsync(data)
        toast.success('Holiday created')
      }
      setFormOpen(false)
      setEditingHoliday(undefined)
    } catch {
      toast.error('Failed to save holiday')
    }
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={(holidays || []) as Holiday[]}
        searchKey="name"
        searchPlaceholder="Search holidays..."
        isLoading={isLoading}
        toolbarActions={
          <div className="flex items-center gap-2">
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canManageLeaveTypes && (
              <Button onClick={() => { setEditingHoliday(undefined); setFormOpen(true) }}>
                <Plus className="mr-2 h-4 w-4" /> Add Holiday
              </Button>
            )}
          </div>
        }
      />

      <HolidayFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingHoliday(undefined) }}
        holiday={editingHoliday}
        onSave={handleSave}
        isLoading={createHoliday.isPending || updateHoliday.isPending}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Holiday"
        description="Are you sure you want to delete this holiday?"
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteHoliday.isPending}
        onConfirm={async () => {
          if (deleteId) {
            try {
              await deleteHoliday.mutateAsync(deleteId)
              toast.success('Holiday deleted')
            } catch {
              toast.error('Failed to delete holiday')
            }
            setDeleteId(null)
          }
        }}
      />
    </>
  )
}

import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable } from '@/components/shared/data-table'
import { PageHeader } from '@/components/layout/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useDesignations,
  useCreateDesignation,
  useUpdateDesignation,
  useDeleteDesignation,
} from '../hooks/use-departments'
import { usePermissions } from '@/hooks/use-permissions'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { Department, Designation } from '@/types/database.types'

export function DepartmentList() {
  const { data: departments, isLoading: deptLoading } = useDepartments()
  const { data: designations, isLoading: desLoading } = useDesignations()
  const permissions = usePermissions()

  const [deptDialog, setDeptDialog] = useState<{ open: boolean; dept?: Department }>({ open: false })
  const [desDialog, setDesDialog] = useState<{ open: boolean; des?: Designation }>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'dept' | 'des'; id: string } | null>(null)

  const createDept = useCreateDepartment()
  const updateDept = useUpdateDepartment()
  const deleteDept = useDeleteDepartment()
  const createDes = useCreateDesignation()
  const updateDes = useUpdateDesignation()
  const deleteDes = useDeleteDesignation()

  const deptColumns: ColumnDef<Department>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'code', header: 'Code', cell: ({ row }) => row.original.code || '-' },
    { accessorKey: 'description', header: 'Description', cell: ({ row }) => row.original.description || '-' },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        if (!permissions.canManageDepartments) return null
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDeptDialog({ open: true, dept: row.original })}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget({ type: 'dept', id: row.original.id })}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const desColumns: ColumnDef<Designation>[] = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'level', header: 'Level', cell: ({ row }) => row.original.level ?? '-' },
    { accessorKey: 'description', header: 'Description', cell: ({ row }) => row.original.description || '-' },
    {
      id: 'actions',
      cell: ({ row }) => {
        if (!permissions.canManageDepartments) return null
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDesDialog({ open: true, des: row.original })}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget({ type: 'des', id: row.original.id })}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div>
      <PageHeader title="Departments & Designations" description="Manage your organizational structure" />

      <Tabs defaultValue="departments">
        <TabsList>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="designations">Designations</TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="mt-6">
          <DataTable
            columns={deptColumns}
            data={departments || []}
            isLoading={deptLoading}
            searchKey="name"
            searchPlaceholder="Search departments..."
            toolbarActions={
              permissions.canManageDepartments ? (
                <Button onClick={() => setDeptDialog({ open: true })}>
                  <Plus className="mr-2 h-4 w-4" /> Add Department
                </Button>
              ) : undefined
            }
          />
        </TabsContent>

        <TabsContent value="designations" className="mt-6">
          <DataTable
            columns={desColumns}
            data={designations || []}
            isLoading={desLoading}
            searchKey="title"
            searchPlaceholder="Search designations..."
            toolbarActions={
              permissions.canManageDepartments ? (
                <Button onClick={() => setDesDialog({ open: true })}>
                  <Plus className="mr-2 h-4 w-4" /> Add Designation
                </Button>
              ) : undefined
            }
          />
        </TabsContent>
      </Tabs>

      {/* Department Dialog */}
      <DepartmentDialog
        open={deptDialog.open}
        department={deptDialog.dept}
        onClose={() => setDeptDialog({ open: false })}
        onSave={async (data) => {
          if (deptDialog.dept) {
            await updateDept.mutateAsync({ id: deptDialog.dept.id, ...data })
            toast.success('Department updated')
          } else {
            await createDept.mutateAsync(data)
            toast.success('Department created')
          }
          setDeptDialog({ open: false })
        }}
        isLoading={createDept.isPending || updateDept.isPending}
      />

      {/* Designation Dialog */}
      <DesignationDialog
        open={desDialog.open}
        designation={desDialog.des}
        onClose={() => setDesDialog({ open: false })}
        onSave={async (data) => {
          if (desDialog.des) {
            await updateDes.mutateAsync({ id: desDialog.des.id, ...data })
            toast.success('Designation updated')
          } else {
            await createDes.mutateAsync(data)
            toast.success('Designation created')
          }
          setDesDialog({ open: false })
        }}
        isLoading={createDes.isPending || updateDes.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.type === 'dept' ? 'Department' : 'Designation'}`}
        description="This will deactivate the item. Existing references will be preserved."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteDept.isPending || deleteDes.isPending}
        onConfirm={() => {
          if (!deleteTarget) return
          const mutate = deleteTarget.type === 'dept' ? deleteDept : deleteDes
          mutate.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success('Deleted successfully')
              setDeleteTarget(null)
            },
          })
        }}
      />
    </div>
  )
}

function DepartmentDialog({
  open,
  department,
  onClose,
  onSave,
  isLoading,
}: {
  open: boolean
  department?: Department
  onClose: () => void
  onSave: (data: Partial<Department>) => Promise<void>
  isLoading: boolean
}) {
  const [name, setName] = useState(department?.name || '')
  const [code, setCode] = useState(department?.code || '')
  const [description, setDescription] = useState(department?.description || '')

  // Reset form when dialog opens with different data
  const handleOpen = (isOpen: boolean) => {
    if (!isOpen) {
      onClose()
      setName('')
      setCode('')
      setDescription('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{department ? 'Edit Department' : 'Add Department'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Engineering" />
          </div>
          <div className="space-y-2">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ENG" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)}>Cancel</Button>
          <Button
            disabled={!name || isLoading}
            onClick={() => onSave({ name, code: code || null, description: description || null })}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {department ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DesignationDialog({
  open,
  designation,
  onClose,
  onSave,
  isLoading,
}: {
  open: boolean
  designation?: Designation
  onClose: () => void
  onSave: (data: Partial<Designation>) => Promise<void>
  isLoading: boolean
}) {
  const [title, setTitle] = useState(designation?.title || '')
  const [level, setLevel] = useState(designation?.level?.toString() || '')
  const [description, setDescription] = useState(designation?.description || '')

  const handleOpen = (isOpen: boolean) => {
    if (!isOpen) {
      onClose()
      setTitle('')
      setLevel('')
      setDescription('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{designation ? 'Edit Designation' : 'Add Designation'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Engineer" />
          </div>
          <div className="space-y-2">
            <Label>Level</Label>
            <Input type="number" value={level} onChange={(e) => setLevel(e.target.value)} placeholder="1" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)}>Cancel</Button>
          <Button
            disabled={!title || isLoading}
            onClick={() => onSave({ title, level: level ? parseInt(level) : null, description: description || null })}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {designation ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

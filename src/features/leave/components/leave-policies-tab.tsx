import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus, Pencil, Trash2, ChevronDown, ChevronRight, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable } from '@/components/shared/data-table'
import { AssignLeavePolicyDialog } from './assign-leave-policy-dialog'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { LeaveTypeFormDialog } from './leave-type-form-dialog'
import { LeavePolicyFormDialog } from './leave-policy-form-dialog'
import {
  useLeaveTypes,
  useCreateLeaveType,
  useUpdateLeaveType,
  useDeleteLeaveType,
  useLeavePolicies,
  useDeleteLeavePolicy,
} from '../hooks/use-leave'
import { usePermissions } from '@/hooks/use-permissions'
import type { LeaveType, LeavePolicyWithDetails } from '@/types/database.types'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ACCRUAL_TYPES } from '@/lib/constants'

export function LeavePoliciesTab() {
  const { canManageLeaveTypes } = usePermissions()

  return (
    <Tabs defaultValue="leave-types" className="space-y-4">
      <TabsList>
        <TabsTrigger value="leave-types">Leave Types</TabsTrigger>
        <TabsTrigger value="policies">Policies</TabsTrigger>
      </TabsList>
      <TabsContent value="leave-types">
        <LeaveTypesSection canManage={canManageLeaveTypes} />
      </TabsContent>
      <TabsContent value="policies">
        <PoliciesSection canManage={canManageLeaveTypes} />
      </TabsContent>
    </Tabs>
  )
}

function LeaveTypesSection({ canManage }: { canManage: boolean }) {
  const { data: leaveTypes, isLoading } = useLeaveTypes()
  const createLeaveType = useCreateLeaveType()
  const updateLeaveType = useUpdateLeaveType()
  const deleteLeaveType = useDeleteLeaveType()
  const [formOpen, setFormOpen] = useState(false)
  const [editingType, setEditingType] = useState<LeaveType | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const columns: ColumnDef<LeaveType>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          {row.original.description && (
            <p className="text-xs text-muted-foreground">{row.original.description}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => row.original.code || '-',
    },
    {
      accessorKey: 'default_days',
      header: 'Default Days',
    },
    {
      id: 'flags',
      header: 'Properties',
      cell: ({ row }) => {
        const lt = row.original
        return (
          <div className="flex flex-wrap gap-1">
            {lt.is_paid && <Badge variant="outline" className="text-xs">Paid</Badge>}
            {!lt.is_paid && <Badge variant="outline" className="text-xs">Unpaid</Badge>}
            {lt.is_carry_forward && <Badge variant="outline" className="text-xs">Carry Forward</Badge>}
            {lt.document_required_flag && <Badge variant="outline" className="text-xs">Doc Required</Badge>}
            {lt.gender_specific_flag && <Badge variant="outline" className="text-xs">{lt.applicable_gender}</Badge>}
          </div>
        )
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.is_active ? 'active' : 'terminated'} />,
    },
  ]

  if (canManage) {
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
            <DropdownMenuItem onClick={() => { setEditingType(row.original); setFormOpen(true) }}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(row.original.id)}>
              <Trash2 className="mr-2 h-4 w-4" /> Deactivate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    })
  }

  const handleSave = async (data: Record<string, unknown>) => {
    try {
      if (editingType) {
        await updateLeaveType.mutateAsync({ id: editingType.id, ...data } as Partial<LeaveType> & { id: string })
        toast.success('Leave type updated')
      } else {
        await createLeaveType.mutateAsync(data as Partial<LeaveType>)
        toast.success('Leave type created')
      }
      setFormOpen(false)
      setEditingType(undefined)
    } catch {
      toast.error('Failed to save leave type')
    }
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={(leaveTypes || []) as LeaveType[]}
        searchKey="name"
        searchPlaceholder="Search leave types..."
        isLoading={isLoading}
        toolbarActions={
          canManage && (
            <Button onClick={() => { setEditingType(undefined); setFormOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" /> Add Leave Type
            </Button>
          )
        }
      />

      <LeaveTypeFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingType(undefined) }}
        leaveType={editingType}
        onSave={handleSave}
        isLoading={createLeaveType.isPending || updateLeaveType.isPending}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Deactivate Leave Type"
        description="This will deactivate the leave type. Existing leave balances will not be affected."
        confirmLabel="Deactivate"
        variant="destructive"
        isLoading={deleteLeaveType.isPending}
        onConfirm={async () => {
          if (deleteId) {
            try {
              await deleteLeaveType.mutateAsync(deleteId)
              toast.success('Leave type deactivated')
            } catch {
              toast.error('Failed to deactivate leave type')
            }
            setDeleteId(null)
          }
        }}
      />
    </>
  )
}

function PoliciesSection({ canManage }: { canManage: boolean }) {
  const { data: policies, isLoading } = useLeavePolicies()
  const deletePolicy = useDeleteLeavePolicy()
  const [formOpen, setFormOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicyWithDetails | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [assignPolicy, setAssignPolicy] = useState<LeavePolicyWithDetails | null>(null)

  const columns: ColumnDef<LeavePolicyWithDetails>[] = [
    {
      id: 'expand',
      cell: ({ row }) => {
        const isExpanded = expandedId === row.original.id
        return (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setExpandedId(isExpanded ? null : row.original.id)}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        )
      },
    },
    {
      accessorKey: 'policy_name',
      header: 'Policy Name',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.policy_name}</p>
          {row.original.description && (
            <p className="text-xs text-muted-foreground">{row.original.description}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'policy_code',
      header: 'Code',
      cell: ({ row }) => row.original.policy_code || '-',
    },
    {
      id: 'leave_types_count',
      header: 'Leave Types',
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.leave_policy_details?.length || 0} types</Badge>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.is_active ? 'active' : 'terminated'} />,
    },
  ]

  if (canManage) {
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
            <DropdownMenuItem onClick={() => setAssignPolicy(row.original)}>
              <Users className="mr-2 h-4 w-4" /> Assign to Employees
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setEditingPolicy(row.original); setFormOpen(true) }}>
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

  return (
    <>
      <DataTable
        columns={columns}
        data={(policies || []) as LeavePolicyWithDetails[]}
        searchKey="policy_name"
        searchPlaceholder="Search policies..."
        isLoading={isLoading}
        toolbarActions={
          canManage && (
            <Button onClick={() => { setEditingPolicy(undefined); setFormOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" /> Add Policy
            </Button>
          )
        }
      />

      <AssignLeavePolicyDialog
        open={!!assignPolicy}
        onOpenChange={(open) => !open && setAssignPolicy(null)}
        policy={assignPolicy}
      />

      {/* Expanded policy details */}
      {expandedId && policies && (
        <PolicyDetails policy={(policies as LeavePolicyWithDetails[]).find((p) => p.id === expandedId)} />
      )}

      <LeavePolicyFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingPolicy(undefined) }}
        policy={editingPolicy}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Policy"
        description="This will permanently delete the policy and its rules. Employees assigned this policy will need to be reassigned."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deletePolicy.isPending}
        onConfirm={async () => {
          if (deleteId) {
            try {
              await deletePolicy.mutateAsync(deleteId)
              toast.success('Policy deleted')
            } catch {
              toast.error('Failed to delete policy')
            }
            setDeleteId(null)
          }
        }}
      />
    </>
  )
}

function PolicyDetails({ policy }: { policy?: LeavePolicyWithDetails }) {
  if (!policy?.leave_policy_details?.length) {
    return (
      <Card className="mt-4">
        <CardContent className="py-6 text-center text-muted-foreground">
          No leave type rules configured for this policy.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm">Policy Rules: {policy.policy_name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {policy.leave_policy_details.map((detail) => (
            <Card key={detail.id} className="border bg-muted/30">
              <CardContent className="p-4 space-y-2">
                <p className="font-medium text-sm">{detail.leave_type?.name || 'Unknown Type'}</p>
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <span>Entitled:</span>
                  <span className="font-medium text-foreground">{detail.entitled_days} days</span>
                  <span>Accrual:</span>
                  <span className="font-medium text-foreground capitalize">
                    {ACCRUAL_TYPES.find((a) => a.value === detail.accrual_type)?.label || detail.accrual_type}
                  </span>
                  {detail.allow_half_day && (
                    <>
                      <span>Half Day:</span>
                      <span className="font-medium text-foreground">Allowed</span>
                    </>
                  )}
                  {detail.allow_carry_forward && (
                    <>
                      <span>Carry Forward:</span>
                      <span className="font-medium text-foreground">Max {detail.max_carry_forward_days} days</span>
                    </>
                  )}
                  {detail.max_consecutive_days && (
                    <>
                      <span>Max Consecutive:</span>
                      <span className="font-medium text-foreground">{detail.max_consecutive_days} days</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

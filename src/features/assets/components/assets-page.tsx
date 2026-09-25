import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import {
  ArrowLeftRight, Laptop, Loader2, PackageCheck, Plus, Trash2, Undo2,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { getCurrentEmployee } from '@/features/attendance/api/attendance.api'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import {
  useAssets, useAssetAssignments, useCreateAsset, useDeleteAsset,
  useAssignAsset, useReturnAsset, useUpdateAsset,
} from '../hooks/use-assets'
import {
  ASSET_TYPES, ASSET_TYPE_LABELS,
  type Asset, type AssetAssignment, type AssetCondition,
} from '../api/assets.api'
import { generateNextAssetCode } from '../api/assets.api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

const CONDITIONS: AssetCondition[] = ['new', 'good', 'fair', 'poor', 'damaged']

const STATUS_STYLES: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-800',
  assigned: 'bg-blue-100 text-blue-800',
  in_repair: 'bg-amber-100 text-amber-800',
  retired: 'bg-gray-100 text-gray-700',
  lost: 'bg-rose-100 text-rose-800',
}

export function AssetsPage() {
  const { profile, organization } = useAuth()
  const { isAdmin, isHR } = usePermissions()
  const canManage = isAdmin || isHR

  const { data: me } = useQuery({
    queryKey: ['current-employee', profile?.id],
    queryFn: () => getCurrentEmployee(profile!.id),
    enabled: !!profile?.id,
  })

  const { data: assets, isLoading } = useAssets()
  const { data: assignments, isLoading: assignLoading } = useAssetAssignments()
  const { data: employees } = useEmployees()
  const createAsset = useCreateAsset()
  const deleteAsset = useDeleteAsset()
  const assignAsset = useAssignAsset()
  const returnAsset = useReturnAsset()
  const updateAsset = useUpdateAsset()

  const [assetFormOpen, setAssetFormOpen] = useState(false)
  const [assignTarget, setAssignTarget] = useState<Asset | null>(null)
  const [returnTarget, setReturnTarget] = useState<AssetAssignment | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // asset form
  const [code, setCode] = useState('')
  const [assetType, setAssetType] = useState('laptop')
  const [name, setName] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [serial, setSerial] = useState('')
  const [cost, setCost] = useState('')

  // assign form
  const [assignEmployee, setAssignEmployee] = useState('')
  const [assignDate, setAssignDate] = useState('')
  const [assignNotes, setAssignNotes] = useState('')

  // return form
  const [returnDate, setReturnDate] = useState('')
  const [returnCondition, setReturnCondition] = useState<AssetCondition>('good')
  const [returnNotes, setReturnNotes] = useState('')

  useEffect(() => {
    if (!assetFormOpen) return
    setAssetType('laptop'); setName(''); setMake(''); setModel(''); setSerial(''); setCost('')
    if (organization?.id) generateNextAssetCode(organization.id).then(setCode).catch(() => setCode(''))
  }, [assetFormOpen, organization?.id])

  useEffect(() => {
    if (!assignTarget) return
    setAssignEmployee(''); setAssignNotes('')
    setAssignDate(new Date().toISOString().split('T')[0])
  }, [assignTarget])

  useEffect(() => {
    if (!returnTarget) return
    setReturnCondition('good'); setReturnNotes('')
    setReturnDate(new Date().toISOString().split('T')[0])
  }, [returnTarget])

  const assetRows = assets ?? []
  const assignRows = assignments ?? []
  const openAssignments = assignRows.filter((a) => a.status === 'assigned' || a.status === 'pending_return')

  async function handleCreateAsset() {
    setSaving(true)
    try {
      await createAsset.mutateAsync({
        asset_code: code.trim(),
        asset_type: assetType,
        name: name.trim(),
        make: make.trim() || null,
        model: model.trim() || null,
        serial_number: serial.trim() || null,
        purchase_cost: cost ? Number(cost) : null,
        status: 'available',
      })
      toast.success('Asset added')
      setAssetFormOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add the asset')
    } finally {
      setSaving(false)
    }
  }

  async function handleAssign() {
    if (!assignTarget) return
    setSaving(true)
    try {
      await assignAsset.mutateAsync({
        asset_id: assignTarget.id,
        employee_id: assignEmployee,
        assigned_on: assignDate,
        assigned_by: me?.id ?? null,
        assignment_notes: assignNotes.trim() || null,
      })
      toast.success('Asset issued')
      setAssignTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not issue the asset')
    } finally {
      setSaving(false)
    }
  }

  async function handleReturn() {
    if (!returnTarget) return
    setSaving(true)
    try {
      await returnAsset.mutateAsync({
        assignmentId: returnTarget.id,
        returnedOn: returnDate,
        returnCondition,
        returnNotes: returnNotes.trim() || null,
        returnedTo: me?.id ?? null,
      })
      toast.success('Asset returned')
      setReturnTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not record the return')
    } finally {
      setSaving(false)
    }
  }

  const assetColumns: ColumnDef<Asset>[] = [
    { accessorKey: 'asset_code', header: 'Code' },
    {
      id: 'asset',
      header: 'Asset',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">
            {ASSET_TYPE_LABELS[row.original.asset_type] ?? row.original.asset_type}
            {row.original.make ? ` · ${row.original.make}` : ''}
            {row.original.model ? ` ${row.original.model}` : ''}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'serial_number',
      header: 'Serial',
      cell: ({ row }) => row.original.serial_number ?? '—',
    },
    {
      accessorKey: 'purchase_cost',
      header: 'Cost',
      cell: ({ row }) =>
        row.original.purchase_cost != null ? formatCurrency(row.original.purchase_cost) : '—',
    },
    {
      id: 'holder',
      header: 'Held By',
      cell: ({ row }) => {
        const open = openAssignments.find((a) => a.asset_id === row.original.id)
        return open?.employee ? (
          <span>
            {open.employee.first_name} {open.employee.last_name}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const a = row.original
        const held = openAssignments.some((x) => x.asset_id === a.id)
        // Only a free asset can be moved to repair, retired or lost — an asset
        // someone is holding has to come back first.
        if (!canManage || held) {
          return (
            <Badge className={STATUS_STYLES[a.status] ?? ''}>
              {a.status.replace('_', ' ')}
            </Badge>
          )
        }
        return (
          <Select
            value={a.status}
            onValueChange={async (v) => {
              try {
                await updateAsset.mutateAsync({ id: a.id, status: v as Asset['status'] })
                toast.success('Asset updated')
              } catch {
                toast.error('Could not update the asset')
              }
            }}
          >
            <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="in_repair">In repair</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        if (!canManage) return null
        const open = openAssignments.find((a) => a.asset_id === row.original.id)
        return (
          <div className="flex items-center gap-1">
            {open ? (
              <Button variant="outline" size="sm" onClick={() => setReturnTarget(open)}>
                <Undo2 className="mr-1.5 h-3.5 w-3.5" /> Return
              </Button>
            ) : row.original.status === 'available' ? (
              <Button variant="outline" size="sm" onClick={() => setAssignTarget(row.original)}>
                <ArrowLeftRight className="mr-1.5 h-3.5 w-3.5" /> Issue
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => setDeleteId(row.original.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ]

  const assignmentColumns: ColumnDef<AssetAssignment>[] = [
    {
      id: 'asset',
      header: 'Asset',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.asset?.name ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{row.original.asset?.asset_code ?? ''}</p>
        </div>
      ),
    },
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const e = row.original.employee
        return e ? `${e.first_name} ${e.last_name}` : '—'
      },
    },
    {
      accessorKey: 'assigned_on',
      header: 'Issued',
      cell: ({ row }) => formatDate(row.original.assigned_on),
    },
    {
      accessorKey: 'returned_on',
      header: 'Returned',
      cell: ({ row }) =>
        row.original.returned_on ? formatDate(row.original.returned_on) : '—',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status
        return s === 'returned' ? (
          <Badge className="bg-emerald-100 text-emerald-800">Returned</Badge>
        ) : s === 'pending_return' ? (
          <Badge className="bg-amber-100 text-amber-800">Awaiting return</Badge>
        ) : s === 'not_returned' ? (
          <Badge className="bg-rose-100 text-rose-800">Not returned</Badge>
        ) : (
          <Badge className="bg-blue-100 text-blue-800">With employee</Badge>
        )
      },
    },
  ]

  return (
    <div>
      <PageHeader
        title="Assets"
        description="What the company owns, who is holding it, and what is still to come back."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-blue-50 p-2.5">
              <Laptop className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold leading-none">{assetRows.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Total assets</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-emerald-50 p-2.5">
              <PackageCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold leading-none">
                {assetRows.filter((a) => a.status === 'available').length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Available</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-amber-50 p-2.5">
              <Undo2 className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold leading-none">
                {assignRows.filter((a) => a.status === 'pending_return').length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Awaiting return</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="assets">
        <TabsList>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="history">Assignment History</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="mt-6">
          <DataTable
            columns={assetColumns}
            data={assetRows}
            isLoading={isLoading}
            searchKey="asset_code"
            searchPlaceholder="Search by code…"
            toolbarActions={
              canManage && (
                <Button onClick={() => setAssetFormOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add asset
                </Button>
              )
            }
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <DataTable columns={assignmentColumns} data={assignRows} isLoading={assignLoading} />
        </TabsContent>
      </Tabs>

      {/* Add asset */}
      <Dialog open={assetFormOpen} onOpenChange={setAssetFormOpen}>
        <DialogContent size="page">
          <DialogHeader>
            <DialogTitle>Add asset</DialogTitle>
            <DialogDescription>Record something the company owns and can issue.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Asset code</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Type *</Label>
                <Select value={assetType} onValueChange={setAssetType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{ASSET_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                placeholder="e.g. MacBook Pro 14"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Make</Label>
                <Input value={make} onChange={(e) => setMake(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Model</Label>
                <Input value={model} onChange={(e) => setModel(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Serial number</Label>
                <Input value={serial} onChange={(e) => setSerial(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Cost (₹)</Label>
                <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssetFormOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateAsset} disabled={!name.trim() || !code.trim() || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue */}
      <Dialog open={!!assignTarget} onOpenChange={(open) => !open && setAssignTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue {assignTarget?.name}</DialogTitle>
            <DialogDescription>{assignTarget?.asset_code}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Issue to *</Label>
              <Select value={assignEmployee} onValueChange={setAssignEmployee}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {(employees ?? [])
                    .filter((e) => e.status === 'active')
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.first_name} {e.last_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Issued on *</Label>
              <Input type="date" value={assignDate} onChange={(e) => setAssignDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTarget(null)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!assignEmployee || !assignDate || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Issue asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return */}
      <Dialog open={!!returnTarget} onOpenChange={(open) => !open && setReturnTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record return</DialogTitle>
            <DialogDescription>
              {returnTarget?.asset?.name} from {returnTarget?.employee?.first_name}{' '}
              {returnTarget?.employee?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Returned on *</Label>
                <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Condition</Label>
                <Select
                  value={returnCondition}
                  onValueChange={(v) => setReturnCondition(v as AssetCondition)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                placeholder="Any damage or missing accessories"
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnTarget(null)}>Cancel</Button>
            <Button onClick={handleReturn} disabled={!returnDate || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete asset"
        description="The asset and its full assignment history will be removed. If it is currently issued, record the return instead."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          try {
            await deleteAsset.mutateAsync(deleteId!)
            toast.success('Asset deleted')
          } catch {
            toast.error('Could not delete the asset')
          } finally {
            setDeleteId(null)
          }
        }}
      />
    </div>
  )
}

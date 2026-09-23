import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import {
  BadgeCheck, BadgeX, Banknote, Loader2, Plus, Search, UserRoundCheck, Users,
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
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { getCurrentEmployee } from '@/features/attendance/api/attendance.api'
import { SettlementDialog } from './settlement-dialog'
import {
  useSettlements, useSetSettlementStatus, useAlumni, useExitRecords,
  useSetRehireEligibility, useMarkAsAlumni,
} from '../hooks/use-alumni'
import type { FinalSettlement } from '../api/alumni.api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

const SETTLEMENT_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800',
  paid: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-gray-100 text-gray-500',
}

export function AlumniPage() {
  const { profile } = useAuth()
  const { isAdmin, isHR, isPayrollAdmin } = usePermissions()
  const canManage = isAdmin || isHR || isPayrollAdmin

  const { data: me } = useQuery({
    queryKey: ['current-employee', profile?.id],
    queryFn: () => getCurrentEmployee(profile!.id),
    enabled: !!profile?.id,
  })

  const { data: settlements, isLoading: sLoading } = useSettlements()
  const { data: alumni, isLoading: aLoading } = useAlumni()
  const { data: exitRecords } = useExitRecords()
  const setStatus = useSetSettlementStatus()
  const setRehire = useSetRehireEligibility()
  const markAlumni = useMarkAsAlumni()

  const [settlementOpen, setSettlementOpen] = useState(false)
  const [editing, setEditing] = useState<FinalSettlement | null>(null)
  const [statusTarget, setStatusTarget] = useState<{ s: FinalSettlement; to: string } | null>(null)
  const [rehireTarget, setRehireTarget] = useState<Record<string, unknown> | null>(null)
  const [rehireEligible, setRehireEligible] = useState(true)
  const [rehireNotes, setRehireNotes] = useState('')
  const [search, setSearch] = useState('')

  const sRows = settlements ?? []
  const exitByEmployee = useMemo(() => {
    const m = new Map<string, Record<string, unknown>>()
    for (const r of (exitRecords ?? []) as Array<Record<string, unknown>>) {
      m.set(r.employee_id as string, r)
    }
    return m
  }, [exitRecords])

  const alumniRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return ((alumni ?? []) as Array<Record<string, unknown>>).filter((a) => {
      if (!q) return true
      return (
        `${a.first_name} ${a.last_name}`.toLowerCase().includes(q) ||
        String(a.employee_code ?? '').toLowerCase().includes(q)
      )
    })
  }, [alumni, search])

  const pendingPay = sRows.filter((s) => s.status === 'approved').length

  const settlementColumns: ColumnDef<FinalSettlement>[] = [
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const e = row.original.employee
        return (
          <div>
            <p className="font-medium">{e ? `${e.first_name} ${e.last_name}` : '—'}</p>
            <p className="text-xs text-muted-foreground">{e?.employee_code ?? '—'}</p>
          </div>
        )
      },
    },
    {
      accessorKey: 'last_working_date',
      header: 'Last Working Day',
      cell: ({ row }) => formatDate(row.original.last_working_date),
    },
    {
      accessorKey: 'net_payable',
      header: 'Net',
      cell: ({ row }) => {
        const n = row.original.net_payable ?? 0
        return (
          <span className={n < 0 ? 'font-medium text-rose-600' : 'font-medium'}>
            {n < 0 ? '−' : ''}{formatCurrency(Math.abs(n))}
          </span>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={SETTLEMENT_STYLES[row.original.status] ?? ''}>
          {row.original.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        if (!canManage) return null
        const s = row.original
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => { setEditing(s); setSettlementOpen(true) }}>
              Edit
            </Button>
            {s.status === 'draft' && (
              <Button variant="outline" size="sm" onClick={() => setStatusTarget({ s, to: 'pending_approval' })}>
                Submit
              </Button>
            )}
            {s.status === 'pending_approval' && (
              <Button variant="outline" size="sm" onClick={() => setStatusTarget({ s, to: 'approved' })}>
                Approve
              </Button>
            )}
            {s.status === 'approved' && (
              <Button size="sm" onClick={() => setStatusTarget({ s, to: 'paid' })}>
                Mark paid
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  const alumniColumns: ColumnDef<Record<string, unknown>>[] = [
    {
      id: 'person',
      header: 'Alumnus',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">
            {row.original.first_name as string} {row.original.last_name as string}
          </p>
          <p className="text-xs text-muted-foreground">
            {(row.original.personal_email as string) ?? (row.original.email as string) ?? '—'}
          </p>
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Was',
      cell: ({ row }) => {
        const d = row.original.designation as Record<string, unknown> | null
        const dept = row.original.department as Record<string, unknown> | null
        return (
          <div className="text-sm">
            <p>{(d?.title as string) ?? '—'}</p>
            <p className="text-xs text-muted-foreground">{(dept?.name as string) ?? '—'}</p>
          </div>
        )
      },
    },
    {
      id: 'tenure',
      header: 'Tenure',
      cell: ({ row }) => {
        const joined = row.original.date_of_joining as string | null
        const exit = exitByEmployee.get(row.original.id as string)
        const left = exit?.last_working_date as string | undefined
        if (!joined) return '—'
        return (
          <span className="text-sm">
            {formatDate(joined)} – {left ? formatDate(left) : '—'}
          </span>
        )
      },
    },
    {
      id: 'rehire',
      header: 'Rehire',
      cell: ({ row }) => {
        const exit = exitByEmployee.get(row.original.id as string)
        const eligible = exit?.rehire_eligible as boolean | null | undefined
        if (eligible == null) return <Badge variant="outline">Not set</Badge>
        return eligible ? (
          <Badge className="bg-emerald-100 text-emerald-800">Eligible</Badge>
        ) : (
          <Badge className="bg-rose-100 text-rose-800">Not eligible</Badge>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        if (!canManage) return null
        const exit = exitByEmployee.get(row.original.id as string)
        return (
          <div className="flex items-center gap-1">
            {exit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRehireTarget({ ...row.original, exitRecordId: exit.id })
                  setRehireEligible((exit.rehire_eligible as boolean) ?? true)
                  setRehireNotes((exit.rehire_notes as string) ?? '')
                }}
              >
                Rehire flag
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await markAlumni.mutateAsync(row.original.id as string)
                  toast.success('Alumni access granted')
                } catch {
                  toast.error('Could not grant alumni access')
                }
              }}
            >
              <UserRoundCheck className="mr-1.5 h-3.5 w-3.5" /> Grant access
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <PageHeader
        title="Alumni"
        description="Settlements, rehire eligibility, and keeping ex-employees' documents reachable."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-violet-50 p-2.5">
              <Users className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold leading-none">{(alumni ?? []).length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Alumni</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-amber-50 p-2.5">
              <Banknote className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold leading-none">{pendingPay}</p>
              <p className="mt-1 text-xs text-muted-foreground">Settlements awaiting payment</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-emerald-50 p-2.5">
              <BadgeCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold leading-none">
                {((exitRecords ?? []) as Array<Record<string, unknown>>).filter(
                  (r) => r.rehire_eligible === true
                ).length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Would rehire</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="settlements">
        <TabsList>
          <TabsTrigger value="settlements">Settlements</TabsTrigger>
          <TabsTrigger value="directory">Directory</TabsTrigger>
        </TabsList>

        <TabsContent value="settlements" className="mt-6">
          {!sLoading && sRows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 rounded-full bg-amber-50 p-3">
                  <Banknote className="h-6 w-6 text-amber-600" />
                </div>
                <p className="font-medium">No settlements yet</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  A settlement records what a leaver is owed, what is recovered, and what is
                  finally paid.
                </p>
                {canManage && (
                  <Button className="mt-4" onClick={() => { setEditing(null); setSettlementOpen(true) }}>
                    <Plus className="mr-2 h-4 w-4" /> New settlement
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <DataTable
              columns={settlementColumns}
              data={sRows}
              isLoading={sLoading}
              toolbarActions={
                canManage && (
                  <Button onClick={() => { setEditing(null); setSettlementOpen(true) }}>
                    <Plus className="mr-2 h-4 w-4" /> New settlement
                  </Button>
                )
              }
            />
          )}
        </TabsContent>

        <TabsContent value="directory" className="mt-6 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search alumni"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {!aLoading && alumniRows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 rounded-full bg-violet-50 p-3">
                  <Users className="h-6 w-6 text-violet-600" />
                </div>
                <p className="font-medium">No alumni yet</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  People appear here once their employment ends. Granting alumni access lets them
                  sign in with their personal email to fetch their own payslips and letters.
                </p>
              </CardContent>
            </Card>
          ) : (
            <DataTable columns={alumniColumns} data={alumniRows} isLoading={aLoading} />
          )}
        </TabsContent>
      </Tabs>

      <SettlementDialog
        open={settlementOpen}
        onOpenChange={(o) => { setSettlementOpen(o); if (!o) setEditing(null) }}
        settlement={editing}
      />

      <ConfirmDialog
        open={!!statusTarget}
        onOpenChange={() => setStatusTarget(null)}
        title={
          statusTarget?.to === 'paid' ? 'Mark settlement as paid'
          : statusTarget?.to === 'approved' ? 'Approve settlement'
          : 'Submit for approval'
        }
        description={
          statusTarget?.to === 'paid'
            ? 'Record that the money has gone out. This cannot be undone from here.'
            : statusTarget?.to === 'approved'
            ? 'The amount becomes final and can be paid.'
            : 'The settlement goes to an approver and can no longer be edited freely.'
        }
        confirmLabel="Confirm"
        onConfirm={async () => {
          if (!statusTarget) return
          try {
            await setStatus.mutateAsync({
              id: statusTarget.s.id,
              status: statusTarget.to as FinalSettlement['status'],
              approvedBy: me?.id ?? null,
              paidOn: statusTarget.to === 'paid' ? new Date().toISOString().split('T')[0] : null,
            })
            toast.success('Settlement updated')
          } catch {
            toast.error('Could not update the settlement')
          } finally {
            setStatusTarget(null)
          }
        }}
      />

      <Dialog open={!!rehireTarget} onOpenChange={(o) => !o && setRehireTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rehire eligibility</DialogTitle>
            <DialogDescription>
              Would you take this person back? Recording it now is far more reliable than trying to
              remember in two years.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="flex gap-2">
              <Button
                variant={rehireEligible ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setRehireEligible(true)}
              >
                <BadgeCheck className="mr-2 h-4 w-4" /> Would rehire
              </Button>
              <Button
                variant={!rehireEligible ? 'destructive' : 'outline'}
                className="flex-1"
                onClick={() => setRehireEligible(false)}
              >
                <BadgeX className="mr-2 h-4 w-4" /> Would not
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={rehireNotes} onChange={(e) => setRehireNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRehireTarget(null)}>Cancel</Button>
            <Button
              onClick={async () => {
                try {
                  await setRehire.mutateAsync({
                    exitRecordId: rehireTarget!.exitRecordId as string,
                    eligible: rehireEligible,
                    notes: rehireNotes.trim() || null,
                  })
                  toast.success('Saved')
                  setRehireTarget(null)
                } catch {
                  toast.error('Could not save')
                }
              }}
            >
              {setRehire.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

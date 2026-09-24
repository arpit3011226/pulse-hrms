import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import {
  AlertTriangle, ArrowUpCircle, Clock, LifeBuoy, Loader2, Plus, Send, Ticket,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/shared/data-table'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { getCurrentEmployee } from '@/features/attendance/api/attendance.api'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import {
  useHelpdeskCategories, useCreateHelpdeskCategory, useTickets, useRaiseTicket,
  useUpdateTicket, useEscalateTicket, useTicketComments, useAddTicketComment,
} from '../hooks/use-helpdesk'
import {
  TICKET_PRIORITIES, TICKET_STATUSES, isOverdue,
  type HelpdeskTicket, type TicketPriority, type TicketStatus,
} from '../api/helpdesk.api'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-amber-100 text-amber-800',
  urgent: 'bg-rose-100 text-rose-800',
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-violet-100 text-violet-800',
  waiting_on_employee: 'bg-amber-100 text-amber-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-gray-100 text-gray-500',
}

export function HelpdeskPage() {
  const { profile, organization } = useAuth()
  const { isAdmin, isHR } = usePermissions()
  const canManage = isAdmin || isHR

  const { data: me } = useQuery({
    queryKey: ['current-employee', profile?.id],
    queryFn: () => getCurrentEmployee(profile!.id),
    enabled: !!profile?.id,
  })
  const myId = me?.id as string | undefined

  const { data: tickets, isLoading } = useTickets()
  const { data: categories } = useHelpdeskCategories()
  const { data: employees } = useEmployees()
  const raiseTicket = useRaiseTicket()
  const updateTicket = useUpdateTicket()
  const escalate = useEscalateTicket()
  const createCategory = useCreateHelpdeskCategory()

  const [raiseOpen, setRaiseOpen] = useState(false)
  const [detail, setDetail] = useState<HelpdeskTicket | null>(null)
  const [catOpen, setCatOpen] = useState(false)

  // raise form
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [saving, setSaving] = useState(false)

  // category form
  const [catName, setCatName] = useState('')
  const [catAssignee, setCatAssignee] = useState('')
  const [respSla, setRespSla] = useState('24')
  const [resSla, setResSla] = useState('72')

  useEffect(() => {
    if (!raiseOpen) return
    setSubject(''); setDescription(''); setCategoryId(''); setPriority('medium')
  }, [raiseOpen])

  useEffect(() => {
    if (!catOpen) return
    setCatName(''); setCatAssignee(''); setRespSla('24'); setResSla('72')
  }, [catOpen])

  // Memoised: a fresh [] each render would invalidate the lists built from it.
  const all = useMemo(() => tickets ?? [], [tickets])
  const mine = useMemo(() => all.filter((t) => t.raised_by === myId), [all, myId])
  const assigned = useMemo(() => all.filter((t) => t.assigned_to === myId), [all, myId])
  const openOverdue = all.filter(isOverdue).length

  async function handleRaise() {
    if (!myId) return
    setSaving(true)
    try {
      await raiseTicket.mutateAsync({
        raisedBy: myId,
        categoryId: categoryId || null,
        subject: subject.trim(),
        description: description.trim() || null,
        priority,
      })
      toast.success('Ticket raised')
      setRaiseOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not raise the ticket')
    } finally {
      setSaving(false)
    }
  }

  function columns(showRaiser: boolean): ColumnDef<HelpdeskTicket>[] {
    const cols: ColumnDef<HelpdeskTicket>[] = [
      { accessorKey: 'ticket_number', header: 'No.' },
      {
        id: 'subject',
        header: 'Subject',
        cell: ({ row }) => (
          <div className="max-w-xs">
            <p className="truncate font-medium">{row.original.subject}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.category?.name ?? 'Uncategorised'}
            </p>
          </div>
        ),
      },
    ]
    if (showRaiser) {
      cols.push({
        id: 'raiser',
        header: 'Raised By',
        cell: ({ row }) => {
          const r = row.original.raiser
          return r ? `${r.first_name} ${r.last_name}` : '—'
        },
      })
    }
    cols.push(
      {
        id: 'assignee',
        header: 'Assigned To',
        cell: ({ row }) => {
          const a = row.original.assignee
          return a ? `${a.first_name} ${a.last_name}` : <span className="text-muted-foreground">Unassigned</span>
        },
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ row }) => (
          <Badge className={PRIORITY_STYLES[row.original.priority]}>{row.original.priority}</Badge>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <Badge className={STATUS_STYLES[row.original.status]}>
              {row.original.status.replace(/_/g, ' ')}
            </Badge>
            {isOverdue(row.original) && (
              <Badge className="bg-rose-100 text-rose-800">
                <AlertTriangle className="mr-1 h-3 w-3" /> Overdue
              </Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'created_at',
        header: 'Raised',
        cell: ({ row }) => formatDate(row.original.created_at),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <Button variant="outline" size="sm" onClick={() => setDetail(row.original)}>
            Open
          </Button>
        ),
      }
    )
    return cols
  }

  const liveDetail = detail ? all.find((t) => t.id === detail.id) ?? detail : null

  return (
    <div>
      <PageHeader
        title="Helpdesk"
        description="Raise a request with HR and track it to resolution."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { icon: Ticket, label: 'Open tickets', value: all.filter((t) => !['resolved', 'closed', 'cancelled'].includes(t.status)).length, tone: 'bg-blue-50 text-blue-600' },
          { icon: AlertTriangle, label: 'Past SLA', value: openOverdue, tone: 'bg-rose-50 text-rose-600' },
          { icon: LifeBuoy, label: 'Assigned to me', value: assigned.filter((t) => !['resolved','closed','cancelled'].includes(t.status)).length, tone: 'bg-violet-50 text-violet-600' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 py-4">
              <div className={`rounded-lg p-2.5 ${s.tone}`}><s.icon className="h-5 w-5" /></div>
              <div>
                <p className="text-2xl font-semibold leading-none">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="mine">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="mine">My Tickets</TabsTrigger>
            <TabsTrigger value="assigned">Assigned to Me</TabsTrigger>
            {canManage && <TabsTrigger value="all">All Tickets</TabsTrigger>}
            {canManage && <TabsTrigger value="categories">Categories</TabsTrigger>}
          </TabsList>
          <Button onClick={() => setRaiseOpen(true)} disabled={!myId}>
            <Plus className="mr-2 h-4 w-4" /> Raise ticket
          </Button>
        </div>

        <TabsContent value="mine" className="mt-6">
          {!isLoading && mine.length === 0 ? (
            <EmptyState text="You have not raised any tickets." />
          ) : (
            <DataTable columns={columns(false)} data={mine} isLoading={isLoading} />
          )}
        </TabsContent>

        <TabsContent value="assigned" className="mt-6">
          {!isLoading && assigned.length === 0 ? (
            <EmptyState text="Nothing is assigned to you." />
          ) : (
            <DataTable columns={columns(true)} data={assigned} isLoading={isLoading} />
          )}
        </TabsContent>

        {canManage && (
          <TabsContent value="all" className="mt-6">
            <DataTable columns={columns(true)} data={all} isLoading={isLoading} />
          </TabsContent>
        )}

        {canManage && (
          <TabsContent value="categories" className="mt-6 space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setCatOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> New category
              </Button>
            </div>
            {(categories ?? []).length === 0 ? (
              <EmptyState text="No categories yet. A category sets who picks a ticket up and how quickly it must be answered." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {(categories ?? []).map((c) => (
                  <Card key={c.id}>
                    <CardContent className="py-4">
                      <p className="font-medium">{c.name}</p>
                      {c.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">{c.description}</p>
                      )}
                      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Respond in {c.response_sla_hours}h · resolve in {c.resolution_sla_hours}h
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Raise */}
      <Dialog open={raiseOpen} onOpenChange={setRaiseOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Raise a ticket</DialogTitle>
            <DialogDescription>
              Tell us what you need. Choosing a category gets it to the right person faster.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {(categories ?? []).filter((c) => c.is_active).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TICKET_PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Details</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRaiseOpen(false)}>Cancel</Button>
            <Button onClick={handleRaise} disabled={!subject.trim() || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Raise ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New category</DialogTitle>
            <DialogDescription>
              SLA hours are stamped onto a ticket when it is raised, so changing them later does not
              move an existing deadline.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input placeholder="e.g. Payroll query" value={catName} onChange={(e) => setCatName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Default assignee</Label>
              <Select value={catAssignee} onValueChange={setCatAssignee}>
                <SelectTrigger><SelectValue placeholder="Nobody by default" /></SelectTrigger>
                <SelectContent>
                  {(employees ?? []).filter((e) => e.status === 'active').map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Respond within (hours)</Label>
                <Input type="number" value={respSla} onChange={(e) => setRespSla(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Resolve within (hours)</Label>
                <Input type="number" value={resSla} onChange={(e) => setResSla(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatOpen(false)}>Cancel</Button>
            <Button
              disabled={!catName.trim()}
              onClick={async () => {
                try {
                  await createCategory.mutateAsync({
                    name: catName.trim(),
                    default_assignee_id: catAssignee || null,
                    response_sla_hours: Number(respSla) || 24,
                    resolution_sla_hours: Number(resSla) || 72,
                    is_active: true,
                  })
                  toast.success('Category created')
                  setCatOpen(false)
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Could not create the category')
                }
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TicketDetailDialog
        ticket={liveDetail}
        onOpenChange={(o) => !o && setDetail(null)}
        myId={myId}
        orgId={organization?.id}
        canManage={canManage}
        employees={employees ?? []}
        onUpdate={updateTicket.mutateAsync}
        onEscalate={escalate.mutateAsync}
      />
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 rounded-full bg-blue-50 p-3">
          <LifeBuoy className="h-6 w-6 text-blue-600" />
        </div>
        <p className="max-w-md text-sm text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  )
}

function TicketDetailDialog({
  ticket, onOpenChange, myId, canManage, employees, onUpdate, onEscalate,
}: {
  ticket: HelpdeskTicket | null
  onOpenChange: (open: boolean) => void
  myId?: string
  orgId?: string
  canManage: boolean
  employees: Array<{ id: string; first_name: string; last_name: string; status: string }>
  onUpdate: (u: Partial<HelpdeskTicket> & { id: string }) => Promise<unknown>
  onEscalate: (p: { id: string; to: string }) => Promise<unknown>
}) {
  const { data: comments } = useTicketComments(ticket?.id)
  const addComment = useAddTicketComment()
  const [body, setBody] = useState('')
  const [internal, setInternal] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => { setBody(''); setInternal(false) }, [ticket?.id])

  if (!ticket) return null

  return (
    <Dialog open={!!ticket} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {ticket.ticket_number} · {ticket.subject}
            {isOverdue(ticket) && <Badge className="bg-rose-100 text-rose-800">Overdue</Badge>}
            {ticket.escalated && (
              <Badge className="bg-amber-100 text-amber-800">
                <ArrowUpCircle className="mr-1 h-3 w-3" /> Escalated
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {ticket.category?.name ?? 'Uncategorised'} ·{' '}
            {ticket.raiser ? `raised by ${ticket.raiser.first_name} ${ticket.raiser.last_name}` : ''}
            {ticket.resolution_due_at ? ` · due ${formatDate(ticket.resolution_due_at)}` : ''}
          </DialogDescription>
        </DialogHeader>

        {canManage && (
          <div className="grid grid-cols-2 gap-3 rounded-md border p-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select
                value={ticket.status}
                onValueChange={(v) => onUpdate({ id: ticket.id, status: v as TicketStatus })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TICKET_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Assigned to</Label>
              <Select
                value={ticket.assigned_to ?? ''}
                onValueChange={(v) => onUpdate({ id: ticket.id, assigned_to: v })}
              >
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {employees.filter((e) => e.status === 'active').map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!ticket.escalated && (
              <div className="col-span-2">
                <Select onValueChange={(v) => onEscalate({ id: ticket.id, to: v })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Escalate to…" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.filter((e) => e.status === 'active').map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {ticket.description && (
          <p className="rounded-md bg-muted/40 p-3 text-sm">{ticket.description}</p>
        )}

        <ScrollArea className="min-h-0 flex-1 pr-3">
          <div className="space-y-3">
            {((comments ?? []) as Array<Record<string, unknown>>).map((c) => {
              const a = c.author as Record<string, unknown> | null
              return (
                <div
                  key={c.id as string}
                  className={`rounded-md border p-3 ${c.is_internal ? 'border-amber-200 bg-amber-50/50' : ''}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {a ? `${a.first_name} ${a.last_name}` : 'Unknown'}
                    </p>
                    <div className="flex items-center gap-2">
                      {c.is_internal ? <Badge variant="outline" className="text-[10px]">Internal</Badge> : null}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(c.created_at as string)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm">{c.body as string}</p>
                </div>
              )
            })}
            {((comments ?? []) as unknown[]).length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No replies yet.
              </p>
            )}
          </div>
        </ScrollArea>

        <div className="space-y-2 border-t pt-3">
          <Textarea
            placeholder="Write a reply"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
          />
          <div className="flex items-center justify-between">
            {canManage ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Switch checked={internal} onCheckedChange={setInternal} />
                Internal note
              </label>
            ) : <span />}
            <Button
              size="sm"
              disabled={!body.trim() || sending || !myId}
              onClick={async () => {
                setSending(true)
                try {
                  await addComment.mutateAsync({
                    ticket_id: ticket.id,
                    author_id: myId!,
                    body: body.trim(),
                    is_internal: internal,
                  })
                  setBody('')
                } catch {
                  toast.error('Could not post the reply')
                } finally {
                  setSending(false)
                }
              }}
            >
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Reply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BellRing, Download, FileCheck2, History, Loader2, Plus, Shield, ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { getCurrentEmployee } from '@/features/attendance/api/attendance.api'
import {
  usePolicies, useCreatePolicy, useMyAcknowledgements, useAcknowledgePolicy,
  useNotificationPreferences, useSaveNotificationPreference,
  useDataRequests, useCreateDataRequest, useAuditLog,
} from '../hooks/use-workplace'
import { NOTIFICATION_CATEGORIES, exportEmployeeData } from '../api/workplace.api'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

/* ───────────────────────── F46: policies ───────────────────────── */

export function PolicySettings() {
  const { profile } = useAuth()
  const { isAdmin, isHR } = usePermissions()
  const canManage = isAdmin || isHR

  const { data: me } = useQuery({
    queryKey: ['current-employee', profile?.id],
    queryFn: () => getCurrentEmployee(profile!.id),
    enabled: !!profile?.id,
  })
  const myId = me?.id as string | undefined

  const { data: policies, isLoading } = usePolicies()
  const { data: acks } = useMyAcknowledgements(myId)
  const acknowledge = useAcknowledgePolicy()
  const createPolicy = useCreatePolicy()

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [content, setContent] = useState('')
  const [reading, setReading] = useState<Record<string, unknown> | null>(null)

  const ackedIds = new Set(((acks ?? []) as Array<Record<string, unknown>>).map((a) => a.policy_id))
  const list = ((policies ?? []) as Array<Record<string, unknown>>).filter((p) => p.is_active)
  const pending = list.filter((p) => p.requires_acknowledgement && !ackedIds.has(p.id))

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-center gap-3 py-4">
            <FileCheck2 className="h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm">
              {pending.length} polic{pending.length === 1 ? 'y needs' : 'ies need'} your
              acknowledgement.
            </p>
          </CardContent>
        </Card>
      )}

      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New policy
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : list.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          No policies published yet.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {list.map((p) => {
            const acked = ackedIds.has(p.id)
            return (
              <Card key={p.id as string}>
                <CardContent className="flex items-start justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{p.title as string}</p>
                      <Badge variant="outline" className="text-xs">v{p.version as string}</Badge>
                      {p.category ? (
                        <Badge variant="secondary" className="text-xs">{p.category as string}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Effective {formatDate(p.effective_from as string)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setReading(p)}>Read</Button>
                    {p.requires_acknowledgement ? (
                      acked ? (
                        <Badge className="bg-emerald-100 text-emerald-800">
                          <ShieldCheck className="mr-1 h-3 w-3" /> Acknowledged
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          disabled={!myId}
                          onClick={async () => {
                            try {
                              await acknowledge.mutateAsync({
                                policy_id: p.id as string,
                                employee_id: myId!,
                                policy_version: (p.version as string) ?? null,
                              })
                              toast.success('Acknowledged')
                            } catch {
                              toast.error('Could not record it')
                            }
                          }}
                        >
                          Acknowledge
                        </Button>
                      )
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={!!reading} onOpenChange={(o) => !o && setReading(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{(reading?.title as string) ?? ''}</DialogTitle>
            <DialogDescription>
              Version {(reading?.version as string) ?? '1.0'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-3">
            <p className="whitespace-pre-wrap text-sm">
              {(reading?.content as string) ?? 'No content recorded for this policy.'}
            </p>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New policy</DialogTitle>
            <DialogDescription>
              Staff are asked to acknowledge it, and the version they accepted is recorded — so
              re-issuing asks again.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input placeholder="e.g. Code of conduct" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Content</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!title.trim()}
              onClick={async () => {
                try {
                  await createPolicy.mutateAsync({
                    title: title.trim(),
                    category: category.trim() || null,
                    content: content.trim() || null,
                    requires_acknowledgement: true,
                    is_active: true,
                  })
                  toast.success('Policy published')
                  setTitle(''); setCategory(''); setContent('')
                  setOpen(false)
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Could not publish it')
                }
              }}
            >
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─────────────────── F47: notification preferences ─────────────────── */

export function NotificationSettings() {
  const { profile } = useAuth()
  const { data: me } = useQuery({
    queryKey: ['current-employee', profile?.id],
    queryFn: () => getCurrentEmployee(profile!.id),
    enabled: !!profile?.id,
  })
  const myId = me?.id as string | undefined
  const { data: prefs } = useNotificationPreferences(myId)
  const save = useSaveNotificationPreference()

  const byCategory = new Map(
    ((prefs ?? []) as Array<Record<string, unknown>>).map((p) => [p.category as string, p])
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className="h-4 w-4" /> Notifications
        </CardTitle>
        <CardDescription>
          Choose what reaches you and how often. Anything set to off still appears in the app when
          you look, it just will not chase you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {NOTIFICATION_CATEGORIES.map((c) => {
          const p = byCategory.get(c.key)
          const inApp = (p?.in_app as boolean) ?? true
          const email = (p?.email as boolean) ?? true
          const freq = (p?.frequency as string) ?? 'immediate'

          const update = (patch: Record<string, unknown>) => {
            if (!myId) return
            save.mutate({
              employee_id: myId,
              category: c.key,
              in_app: inApp, email, frequency: freq,
              ...patch,
            } as Parameters<typeof save.mutate>[0])
          }

          return (
            <div key={c.key} className="flex flex-wrap items-center justify-between gap-3 border-b py-3 last:border-0">
              <span className="text-sm font-medium">{c.label}</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={inApp} onCheckedChange={(v) => update({ in_app: v })} />
                  In app
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={email} onCheckedChange={(v) => update({ email: v })} />
                  Email
                </label>
                <Select value={freq} onValueChange={(v) => update({ frequency: v })}>
                  <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediately</SelectItem>
                    <SelectItem value="daily">Daily digest</SelectItem>
                    <SelectItem value="weekly">Weekly digest</SelectItem>
                    <SelectItem value="off">Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

/* ───────────────────────── F49: DPDP ───────────────────────── */

export function PrivacySettings() {
  const { profile } = useAuth()
  const { isAdmin, isHR } = usePermissions()
  const canManage = isAdmin || isHR

  const { data: me } = useQuery({
    queryKey: ['current-employee', profile?.id],
    queryFn: () => getCurrentEmployee(profile!.id),
    enabled: !!profile?.id,
  })
  const myId = me?.id as string | undefined

  const { data: requests } = useDataRequests()
  const create = useCreateDataRequest()
  const [exporting, setExporting] = useState(false)

  async function downloadMyData() {
    if (!myId) return
    setExporting(true)
    try {
      const data = await exportEmployeeData(myId)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `my-data-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Your data has been downloaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not build the export')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" /> Your data
          </CardTitle>
          <CardDescription>
            Under the Digital Personal Data Protection Act you can ask for a copy of what is held
            about you, ask for it to be corrected, or ask for it to be erased.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadMyData} disabled={!myId || exporting}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download my data
          </Button>
          <Button
            variant="outline"
            disabled={!myId}
            onClick={async () => {
              try {
                await create.mutateAsync({
                  employee_id: myId,
                  requested_by: profile?.id,
                  request_type: 'correction',
                  status: 'pending',
                  details: 'Raised from Settings',
                })
                toast.success('Request raised with HR')
              } catch {
                toast.error('Could not raise the request')
              }
            }}
          >
            Request a correction
          </Button>
          <Button
            variant="outline"
            className="text-destructive"
            disabled={!myId}
            onClick={async () => {
              try {
                await create.mutateAsync({
                  employee_id: myId,
                  requested_by: profile?.id,
                  request_type: 'erasure',
                  status: 'pending',
                  details: 'Raised from Settings',
                })
                toast.success('Erasure request raised with HR')
              } catch {
                toast.error('Could not raise the request')
              }
            }}
          >
            Request erasure
          </Button>
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Requests to handle</CardTitle>
            <CardDescription>Access, correction and erasure requests from staff.</CardDescription>
          </CardHeader>
          <CardContent>
            {((requests ?? []) as unknown[]).length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Nothing outstanding.</p>
            ) : (
              <div className="divide-y">
                {((requests ?? []) as Array<Record<string, unknown>>).map((r) => {
                  const e = r.employee as Record<string, unknown> | null
                  return (
                    <div key={r.id as string} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {String(r.request_type)} request
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {e ? `${e.first_name} ${e.last_name}` : 'Unknown'} ·{' '}
                          {formatDate(r.created_at as string)}
                        </p>
                      </div>
                      <Badge variant={r.status === 'completed' ? 'secondary' : 'default'}>
                        {String(r.status).replace('_', ' ')}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/* ───────────────────────── F50: audit log ───────────────────────── */

export function AuditLogSettings() {
  const { data: rows, isLoading } = useAuditLog(200)
  const [filter, setFilter] = useState('')

  const list = ((rows ?? []) as Array<Record<string, unknown>>).filter((r) =>
    !filter ? true : String(r.table_name).includes(filter)
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" /> Audit trail
        </CardTitle>
        <CardDescription>
          Every change to pay, identity and access, recorded by the database itself so it cannot be
          bypassed by the app. Newest first, last 200.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Filter by table, e.g. employee_compensation"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
        {isLoading ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : list.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            Nothing recorded yet. Entries appear as soon as somebody changes a salary, an employee
            record or a payroll setting.
          </p>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-2 pr-3">
              {list.map((r) => {
                const changed = r.changed_fields as Record<string, { from: unknown; to: unknown }> | null
                return (
                  <div key={String(r.id)} className="rounded-md border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={r.operation === 'DELETE' ? 'destructive' : 'secondary'}
                          className="text-[10px]"
                        >
                          {String(r.operation)}
                        </Badge>
                        <span className="font-medium">{String(r.table_name)}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(r.changed_at as string)}
                      </span>
                    </div>
                    {changed && Object.keys(changed).length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {Object.entries(changed).slice(0, 6).map(([k, v]) => (
                          <p key={k} className="text-xs">
                            <span className="text-muted-foreground">{k}: </span>
                            <span className="line-through opacity-60">{JSON.stringify(v.from)}</span>
                            {' → '}
                            <span className="font-medium">{JSON.stringify(v.to)}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

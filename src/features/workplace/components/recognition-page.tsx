import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Award, Loader2, Plus, Sparkles, Trophy } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { getCurrentEmployee } from '@/features/attendance/api/attendance.api'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import {
  useRecognitions, useRecognitionValues, useGiveRecognition, useCreateRecognitionValue,
} from '../hooks/use-workplace'
import { RecognitionCard } from './recognition-card'
import { toast } from 'sonner'

export function RecognitionPage() {
  const { profile } = useAuth()
  const { isAdmin, isHR } = usePermissions()
  const canManage = isAdmin || isHR

  const { data: me } = useQuery({
    queryKey: ['current-employee', profile?.id],
    queryFn: () => getCurrentEmployee(profile!.id),
    enabled: !!profile?.id,
  })
  const myId = me?.id as string | undefined

  const { data: recognitions, isLoading } = useRecognitions()
  const { data: values } = useRecognitionValues()
  const { data: employees } = useEmployees()
  const give = useGiveRecognition()
  const createValue = useCreateRecognitionValue()

  const [open, setOpen] = useState(false)
  const [valueOpen, setValueOpen] = useState(false)
  const [to, setTo] = useState('')
  const [valueId, setValueId] = useState('')
  const [message, setMessage] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [saving, setSaving] = useState(false)
  const [valueName, setValueName] = useState('')

  useEffect(() => {
    if (!open) return
    setTo(''); setValueId(''); setMessage(''); setIsPublic(true)
  }, [open])

  const feed = (recognitions ?? []) as Array<Record<string, unknown>>

  // Who has been recognised most in the last 90 days
  const leaderboard = useMemo(() => {
    const rows = (recognitions ?? []) as Array<Record<string, unknown>>
    const cutoff = Date.now() - 90 * 86400_000
    const counts = new Map<string, { name: string; count: number }>()
    for (const r of rows) {
      if (new Date(r.created_at as string).getTime() < cutoff) continue
      const rec = r.receiver as Record<string, unknown> | null
      if (!rec) continue
      const id = rec.id as string
      const name = `${rec.first_name} ${rec.last_name}`
      counts.set(id, { name, count: (counts.get(id)?.count ?? 0) + 1 })
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5)
  }, [recognitions])

  async function send() {
    if (!myId) return
    setSaving(true)
    try {
      await give.mutateAsync({
        given_by: myId,
        given_to: to,
        value_id: valueId || null,
        message: message.trim(),
        is_public: isPublic,
      })
      toast.success('Recognition sent')
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send it')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Recognition"
        description="Say thank you, in a way the whole company can see."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Button onClick={() => setOpen(true)} disabled={!myId}>
          <Sparkles className="mr-2 h-4 w-4" /> Recognise someone
        </Button>
        {canManage && (
          <Button variant="outline" onClick={() => setValueOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add value
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {isLoading ? (
            <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : feed.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 rounded-full bg-amber-50 p-3">
                  <Award className="h-6 w-6 text-amber-600" />
                </div>
                <p className="font-medium">Nothing here yet</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Be the first to thank a colleague. It costs nothing and people remember it.
                </p>
              </CardContent>
            </Card>
          ) : (
            feed.map((r) => (
              <RecognitionCard
                key={r.id as string}
                recognition={r}
                myEmployeeId={myId}
                canModerate={canManage}
              />
            ))
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-4 w-4" /> Most recognised
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">Nothing in the last 90 days.</p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((l, i) => (
                    <div key={l.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm">
                        <span className="w-4 text-xs text-muted-foreground">{i + 1}</span>
                        {l.name}
                      </span>
                      <Badge variant="secondary">{l.count}</Badge>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">Last 90 days.</p>
            </CardContent>
          </Card>

          {(values ?? []).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Our values</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {(values ?? []).map((v) => (
                  <Badge key={v.id} variant="outline">{v.name}</Badge>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Recognise a colleague</DialogTitle>
            <DialogDescription>Be specific — "thanks" lands better with a reason.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Who? *</Label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger><SelectValue placeholder="Select a colleague" /></SelectTrigger>
                <SelectContent>
                  {(employees ?? []).filter((e) => e.status === 'active' && e.id !== myId).map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(values ?? []).length > 0 && (
              <div className="space-y-1.5">
                <Label>Value shown</Label>
                <Select value={valueId} onValueChange={setValueId}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {(values ?? []).map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Message *</Label>
              <Textarea
                placeholder="What did they do, and why did it matter?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Show to everyone</p>
                <p className="text-xs text-muted-foreground">Turn off to send it privately</p>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={send} disabled={!to || !message.trim() || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={valueOpen} onOpenChange={setValueOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add a company value</DialogTitle>
            <DialogDescription>Recognition can be tagged against these.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>Name *</Label>
            <Input
              className="mt-1.5"
              placeholder="e.g. Ownership"
              value={valueName}
              onChange={(e) => setValueName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValueOpen(false)}>Cancel</Button>
            <Button
              disabled={!valueName.trim()}
              onClick={async () => {
                try {
                  await createValue.mutateAsync({ name: valueName.trim(), is_active: true })
                  toast.success('Value added')
                  setValueName('')
                  setValueOpen(false)
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Could not add it')
                }
              }}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

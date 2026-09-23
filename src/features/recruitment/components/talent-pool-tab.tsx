import { useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Loader2, Search, Star, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { DataTable } from '@/components/shared/data-table'
import { useCandidates, useUpdateCandidatePool } from '../hooks/use-recruitment'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

type PoolCandidate = {
  id: string
  first_name: string
  last_name: string
  email: string
  current_company: string | null
  current_designation: string | null
  experience_years: number | null
  tags?: string[] | null
  in_talent_pool?: boolean | null
  revisit_after?: string | null
  pool_notes?: string | null
  rejection_reason?: string | null
  rejection_stage?: string | null
}

export function TalentPoolTab({ canManage }: { canManage: boolean }) {
  const { data: candidates, isLoading } = useCandidates()
  const updatePool = useUpdateCandidatePool()

  const [search, setSearch] = useState('')
  const [poolOnly, setPoolOnly] = useState(true)
  const [target, setTarget] = useState<PoolCandidate | null>(null)

  const [inPool, setInPool] = useState(false)
  const [tagText, setTagText] = useState('')
  const [revisit, setRevisit] = useState('')
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const rows = useMemo(() => {
    const all = (candidates ?? []) as unknown as PoolCandidate[]
    const q = search.trim().toLowerCase()
    return all.filter((c) => {
      if (poolOnly && !c.in_talent_pool) return false
      if (!q) return true
      return (
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.current_company ?? '').toLowerCase().includes(q) ||
        (c.tags ?? []).some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [candidates, search, poolOnly])

  function openEdit(c: PoolCandidate) {
    setTarget(c)
    setInPool(!!c.in_talent_pool)
    setTagText((c.tags ?? []).join(', '))
    setRevisit(c.revisit_after ?? '')
    setNotes(c.pool_notes ?? '')
    setReason(c.rejection_reason ?? '')
  }

  async function save() {
    if (!target) return
    setSaving(true)
    try {
      await updatePool.mutateAsync({
        id: target.id,
        inTalentPool: inPool,
        tags: tagText.split(',').map((t) => t.trim()).filter(Boolean),
        revisitAfter: revisit || null,
        poolNotes: notes.trim() || null,
        rejectionReason: reason.trim() || null,
        rejectionStage: target.rejection_stage ?? null,
      })
      toast.success('Candidate updated')
      setTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the candidate')
    } finally {
      setSaving(false)
    }
  }

  const columns: ColumnDef<PoolCandidate>[] = [
    {
      id: 'candidate',
      header: 'Candidate',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">
            {row.original.first_name} {row.original.last_name}
          </p>
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    {
      id: 'current',
      header: 'Currently',
      cell: ({ row }) => (
        <div className="text-sm">
          <p>{row.original.current_designation ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{row.original.current_company ?? '—'}</p>
        </div>
      ),
    },
    {
      accessorKey: 'experience_years',
      header: 'Experience',
      cell: ({ row }) =>
        row.original.experience_years != null ? `${row.original.experience_years} yrs` : '—',
    },
    {
      id: 'tags',
      header: 'Tags',
      cell: ({ row }) => {
        const tags = row.original.tags ?? []
        if (tags.length === 0) return <span className="text-muted-foreground">—</span>
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline" className="text-[10px]">+{tags.length - 3}</Badge>
            )}
          </div>
        )
      },
    },
    {
      id: 'why',
      header: 'Why not hired',
      cell: ({ row }) => (
        <span className="line-clamp-2 max-w-[220px] text-sm">
          {row.original.rejection_reason ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'revisit_after',
      header: 'Revisit',
      cell: ({ row }) =>
        row.original.revisit_after ? formatDate(row.original.revisit_after) : '—',
    },
    {
      id: 'actions',
      cell: ({ row }) =>
        canManage ? (
          <Button variant="outline" size="sm" onClick={() => openEdit(row.original)}>
            Edit
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, company or tag"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 rounded-md border px-3 py-2">
          <Switch checked={poolOnly} onCheckedChange={setPoolOnly} />
          <span className="text-sm">Pool only</span>
        </div>
        <Badge variant="secondary">{rows.length} shown</Badge>
      </div>

      {!isLoading && rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 rounded-full bg-amber-50 p-3">
              <Star className="h-6 w-6 text-amber-600" />
            </div>
            <p className="font-medium">Nothing in the pool yet</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              When a good candidate is not hired, add them to the pool with a reason and tags.
              It is the cheapest source of hires you have.
            </p>
          </CardContent>
        </Card>
      ) : (
        <DataTable columns={columns} data={rows} isLoading={isLoading} />
      )}

      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {target ? `${target.first_name} ${target.last_name}` : ''}
            </DialogTitle>
            <DialogDescription>
              Keep good candidates findable for the next time a similar role opens.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">In talent pool</p>
                <p className="text-xs text-muted-foreground">Show up in future searches</p>
              </div>
              <Switch checked={inPool} onCheckedChange={setInPool} />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Tags
              </Label>
              <Input
                placeholder="react, senior, bengaluru"
                value={tagText}
                onChange={(e) => setTagText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Separate with commas.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Why were they not hired?</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
            </div>

            <div className="space-y-1.5">
              <Label>Revisit after</Label>
              <Input type="date" value={revisit} onChange={(e) => setRevisit(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

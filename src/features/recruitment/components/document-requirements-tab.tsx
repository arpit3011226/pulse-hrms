import { useState } from 'react'
import { Loader2, Plus, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useDocumentRequirements, useSaveDocumentRequirement } from '../hooks/use-preboarding'
import type { DocumentRequirement, PreboardingGate } from '../api/preboarding.api'

const GATES: { value: PreboardingGate; label: string; note: string }[] = [
  {
    value: 'before_offer',
    label: 'Before the offer',
    note: 'Things a candidate can produce today — identity, education, current salary.',
  },
  {
    value: 'before_joining',
    label: 'Before joining',
    note: 'Things that only exist once they have resigned. Asking earlier stalls the hire.',
  },
]

const CATEGORIES = ['identity', 'education', 'employment', 'financial', 'medical', 'other']

type Draft = Partial<DocumentRequirement>

export function DocumentRequirementsTab() {
  const { organization } = useAuth()
  const { data, isLoading } = useDocumentRequirements()
  const save = useSaveDocumentRequirement()
  const [editing, setEditing] = useState<Draft | null>(null)

  async function handleSave() {
    if (!editing || !organization?.id) return
    if (!editing.label?.trim()) {
      toast.error('Give it a name the candidate will understand.')
      return
    }
    const code =
      editing.code?.trim() ||
      editing.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    try {
      await save.mutateAsync({ ...editing, code, label: editing.label, organization_id: organization.id })
      toast.success('Saved')
      setEditing(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save it')
    }
  }

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </p>
    )
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-muted-foreground">
          What candidates can be asked to send in. Split into two stages, because nobody can
          produce a relieving letter before they have resigned — and nobody resigns without an
          offer in hand.
        </p>
        <Button
          size="sm"
          onClick={() =>
            setEditing({
              label: '',
              code: '',
              category: 'other',
              gate: 'before_offer',
              is_mandatory: true,
              is_active: true,
              sort_order: 500,
            })
          }
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add a document
        </Button>
      </div>

      <div className="space-y-6">
        {GATES.map((g) => {
          const rows = (data ?? []).filter((r) => r.gate === g.value)
          return (
            <Card key={g.value}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{g.label}</CardTitle>
                <p className="text-xs text-muted-foreground">{g.note}</p>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {rows.length === 0 && (
                  <p className="py-3 text-sm text-muted-foreground">Nothing asked for at this stage.</p>
                )}
                {rows.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{r.label}</span>
                        <Badge variant="outline" className="capitalize">{r.category}</Badge>
                        {!r.is_mandatory && (
                          <Badge className="bg-gray-100 text-gray-700">Optional</Badge>
                        )}
                        {!r.is_active && <Badge className="bg-gray-100 text-gray-500">Off</Badge>}
                      </div>
                      {r.guidance && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{r.guidance}</p>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                      Edit
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit document' : 'Add a document'}</DialogTitle>
            <DialogDescription>
              The name and the note are shown to the candidate, so write them for somebody
              outside the company.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={editing?.label ?? ''}
                onChange={(e) => setEditing((d) => ({ ...d, label: e.target.value }))}
                placeholder="Relieving letter"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Note for the candidate</Label>
              <Textarea
                rows={2}
                value={editing?.guidance ?? ''}
                onChange={(e) => setEditing((d) => ({ ...d, guidance: e.target.value }))}
                placeholder="Both sides in one file. Please check the address page is readable."
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>When to ask</Label>
                <Select
                  value={editing?.gate ?? 'before_offer'}
                  onValueChange={(v) => setEditing((d) => ({ ...d, gate: v as PreboardingGate }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GATES.map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Kind</Label>
                <Select
                  value={editing?.category ?? 'other'}
                  onValueChange={(v) => setEditing((d) => ({ ...d, category: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing?.is_mandatory ?? true}
                  onCheckedChange={(v) => setEditing((d) => ({ ...d, is_mandatory: v }))}
                />
                <Label className="font-normal">Must be sent</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing?.is_active ?? true}
                  onCheckedChange={(v) => setEditing((d) => ({ ...d, is_active: v }))}
                />
                <Label className="font-normal">In use</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={save.isPending}>
              {save.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

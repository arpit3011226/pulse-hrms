import { useState } from 'react'
import { AlertTriangle, Eye, FileText, Loader2, Plus, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { useAgreementTemplates, useSaveAgreementTemplate } from '../hooks/use-agreements'
import {
  resolveAgreementPlaceholders, type AgreementTemplate,
} from '../api/agreements.api'

const CATEGORIES = [
  { value: 'nda', label: 'Non-disclosure' },
  { value: 'confidentiality', label: 'Confidentiality' },
  { value: 'posh', label: 'POSH' },
  { value: 'it_policy', label: 'IT policy' },
  { value: 'code_of_conduct', label: 'Code of conduct' },
  { value: 'data_protection', label: 'Data protection' },
  { value: 'other', label: 'Other' },
]

/** Everything a template may use. Anything else is removed before issue. */
const PLACEHOLDERS = [
  '{{employee_name}}',
  '{{employee_code}}',
  '{{designation}}',
  '{{department}}',
  '{{date_of_joining}}',
  '{{company_name}}',
  '{{company_address}}',
  '{{current_date}}',
]

const SAMPLE = {
  employee_name: 'Priya Nair',
  employee_code: 'EMP-0042',
  designation: 'Senior Engineer',
  department: 'Engineering',
  date_of_joining: '2026-11-03',
  company_name: 'Augustinnovate Pvt. Ltd.',
  company_address: '12 MG Road, Bengaluru 560001',
}

type Draft = Partial<AgreementTemplate>

export function AgreementTemplatesTab() {
  const { organization } = useAuth()
  const { data: templates, isLoading } = useAgreementTemplates()
  const save = useSaveAgreementTemplate()

  const [editing, setEditing] = useState<Draft | null>(null)
  const [preview, setPreview] = useState(false)

  function startNew() {
    setEditing({
      title: '',
      code: '',
      category: 'other',
      description: '',
      body_html: '<h2>Title</h2>\n<p>This agreement is between {{company_name}} and {{employee_name}} ({{employee_code}}).</p>',
      consent_statement: 'I have read and understood this document, and I agree to be bound by it.',
      is_active: true,
    })
    setPreview(false)
  }

  async function handleSave() {
    if (!editing || !organization?.id) return
    if (!editing.title?.trim() || !editing.body_html?.trim()) {
      toast.error('A title and some wording are both needed.')
      return
    }
    const code =
      editing.code?.trim() ||
      editing.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

    try {
      await save.mutateAsync({ ...editing, code, organization_id: organization.id })
      toast.success(editing.id ? 'Saved as a new version' : 'Template created')
      setEditing(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save it')
    }
  }

  const resolved = editing?.body_html
    ? resolveAgreementPlaceholders(editing.body_html, SAMPLE)
    : null

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
        <p className="text-sm text-muted-foreground">
          What new joiners are asked to read and sign. Editing one creates a new version —
          signatures already given keep the wording that was on the screen at the time.
        </p>
        <Button size="sm" onClick={startNew}>
          <Plus className="mr-1.5 h-4 w-4" /> New document
        </Button>
      </div>

      <div className="space-y-2">
        {(templates ?? []).map((t) => (
          <Card key={t.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="text-sm font-medium">{t.title}</p>
                  <Badge variant="outline">v{t.version}</Badge>
                  {!t.is_active && <Badge className="bg-gray-100 text-gray-700">Off</Badge>}
                  {t.needs_legal_review && (
                    <Badge className="bg-amber-100 text-amber-800">
                      <AlertTriangle className="mr-1 h-3 w-3" /> Needs legal review
                    </Badge>
                  )}
                </div>
                {t.description && (
                  <p className="mt-0.5 pl-6 text-xs text-muted-foreground">{t.description}</p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(t)
                  setPreview(false)
                }}
              >
                Edit
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent size="page">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit document' : 'New document'}</DialogTitle>
            <DialogDescription>
              {editing?.id
                ? 'Saving creates a new version. Anybody who has already signed keeps the wording they signed.'
                : 'Written here, issued when somebody joins.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  value={editing?.title ?? ''}
                  onChange={(e) => setEditing((d) => ({ ...d, title: e.target.value }))}
                  placeholder="Non-Disclosure Agreement"
                />
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
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>One line about it</Label>
              <Input
                value={editing?.description ?? ''}
                onChange={(e) => setEditing((d) => ({ ...d, description: e.target.value }))}
                placeholder="Protects company and client information."
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Wording</Label>
                <Button size="sm" variant="ghost" onClick={() => setPreview((p) => !p)}>
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  {preview ? 'Back to editing' : 'Preview with sample details'}
                </Button>
              </div>

              {preview ? (
                <div
                  className="prose prose-sm max-h-[38vh] max-w-none overflow-y-auto rounded-md border bg-white p-4"
                  dangerouslySetInnerHTML={{ __html: resolved?.html ?? '' }}
                />
              ) : (
                <Textarea
                  rows={14}
                  className="font-mono text-xs"
                  value={editing?.body_html ?? ''}
                  onChange={(e) => setEditing((d) => ({ ...d, body_html: e.target.value }))}
                />
              )}

              <div className="flex flex-wrap gap-1.5 pt-1">
                {PLACEHOLDERS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] hover:bg-muted/70"
                    onClick={() =>
                      setEditing((d) => ({ ...d, body_html: `${d?.body_html ?? ''}${p}` }))
                    }
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/*
                Shown while they are still writing, not discovered later inside
                somebody's signed NDA. Anything unknown is stripped at issue.
              */}
              {resolved && resolved.unresolved.length > 0 && (
                <p className="flex items-start gap-1.5 rounded-md bg-amber-50 p-2 text-xs text-amber-900">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Nothing fills {resolved.unresolved.join(', ')}. These will be left blank on
                    every document issued. Use one of the buttons above instead.
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>The sentence they tick</Label>
              <Textarea
                rows={2}
                value={editing?.consent_statement ?? ''}
                onChange={(e) => setEditing((d) => ({ ...d, consent_statement: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Recorded word for word with the signature, so there is no argument later about
                what was agreed.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing?.is_active ?? true}
                  onCheckedChange={(v) => setEditing((d) => ({ ...d, is_active: v }))}
                />
                <Label className="font-normal">Issue this to new joiners</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing?.needs_legal_review ?? true}
                  onCheckedChange={(v) => setEditing((d) => ({ ...d, needs_legal_review: v }))}
                />
                <Label className="font-normal">Still waiting on legal review</Label>
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
              {editing?.id ? 'Save as new version' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

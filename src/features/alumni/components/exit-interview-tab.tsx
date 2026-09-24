import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Loader2, MessageSquareQuote, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  useExitQuestions, useCreateExitQuestion, useExitResponses, useSaveExitResponses,
  useExitRecords,
} from '../hooks/use-alumni'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

const QUESTION_TYPES = [
  { value: 'rating', label: 'Rating 1–5' },
  { value: 'single_select', label: 'Pick one' },
  { value: 'text', label: 'Free text' },
]

/** F42 — structured exit interviews, replacing one free-text box. */
export function ExitInterviewTab({ canManage }: { canManage: boolean }) {
  const { data: questions, isLoading } = useExitQuestions()
  const { data: responses } = useExitResponses()
  const { data: exitRecords } = useExitRecords()
  const createQuestion = useCreateExitQuestion()
  const saveResponses = useSaveExitResponses()

  const [qOpen, setQOpen] = useState(false)
  const [conductOpen, setConductOpen] = useState(false)
  const [qText, setQText] = useState('')
  const [qType, setQType] = useState('rating')
  const [qOptions, setQOptions] = useState('')
  const [qCategory, setQCategory] = useState('')
  const [saving, setSaving] = useState(false)

  // conducting
  const [exitRecordId, setExitRecordId] = useState('')
  const [answers, setAnswers] = useState<Record<string, { rating?: number; text?: string; option?: string }>>({})

  useEffect(() => {
    if (!conductOpen) return
    setExitRecordId('')
    setAnswers({})
  }, [conductOpen])

  const qs = (questions ?? []) as Array<Record<string, unknown>>
  // Memoised so the empty-array fallback does not create a new value each render
  // and invalidate everything downstream.
  const resp = useMemo(() => (responses ?? []) as Array<Record<string, unknown>>, [responses])

  // Average rating per question, across everyone who has answered
  const trends = useMemo(() => {
    const byQuestion = new Map<string, { text: string; total: number; count: number }>()
    for (const r of resp) {
      if (r.rating == null) continue
      const key = (r.question_id as string) ?? (r.question_text as string)
      const prev = byQuestion.get(key) ?? { text: r.question_text as string, total: 0, count: 0 }
      byQuestion.set(key, {
        text: prev.text,
        total: prev.total + Number(r.rating),
        count: prev.count + 1,
      })
    }
    return [...byQuestion.values()]
      .map((v) => ({ text: v.text, avg: v.total / v.count, count: v.count }))
      .sort((a, b) => a.avg - b.avg)
  }, [resp])

  // Exits that have not been interviewed yet
  const done = new Set(resp.map((r) => r.employee_exit_record_id as string))
  const pending = ((exitRecords ?? []) as Array<Record<string, unknown>>).filter(
    (e) => !done.has(e.id as string)
  )

  async function submitInterview() {
    if (!exitRecordId) return
    setSaving(true)
    try {
      const rows = qs
        .map((q) => {
          const a = answers[q.id as string]
          if (!a || (a.rating == null && !a.text && !a.option)) return null
          return {
            employee_exit_record_id: exitRecordId,
            question_id: q.id as string,
            question_text: q.question as string,
            rating: a.rating ?? null,
            selected_option: a.option ?? null,
            text_answer: a.text ?? null,
          }
        })
        .filter(Boolean) as Record<string, unknown>[]

      if (rows.length === 0) {
        toast.error('Nothing recorded — answer at least one question')
        return
      }
      await saveResponses.mutateAsync(rows)
      toast.success('Exit interview recorded')
      setConductOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the responses')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Structured questions make exit feedback countable. One free-text box cannot be compared
          across twenty leavers.
        </p>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setQOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add question
            </Button>
            <Button onClick={() => setConductOpen(true)} disabled={qs.length === 0}>
              <MessageSquareQuote className="mr-2 h-4 w-4" /> Record an interview
            </Button>
          </div>
        )}
      </div>

      {pending.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-4 text-sm">
            {pending.length} leaver{pending.length === 1 ? ' has' : 's have'} no exit interview
            recorded.
          </CardContent>
        </Card>
      )}

      {trends.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" /> What leavers tell us
            </CardTitle>
            <CardDescription>
              Average rating per question, lowest first. The bottom of this list is where your
              attrition comes from.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {trends.map((t) => (
              <div key={t.text}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="truncate pr-3">{t.text}</span>
                  <span className="shrink-0 font-medium">
                    {t.avg.toFixed(1)}
                    <span className="ml-1 text-xs text-muted-foreground">({t.count})</span>
                  </span>
                </div>
                <Progress value={(t.avg / 5) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Questions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : qs.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No questions set up yet. Add a few before the next person leaves.
            </p>
          ) : (
            <div className="divide-y">
              {qs.map((q) => (
                <div key={q.id as string} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm">{q.question as string}</p>
                    {q.category ? (
                      <p className="text-xs text-muted-foreground">{q.category as string}</p>
                    ) : null}
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {QUESTION_TYPES.find((x) => x.value === q.question_type)?.label ??
                      (q.question_type as string)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add question */}
      <Dialog open={qOpen} onOpenChange={setQOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add exit interview question</DialogTitle>
            <DialogDescription>
              Ratings are what make a trend visible. Keep free text for the one or two questions
              where the words matter.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Question *</Label>
              <Textarea
                placeholder="e.g. How fairly were you paid for your role?"
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={qType} onValueChange={setQType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input
                  placeholder="e.g. Manager"
                  value={qCategory}
                  onChange={(e) => setQCategory(e.target.value)}
                />
              </div>
            </div>
            {qType === 'single_select' && (
              <div className="space-y-1.5">
                <Label>Options</Label>
                <Input
                  placeholder="Separate with commas"
                  value={qOptions}
                  onChange={(e) => setQOptions(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQOpen(false)}>Cancel</Button>
            <Button
              disabled={!qText.trim()}
              onClick={async () => {
                try {
                  await createQuestion.mutateAsync({
                    question: qText.trim(),
                    question_type: qType,
                    category: qCategory.trim() || null,
                    options: qType === 'single_select'
                      ? qOptions.split(',').map((o) => o.trim()).filter(Boolean)
                      : null,
                    sort_order: qs.length + 1,
                    is_active: true,
                  })
                  toast.success('Question added')
                  setQText(''); setQCategory(''); setQOptions('')
                  setQOpen(false)
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

      {/* Conduct interview */}
      <Dialog open={conductOpen} onOpenChange={setConductOpen}>
        <DialogContent className="flex max-h-[88vh] max-w-lg flex-col">
          <DialogHeader>
            <DialogTitle>Record an exit interview</DialogTitle>
            <DialogDescription>
              Answers are visible to HR and leadership only — not to the manager the person may have
              been talking about.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label>Leaver *</Label>
            <Select value={exitRecordId} onValueChange={setExitRecordId}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {((exitRecords ?? []) as Array<Record<string, unknown>>).map((e) => {
                  const emp = e.employee as Record<string, unknown> | null
                  return (
                    <SelectItem key={e.id as string} value={e.id as string}>
                      {emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown'}
                      {e.last_working_date ? ` · ${formatDate(e.last_working_date as string)}` : ''}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="mt-3 min-h-0 flex-1 pr-3">
            <div className="space-y-4">
              {qs.map((q) => {
                const id = q.id as string
                const type = q.question_type as string
                return (
                  <div key={id} className="space-y-2">
                    <Label className="text-sm font-normal">{q.question as string}</Label>
                    {type === 'rating' && (
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() =>
                              setAnswers((p) => ({ ...p, [id]: { ...p[id], rating: n } }))
                            }
                            className={`h-8 w-8 rounded border text-sm transition-colors ${
                              answers[id]?.rating === n
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'hover:bg-muted'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    )}
                    {type === 'single_select' && (
                      <Select
                        value={answers[id]?.option ?? ''}
                        onValueChange={(v) =>
                          setAnswers((p) => ({ ...p, [id]: { ...p[id], option: v } }))
                        }
                      >
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {((q.options as string[]) ?? []).map((o) => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {type === 'text' && (
                      <Textarea
                        rows={2}
                        value={answers[id]?.text ?? ''}
                        onChange={(e) =>
                          setAnswers((p) => ({ ...p, [id]: { ...p[id], text: e.target.value } }))
                        }
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setConductOpen(false)}>Cancel</Button>
            <Button onClick={submitInterview} disabled={!exitRecordId || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save responses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Trash2, Plus, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useCreateSurvey, useUpdateSurvey } from '../hooks/use-surveys'
import { SurveyAudienceBuilder } from './survey-audience-builder'
import type {
  SurveyWithQuestions,
  SurveyTargetRule,
  SurveyCategory,
  SurveyQuestionType,
  SurveyQuestionOption,
  SurveyDisplayAs,
} from '@/types/database.types'

interface SurveyBuilderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  survey?: SurveyWithQuestions | null
}

interface QuestionRow {
  question_text: string
  category: SurveyCategory
  is_required: boolean
  question_type: SurveyQuestionType
  options: SurveyQuestionOption[]
  display_as: SurveyDisplayAs | null
}

const CATEGORY_OPTIONS: { value: SurveyCategory; label: string }[] = [
  { value: 'work_life_balance', label: 'Work-Life Balance' },
  { value: 'career_growth', label: 'Career Growth' },
  { value: 'manager_support', label: 'Manager Support' },
  { value: 'compensation', label: 'Compensation' },
  { value: 'team_culture', label: 'Team Culture' },
  { value: 'custom', label: 'Custom' },
]

const QUESTION_TYPE_OPTIONS: { value: SurveyQuestionType; label: string }[] = [
  { value: 'rating', label: 'Rating (1-5)' },
  { value: 'single_select', label: 'Single Select' },
  { value: 'multi_select', label: 'Multi Select' },
  { value: 'text', label: 'Text' },
]

const DEFAULT_STANDARD_QUESTIONS: QuestionRow[] = [
  { question_text: 'How would you rate your work-life balance?', category: 'work_life_balance', is_required: true, question_type: 'rating', options: [], display_as: null },
  { question_text: 'How satisfied are you with career growth opportunities?', category: 'career_growth', is_required: true, question_type: 'rating', options: [], display_as: null },
  { question_text: 'How well does your manager support you?', category: 'manager_support', is_required: true, question_type: 'rating', options: [], display_as: null },
  { question_text: 'How fair is your compensation relative to your role?', category: 'compensation', is_required: true, question_type: 'rating', options: [], display_as: null },
  { question_text: 'How would you rate the team culture?', category: 'team_culture', is_required: true, question_type: 'rating', options: [], display_as: null },
]

function formatRuleLabel(rule: SurveyTargetRule): string {
  const fieldLabels: Record<string, string> = {
    gender: 'Gender',
    department_id: 'Department',
    designation_id: 'Designation',
    employment_type: 'Employment type',
    status: 'Status',
    date_of_joining: 'Joining date',
    date_of_birth: 'Date of birth',
  }
  const operatorLabels: Record<string, string> = {
    is: 'is',
    is_not: 'is not',
    before: 'before',
    after: 'after',
    less_than_days_ago: 'less than days ago',
    more_than_days_ago: 'more than days ago',
  }
  return `${fieldLabels[rule.field] ?? rule.field} ${operatorLabels[rule.operator] ?? rule.operator} ${rule.value}`
}

function generateOptionValue(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

// ── Options Editor ───────────────────────────────────────────

function QuestionOptionsEditor({
  options,
  onChange,
  questionType,
  displayAs,
  onDisplayAsChange,
}: {
  options: SurveyQuestionOption[]
  onChange: (options: SurveyQuestionOption[]) => void
  questionType: SurveyQuestionType
  displayAs: SurveyDisplayAs | null
  onDisplayAsChange: (v: SurveyDisplayAs | null) => void
}) {
  function addOption() {
    onChange([...options, { label: '', value: '', score: 50 }])
  }

  function updateOption(index: number, updates: Partial<SurveyQuestionOption>) {
    onChange(
      options.map((o, i) => {
        if (i !== index) return o
        const updated = { ...o, ...updates }
        // Auto-generate value from label if label changed
        if (updates.label !== undefined) {
          updated.value = generateOptionValue(updates.label)
        }
        return updated
      })
    )
  }

  function removeOption(index: number) {
    onChange(options.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2 ml-1 pl-3 border-l-2 border-muted">
      {/* Display style for single_select */}
      {questionType === 'single_select' && (
        <div className="flex items-center gap-3">
          <Label className="text-xs text-muted-foreground">Display as:</Label>
          <Select
            value={displayAs ?? 'radio'}
            onValueChange={(v) => onDisplayAsChange(v as SurveyDisplayAs)}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="radio">Radio buttons</SelectItem>
              <SelectItem value="dropdown">Dropdown</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Option rows */}
      <div className="space-y-1.5">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
            <Input
              placeholder="Option label"
              value={opt.label}
              onChange={(e) => updateOption(i, { label: e.target.value })}
              className="h-8 text-sm flex-1"
            />
            <div className="flex items-center gap-1 shrink-0">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Score:</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={opt.score}
                onChange={(e) => updateOption(i, { score: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                className="h-8 w-[70px] text-sm text-center"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeOption(i)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addOption} className="h-7 text-xs">
        <Plus className="h-3 w-3 mr-1" />
        Add Option
      </Button>

      {options.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Score (0-100) defines how each option contributes to sentiment metrics.
          Higher = more positive.
        </p>
      )}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────

export function SurveyBuilderDialog({ open, onOpenChange, survey }: SurveyBuilderDialogProps) {
  const { profile, organization } = useAuth()
  const createSurvey = useCreateSurvey()
  const updateSurvey = useUpdateSurvey()
  const isEditing = !!survey

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  // F35 — a pulse is a short survey that repeats on a schedule
  const [isPulse, setIsPulse] = useState(false)
  const [recurrence, setRecurrence] = useState('monthly')
  const [targetRules, setTargetRules] = useState<SurveyTargetRule[]>([])
  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [audienceBuilderOpen, setAudienceBuilderOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Reset form when dialog opens or survey changes
  useEffect(() => {
    if (open) {
      if (survey) {
        setTitle(survey.title)
        setDescription(survey.description ?? '')
        setStartDate(survey.start_date)
        setEndDate(survey.end_date)
        setIsAnonymous(survey.is_anonymous)
        setIsPulse(Boolean((survey as { is_pulse?: boolean }).is_pulse))
        setRecurrence((survey as { recurrence?: string }).recurrence ?? 'monthly')
        setTargetRules(survey.target_rules ?? [])
        setQuestions(
          survey.survey_questions
            .sort((a, b) => a.question_order - b.question_order)
            .map((q) => ({
              question_text: q.question_text,
              category: q.category,
              is_required: q.is_required,
              question_type: q.question_type ?? 'rating',
              options: (q.options as SurveyQuestionOption[]) ?? [],
              display_as: q.display_as ?? null,
            }))
        )
      } else {
        setTitle('')
        setDescription('')
        setStartDate('')
        setEndDate('')
        setIsAnonymous(false)
        setTargetRules([])
        setQuestions([])
      }
    }
  }, [open, survey])

  function addStandardSet() {
    setQuestions((prev) => [...prev, ...DEFAULT_STANDARD_QUESTIONS])
  }

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      { question_text: '', category: 'custom', is_required: false, question_type: 'rating', options: [], display_as: null },
    ])
  }

  function updateQuestion(index: number, updates: Partial<QuestionRow>) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== index) return q
        const updated = { ...q, ...updates }
        // When switching to rating or text, clear options
        if (updates.question_type === 'rating' || updates.question_type === 'text') {
          updated.options = []
          updated.display_as = null
        }
        // When switching to single_select, set default display_as
        if (updates.question_type === 'single_select') {
          updated.display_as = 'radio'
        }
        // When switching to multi_select, set display_as to checkbox
        if (updates.question_type === 'multi_select') {
          updated.display_as = 'checkbox'
        }
        return updated
      })
    )
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  function removeRule(index: number) {
    setTargetRules((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!startDate || !endDate) {
      toast.error('Start and end dates are required')
      return
    }
    if (questions.length === 0) {
      toast.error('Add at least one question')
      return
    }
    if (questions.some((q) => !q.question_text.trim())) {
      toast.error('All questions must have text')
      return
    }
    // Validate that select questions have at least 2 options
    const invalidSelectQ = questions.find(
      (q) => (q.question_type === 'single_select' || q.question_type === 'multi_select') && q.options.length < 2
    )
    if (invalidSelectQ) {
      toast.error('Select questions must have at least 2 options')
      return
    }
    // Validate option labels are not empty
    const emptyOption = questions.find(
      (q) => q.options.some((o) => !o.label.trim())
    )
    if (emptyOption) {
      toast.error('All option labels must have text')
      return
    }

    setSaving(true)
    try {
      const questionsPayload = questions.map((q, i) => ({
        question_text: q.question_text,
        category: q.category,
        question_order: i + 1,
        is_required: q.is_required,
        question_type: q.question_type,
        options: q.options.length > 0 ? q.options : null,
        display_as: q.display_as,
      }))

      if (isEditing && survey) {
        await updateSurvey.mutateAsync({
          surveyId: survey.id,
          orgId: organization!.id,
          data: {
            title: title.trim(),
            description: description.trim() || null,
            start_date: startDate,
            end_date: endDate,
            is_anonymous: isAnonymous,
            is_pulse: isPulse,
            recurrence: isPulse ? recurrence : null,
            target_rules: targetRules,
          },
          questions: questionsPayload,
        })
        toast.success('Survey updated')
      } else {
        await createSurvey.mutateAsync({
          organization_id: organization!.id,
          title: title.trim(),
          description: description.trim() || null,
          start_date: startDate,
          end_date: endDate,
          is_anonymous: isAnonymous,
          is_pulse: isPulse,
          recurrence: isPulse ? recurrence : null,
          target_rules: targetRules,
          created_by: profile!.id,
          questions: questionsPayload,
        })
        toast.success('Survey created')
      }
      onOpenChange(false)
    } catch {
      toast.error('Failed to save survey')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="page">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Survey' : 'Create Survey'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Title */}
            <div className="space-y-2">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Survey title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Optional description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start date <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End date <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Anonymous toggle */}
            <div className="flex items-center gap-3">
              <Switch
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
              />
              <Label htmlFor="anonymous">Anonymous survey</Label>
            </div>

            {/* F35 — pulse: a short survey that repeats */}
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center gap-3">
                <Switch id="pulse" checked={isPulse} onCheckedChange={setIsPulse} />
                <div>
                  <Label htmlFor="pulse">Pulse survey</Label>
                  <p className="text-xs text-muted-foreground">
                    A few questions, asked again on a schedule. Better for tracking a trend than one
                    long survey a year.
                  </p>
                </div>
              </div>
              {isPulse && (
                <div className="flex items-center gap-2 pl-11">
                  <Label className="text-sm font-normal">Repeat</Label>
                  <Select value={recurrence} onValueChange={setRecurrence}>
                    <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="fortnightly">Fortnightly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Target Audience */}
            <div className="space-y-3">
              <Label>Target Audience</Label>
              {targetRules.length === 0 ? (
                <p className="text-sm text-muted-foreground">All active employees</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {targetRules.map((rule, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {formatRuleLabel(rule)}
                      <button
                        type="button"
                        onClick={() => removeRule(i)}
                        className="ml-1 hover:text-destructive"
                      >
                        &times;
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAudienceBuilderOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Condition
              </Button>
            </div>

            {/* Questions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Questions</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addStandardSet}
                >
                  Add Standard Set
                </Button>
              </div>

              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 border rounded-md"
                  >
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Question text"
                        value={q.question_text}
                        onChange={(e) =>
                          updateQuestion(i, { question_text: e.target.value })
                        }
                      />
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Category */}
                        <Select
                          value={q.category}
                          onValueChange={(v) =>
                            updateQuestion(i, { category: v as SurveyCategory })
                          }
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORY_OPTIONS.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Question Type */}
                        <Select
                          value={q.question_type}
                          onValueChange={(v) =>
                            updateQuestion(i, { question_type: v as SurveyQuestionType })
                          }
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {QUESTION_TYPE_OPTIONS.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Required */}
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`required-${i}`}
                            checked={q.is_required}
                            onCheckedChange={(checked) =>
                              updateQuestion(i, { is_required: !!checked })
                            }
                          />
                          <Label htmlFor={`required-${i}`} className="text-sm">
                            Required
                          </Label>
                        </div>
                      </div>

                      {/* Options editor for select types */}
                      {(q.question_type === 'single_select' || q.question_type === 'multi_select') && (
                        <QuestionOptionsEditor
                          options={q.options}
                          onChange={(opts) => updateQuestion(i, { options: opts })}
                          questionType={q.question_type}
                          displayAs={q.display_as}
                          onDisplayAsChange={(v) => updateQuestion(i, { display_as: v })}
                        />
                      )}

                      {/* Info text for different types */}
                      {q.question_type === 'rating' && (
                        <p className="text-xs text-muted-foreground">
                          Employees rate 1-5 stars. Score maps to 0-100 automatically.
                        </p>
                      )}
                      {q.question_type === 'text' && (
                        <p className="text-xs text-muted-foreground">
                          Free-text response. Does not contribute to numeric sentiment scores.
                        </p>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuestion(i)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addQuestion}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Question
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SurveyAudienceBuilder
        open={audienceBuilderOpen}
        onOpenChange={setAudienceBuilderOpen}
        onSave={(rule) => setTargetRules((prev) => [...prev, rule])}
      />
    </>
  )
}

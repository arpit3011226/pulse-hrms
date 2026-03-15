import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { useSubmitSurveyResponse } from '../hooks/use-surveys'
import type { SurveyWithQuestions, SurveyQuestionOption } from '@/types/database.types'

interface SurveyTakeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  survey: SurveyWithQuestions
}

interface AnswerState {
  rating: number
  selectedOptions: string[]
  textValue: string
  comment: string
  showComment: boolean
}

function StarRating({
  value,
  onChange,
}: {
  value: number
  onChange: (rating: number) => void
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="focus:outline-none"
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              star <= value
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-none text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

export function SurveyTakeDialog({ open, onOpenChange, survey }: SurveyTakeDialogProps) {
  const { profile, organization } = useAuth()
  const submitResponse = useSubmitSurveyResponse()

  const { data: myEmployee } = useQuery({
    queryKey: ['my-employee', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('employees')
        .select('id')
        .eq('profile_id', profile!.id)
        .eq('organization_id', organization!.id)
        .single()
      return data
    },
    enabled: !!profile?.id && !!organization?.id,
  })

  const sortedQuestions = [...(survey.survey_questions ?? [])].sort(
    (a, b) => a.question_order - b.question_order
  )

  const [answers, setAnswers] = useState<Record<string, AnswerState>>({})
  const [submitting, setSubmitting] = useState(false)

  // Reset answers when dialog opens
  useEffect(() => {
    if (open) {
      const initial: Record<string, AnswerState> = {}
      for (const q of sortedQuestions) {
        initial[q.id] = { rating: 0, selectedOptions: [], textValue: '', comment: '', showComment: false }
      }
      setAnswers(initial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, survey.id])

  function updateAnswer(questionId: string, updates: Partial<AnswerState>) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], ...updates },
    }))
  }

  function toggleMultiSelectOption(questionId: string, optionValue: string) {
    setAnswers((prev) => {
      const current = prev[questionId]?.selectedOptions ?? []
      const next = current.includes(optionValue)
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue]
      return {
        ...prev,
        [questionId]: { ...prev[questionId], selectedOptions: next },
      }
    })
  }

  function hasAnswer(q: typeof sortedQuestions[0]): boolean {
    const ans = answers[q.id]
    if (!ans) return false
    const qType = q.question_type ?? 'rating'
    switch (qType) {
      case 'rating': return ans.rating > 0
      case 'single_select':
      case 'multi_select': return ans.selectedOptions.length > 0
      case 'text': return !!ans.textValue.trim()
      default: return false
    }
  }

  async function handleSubmit() {
    // Validate required questions
    const missingRequired = sortedQuestions.filter(
      (q) => q.is_required && !hasAnswer(q)
    )
    if (missingRequired.length > 0) {
      toast.error('Please answer all required questions')
      return
    }

    if (!myEmployee?.id) {
      toast.error('Could not identify your employee record')
      return
    }

    setSubmitting(true)
    try {
      const answerPayload = sortedQuestions
        .filter((q) => hasAnswer(q))
        .map((q) => {
          const ans = answers[q.id]
          const qType = q.question_type ?? 'rating'
          return {
            question_id: q.id,
            rating: qType === 'rating' ? ans.rating : null,
            selected_options: (qType === 'single_select' || qType === 'multi_select')
              ? ans.selectedOptions
              : null,
            text_value: qType === 'text' ? ans.textValue : null,
            comment: ans.comment.trim() || null,
          }
        })

      await submitResponse.mutateAsync({
        surveyId: survey.id,
        orgId: organization!.id,
        employeeId: myEmployee.id,
        isAnonymous: survey.is_anonymous,
        answers: answerPayload,
      })

      toast.success('Response submitted')
      onOpenChange(false)
    } catch {
      toast.error('Failed to submit response')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{survey.title}</DialogTitle>
          {survey.description && (
            <DialogDescription>{survey.description}</DialogDescription>
          )}
        </DialogHeader>

        {survey.is_anonymous && (
          <Badge variant="secondary" className="w-fit">Anonymous</Badge>
        )}

        <div className="space-y-4 py-2">
          {sortedQuestions.map((q) => {
            const answer = answers[q.id] ?? { rating: 0, selectedOptions: [], textValue: '', comment: '', showComment: false }
            const qType = q.question_type ?? 'rating'
            const options = (q.options as SurveyQuestionOption[]) ?? []

            return (
              <Card key={q.id}>
                <CardContent className="pt-4 space-y-3">
                  <p className="text-sm font-medium">
                    {q.question_text}
                    {q.is_required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </p>

                  {/* Rating */}
                  {qType === 'rating' && (
                    <StarRating
                      value={answer.rating}
                      onChange={(rating) => updateAnswer(q.id, { rating })}
                    />
                  )}

                  {/* Single Select - Radio */}
                  {qType === 'single_select' && (q.display_as === 'radio' || !q.display_as) && (
                    <RadioGroup
                      value={answer.selectedOptions[0] ?? ''}
                      onValueChange={(v) => updateAnswer(q.id, { selectedOptions: [v] })}
                    >
                      <div className="space-y-2">
                        {options.map((opt) => (
                          <div key={opt.value} className="flex items-center gap-2">
                            <RadioGroupItem value={opt.value} id={`${q.id}-${opt.value}`} />
                            <Label htmlFor={`${q.id}-${opt.value}`} className="text-sm font-normal cursor-pointer">
                              {opt.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  )}

                  {/* Single Select - Dropdown */}
                  {qType === 'single_select' && q.display_as === 'dropdown' && (
                    <Select
                      value={answer.selectedOptions[0] ?? ''}
                      onValueChange={(v) => updateAnswer(q.id, { selectedOptions: [v] })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an option..." />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Multi Select - Checkboxes */}
                  {qType === 'multi_select' && (
                    <div className="space-y-2">
                      {options.map((opt) => (
                        <div key={opt.value} className="flex items-center gap-2">
                          <Checkbox
                            id={`${q.id}-${opt.value}`}
                            checked={answer.selectedOptions.includes(opt.value)}
                            onCheckedChange={() => toggleMultiSelectOption(q.id, opt.value)}
                          />
                          <Label htmlFor={`${q.id}-${opt.value}`} className="text-sm font-normal cursor-pointer">
                            {opt.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Text */}
                  {qType === 'text' && (
                    <Textarea
                      placeholder="Type your response..."
                      value={answer.textValue}
                      onChange={(e) => updateAnswer(q.id, { textValue: e.target.value })}
                      rows={3}
                      className="text-sm"
                    />
                  )}

                  {/* Optional comment for non-text questions */}
                  {qType !== 'text' && (
                    answer.showComment ? (
                      <Textarea
                        placeholder="Add a comment..."
                        value={answer.comment}
                        onChange={(e) => updateAnswer(q.id, { comment: e.target.value })}
                        rows={2}
                        className="text-sm"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => updateAnswer(q.id, { showComment: true })}
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                      >
                        Add comment
                      </button>
                    )
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

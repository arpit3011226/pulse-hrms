import { useMemo, useState } from 'react'
import { one } from '@/lib/supabase-embed'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ArrowLeft, ChevronDown, ChevronRight, Star, User, MessageSquare } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useSurvey } from '../hooks/use-surveys'
import { computeAnswerScore } from '../utils/survey-score'
import { getInitials } from '@/lib/utils'
import type { SurveyCategory, SurveyQuestionOption } from '@/types/database.types'

interface SurveyResultsViewProps {
  surveyId: string
  onBack: () => void
}

type QuestionInfo = {
  id: string
  question_text: string
  category: SurveyCategory
  question_order: number
  is_required: boolean
  question_type: string
  options: SurveyQuestionOption[] | null
  display_as: string | null
}

type AnswerRow = {
  question_id: string
  rating: number | null
  comment: string | null
  selected_options: string[] | null
  text_value: string | null
}

type AnswerWithResponse = AnswerRow & { response_id: string }

const CATEGORY_LABELS: Record<SurveyCategory, string> = {
  work_life_balance: 'Work-Life Balance',
  career_growth: 'Career Growth',
  manager_support: 'Manager Support',
  compensation: 'Compensation',
  team_culture: 'Team Culture',
  custom: 'Custom',
}

function getScoreColor(score: number): string {
  if (score >= 75) return 'bg-emerald-500'
  if (score >= 65) return 'bg-amber-500'
  return 'bg-rose-500'
}

function getScoreClasses(score: number): string {
  if (score >= 75) return 'text-emerald-600 bg-emerald-100'
  if (score >= 65) return 'text-amber-600 bg-amber-100'
  return 'text-rose-600 bg-rose-100'
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active': return 'default'
    case 'closed': return 'secondary'
    default: return 'outline'
  }
}

const RATING_COLORS = [
  'bg-rose-500',    // 1
  'bg-orange-400',  // 2
  'bg-amber-400',   // 3
  'bg-lime-400',    // 4
  'bg-emerald-500', // 5
]

const OPTION_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-indigo-500',
]

function getOptionLabel(options: SurveyQuestionOption[] | null, value: string): string {
  return options?.find((o) => o.value === value)?.label ?? value
}

export function SurveyResultsView({ surveyId, onBack }: SurveyResultsViewProps) {
  const { organization } = useAuth()
  const { data: survey, isLoading: surveyLoading } = useSurvey(surveyId)

  const { data: answers, isLoading: answersLoading } = useQuery({
    queryKey: ['survey-results', surveyId],
    queryFn: async () => {
      const { data: responses } = await supabase
        .from('survey_responses')
        .select('id')
        .eq('survey_id', surveyId)
      if (!responses?.length) return []
      const responseIds = responses.map((r: { id: string }) => r.id)
      const { data } = await supabase
        .from('survey_answers')
        .select('question_id, rating, comment, selected_options, text_value')
        .in('response_id', responseIds)
      return (data ?? []) as AnswerRow[]
    },
    enabled: !!surveyId,
  })

  const { data: responseCount } = useQuery({
    queryKey: ['survey-response-count', surveyId],
    queryFn: async () => {
      const { count } = await supabase
        .from('survey_responses')
        .select('id', { count: 'exact', head: true })
        .eq('survey_id', surveyId)
      return count ?? 0
    },
    enabled: !!surveyId,
  })

  const { data: totalEmployees } = useQuery({
    queryKey: ['active-employee-count', organization?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organization!.id)
        .eq('status', 'active')
      return count ?? 0
    },
    enabled: !!organization?.id,
  })

  const questions = (survey?.survey_questions ?? []) as QuestionInfo[]

  // Aggregate stats
  const stats = useMemo(() => {
    if (!answers?.length || !questions.length) return { avgScore: 0, totalResponses: responseCount ?? 0 }
    const questionMap = new Map(questions.map((q) => [q.id, q]))
    let scoreSum = 0
    let scoreCount = 0
    for (const answer of answers) {
      const q = questionMap.get(answer.question_id)
      if (!q) continue
      const score = computeAnswerScore(answer, q)
      if (score != null) {
        scoreSum += score
        scoreCount += 1
      }
    }
    return {
      avgScore: scoreCount > 0 ? scoreSum / scoreCount : 0,
      totalResponses: responseCount ?? 0,
    }
  }, [answers, questions, responseCount])

  const responseRate = useMemo(() => {
    if (!totalEmployees || totalEmployees === 0) return 0
    return Math.round(((stats.totalResponses) / totalEmployees) * 100)
  }, [stats.totalResponses, totalEmployees])

  // Per-category aggregation
  const categoryScores = useMemo(() => {
    if (!answers?.length || !questions.length) return []
    const questionMap = new Map(questions.map((q) => [q.id, q]))
    const catAgg: Record<string, { total: number; count: number }> = {}
    for (const answer of answers) {
      const q = questionMap.get(answer.question_id)
      if (!q) continue
      const score = computeAnswerScore(answer, q)
      if (score == null) continue
      if (!catAgg[q.category]) catAgg[q.category] = { total: 0, count: 0 }
      catAgg[q.category].total += score
      catAgg[q.category].count += 1
    }
    return Object.entries(catAgg).map(([category, { total, count }]) => ({
      category: category as SurveyCategory,
      label: CATEGORY_LABELS[category as SurveyCategory] ?? category,
      score: Math.round(total / count),
      responseCount: count,
    })).sort((a, b) => b.score - a.score)
  }, [answers, questions])

  // Per-question breakdown
  const questionBreakdown = useMemo(() => {
    if (!answers?.length || !questions.length) return []
    const qAgg = new Map<string, {
      ratingDistribution: number[]
      optionCounts: Map<string, number>
      textResponses: string[]
      scoreTotal: number
      scoreCount: number
      totalResponses: number
    }>()

    for (const answer of answers) {
      const q = questions.find((qq) => qq.id === answer.question_id)
      if (!q) continue
      if (!qAgg.has(q.id)) {
        qAgg.set(q.id, {
          ratingDistribution: [0, 0, 0, 0, 0],
          optionCounts: new Map(),
          textResponses: [],
          scoreTotal: 0,
          scoreCount: 0,
          totalResponses: 0,
        })
      }
      const agg = qAgg.get(q.id)!
      agg.totalResponses += 1

      const qType = q.question_type ?? 'rating'
      if (qType === 'rating' && answer.rating != null) {
        const idx = Math.min(Math.max(answer.rating - 1, 0), 4)
        agg.ratingDistribution[idx] += 1
      }
      if ((qType === 'single_select' || qType === 'multi_select') && answer.selected_options) {
        for (const opt of answer.selected_options) {
          agg.optionCounts.set(opt, (agg.optionCounts.get(opt) ?? 0) + 1)
        }
      }
      if (qType === 'text' && answer.text_value) {
        agg.textResponses.push(answer.text_value)
      }

      const score = computeAnswerScore(answer, q)
      if (score != null) {
        agg.scoreTotal += score
        agg.scoreCount += 1
      }
    }

    return questions
      .sort((a, b) => a.question_order - b.question_order)
      .map((q) => {
        const agg = qAgg.get(q.id)
        if (!agg || agg.totalResponses === 0) return null
        return {
          ...q,
          ratingDistribution: agg.ratingDistribution,
          optionCounts: agg.optionCounts,
          textResponses: agg.textResponses,
          avgScore: agg.scoreCount > 0 ? agg.scoreTotal / agg.scoreCount : null,
          totalResponses: agg.totalResponses,
        }
      })
      .filter(Boolean) as (QuestionInfo & {
        ratingDistribution: number[]
        optionCounts: Map<string, number>
        textResponses: string[]
        avgScore: number | null
        totalResponses: number
      })[]
  }, [answers, questions])

  // Individual responses grouped by employee
  const { data: individualResponses } = useQuery({
    queryKey: ['survey-individual-responses', surveyId],
    queryFn: async () => {
      const { data: responses } = await supabase
        .from('survey_responses')
        .select('id, employee_id, submitted_at, is_anonymous, employee:employees(first_name, last_name, email, employee_code, department:departments!department_id(name))')
        .eq('survey_id', surveyId)
        .order('submitted_at', { ascending: false })
      if (!responses?.length) return []

      const responseIds = responses.map((r: any) => r.id)
      const { data: allAnswers } = await supabase
        .from('survey_answers')
        .select('response_id, question_id, rating, comment, selected_options, text_value')
        .in('response_id', responseIds)

      // Group answers by response_id
      const answersByResponse = new Map<string, AnswerWithResponse[]>()
      for (const a of (allAnswers ?? []) as AnswerWithResponse[]) {
        if (!answersByResponse.has(a.response_id)) answersByResponse.set(a.response_id, [])
        answersByResponse.get(a.response_id)!.push(a)
      }

      return responses.map((r: any) => ({
        id: r.id,
        employeeId: r.employee_id,
        submittedAt: r.submitted_at,
        isAnonymous: r.is_anonymous,
        employeeName: r.is_anonymous ? 'Anonymous' : `${r.employee?.first_name ?? ''} ${r.employee?.last_name ?? ''}`.trim(),
        employeeCode: r.is_anonymous ? null : r.employee?.employee_code,
        employeeEmail: r.is_anonymous ? null : r.employee?.email,
        department: r.is_anonymous ? null : (one(r.employee?.department))?.name,
        answers: answersByResponse.get(r.id) ?? [],
      }))
    },
    enabled: !!surveyId,
  })

  const [expandedResponseId, setExpandedResponseId] = useState<string | null>(null)
  const [showTextResponses, setShowTextResponses] = useState<Set<string>>(new Set())

  const isLoading = surveyLoading || answersLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Surveys
        </Button>
        <p className="text-muted-foreground">Survey not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Surveys
        </Button>
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-semibold">{survey.title}</h2>
          <Badge variant={getStatusVariant(survey.status)}>
            {survey.status.charAt(0).toUpperCase() + survey.status.slice(1)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {new Date(survey.start_date).toLocaleDateString()} &mdash;{' '}
          {new Date(survey.end_date).toLocaleDateString()}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Responses</p>
            <p className="text-2xl font-bold">{stats.totalResponses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Response Rate</p>
            <p className="text-2xl font-bold">{responseRate}%</p>
            <p className="text-xs text-muted-foreground">
              {stats.totalResponses} of ~{totalEmployees ?? 0} employees
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Average Score</p>
            <p className="text-2xl font-bold">
              {stats.avgScore > 0 ? Math.round(stats.avgScore) : '0'} / 100
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Per-Category Scores */}
      {categoryScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per-Category Scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {categoryScores.map((cat) => (
              <div key={cat.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{cat.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {cat.responseCount} responses
                    </span>
                    <span
                      className={`inline-flex min-w-[2.5rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${getScoreClasses(cat.score)}`}
                    >
                      {cat.score}
                    </span>
                  </div>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted">
                  <div
                    className={`h-2.5 rounded-full ${getScoreColor(cat.score)}`}
                    style={{ width: `${cat.score}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Per-Question Breakdown */}
      {questionBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per-Question Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Question</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-center min-w-[200px]">Distribution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questionBreakdown.map((q) => {
                  const qType = q.question_type ?? 'rating'
                  return (
                    <TableRow key={q.id}>
                      <TableCell className="font-medium text-sm">
                        {q.question_text}
                        <div className="mt-0.5">
                          <Badge variant="outline" className="text-[10px]">
                            {CATEGORY_LABELS[q.category] ?? q.category}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] whitespace-nowrap">
                          {qType === 'rating' ? 'Rating'
                            : qType === 'single_select' ? 'Single'
                            : qType === 'multi_select' ? 'Multi'
                            : 'Text'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {q.avgScore != null ? (
                          <span
                            className={`inline-flex min-w-[2.5rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${getScoreClasses(Math.round(q.avgScore))}`}
                          >
                            {Math.round(q.avgScore)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">&mdash;</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {/* Rating distribution */}
                        {qType === 'rating' && (() => {
                          const maxDist = Math.max(...q.ratingDistribution, 1)
                          return (
                            <div className="flex items-end gap-1 justify-center h-8">
                              {q.ratingDistribution.map((count, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-0.5">
                                  <div
                                    className={`w-5 rounded-sm ${RATING_COLORS[idx]}`}
                                    style={{ height: `${Math.max((count / maxDist) * 24, 2)}px` }}
                                    title={`Rating ${idx + 1}: ${count}`}
                                  />
                                  <span className="text-[10px] text-muted-foreground">{idx + 1}</span>
                                </div>
                              ))}
                            </div>
                          )
                        })()}

                        {/* Select option distribution */}
                        {(qType === 'single_select' || qType === 'multi_select') && (() => {
                          const opts = q.options ?? []
                          const maxCount = Math.max(...Array.from(q.optionCounts.values()), 1)
                          return (
                            <div className="space-y-1">
                              {opts.map((opt, idx) => {
                                const count = q.optionCounts.get(opt.value) ?? 0
                                return (
                                  <div key={opt.value} className="flex items-center gap-2 text-xs">
                                    <span className="w-16 truncate text-right text-muted-foreground" title={opt.label}>
                                      {opt.label}
                                    </span>
                                    <div className="flex-1 h-3 bg-muted rounded-sm overflow-hidden">
                                      <div
                                        className={`h-full rounded-sm ${OPTION_COLORS[idx % OPTION_COLORS.length]}`}
                                        style={{ width: `${(count / maxCount) * 100}%` }}
                                      />
                                    </div>
                                    <span className="w-6 text-right text-muted-foreground">{count}</span>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })()}

                        {/* Text responses summary */}
                        {qType === 'text' && (
                          <div className="text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setShowTextResponses((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(q.id)) next.delete(q.id)
                                  else next.add(q.id)
                                  return next
                                })
                              }}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <MessageSquare className="h-3 w-3" />
                              {q.textResponses.length} responses
                            </button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {/* Expanded text responses */}
            {questionBreakdown
              .filter((q) => (q.question_type ?? 'rating') === 'text' && showTextResponses.has(q.id))
              .map((q) => (
                <div key={q.id} className="mt-4 p-3 border rounded-lg bg-muted/30">
                  <p className="text-sm font-medium mb-2">{q.question_text}</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {q.textResponses.map((text, idx) => (
                      <p key={idx} className="text-sm text-muted-foreground bg-white border rounded px-3 py-2">
                        {text}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Individual Responses */}
      {individualResponses && individualResponses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Individual Responses ({individualResponses.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {individualResponses.map((resp) => {
              const isExpanded = expandedResponseId === resp.id
              // Calculate avg score for this response
              const questionMap = new Map(questions.map((q) => [q.id, q]))
              let respScoreSum = 0
              let respScoreCount = 0
              for (const a of resp.answers) {
                const q = questionMap.get(a.question_id)
                if (!q) continue
                const s = computeAnswerScore(a, q)
                if (s != null) { respScoreSum += s; respScoreCount += 1 }
              }
              const avgScore = respScoreCount > 0 ? Math.round(respScoreSum / respScoreCount) : null

              return (
                <div key={resp.id} className="border rounded-lg">
                  <button
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                    onClick={() => setExpandedResponseId(isExpanded ? null : resp.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs bg-muted">
                        {resp.isAnonymous ? (
                          <User className="h-4 w-4" />
                        ) : (
                          getInitials(resp.employeeName.split(' ')[0] || '', resp.employeeName.split(' ')[1] || '')
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{resp.employeeName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {resp.isAnonymous
                          ? 'Anonymous response'
                          : `${resp.employeeCode ?? ''} ${resp.department ? `• ${resp.department}` : ''}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {new Date(resp.submittedAt).toLocaleDateString()}
                      </p>
                      {avgScore != null && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${getScoreClasses(avgScore)}`}>
                          {avgScore}/100
                        </span>
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t px-4 py-3 space-y-3 bg-muted/20">
                      {questions
                        .sort((a, b) => a.question_order - b.question_order)
                        .map((q) => {
                          const answer = resp.answers.find((a) => a.question_id === q.id)
                          const qType = q.question_type ?? 'rating'
                          return (
                            <div key={q.id} className="space-y-1">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <p className="text-sm text-muted-foreground">{q.question_text}</p>
                                  <div className="flex gap-1 mt-0.5">
                                    <Badge variant="outline" className="text-[10px]">
                                      {CATEGORY_LABELS[q.category] ?? q.category}
                                    </Badge>
                                    <Badge variant="secondary" className="text-[10px]">
                                      {qType === 'rating' ? 'Rating' : qType === 'single_select' ? 'Single' : qType === 'multi_select' ? 'Multi' : 'Text'}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="shrink-0">
                                  {/* Rating display */}
                                  {qType === 'rating' && (
                                    <div className="flex items-center gap-0.5">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          className={`h-4 w-4 ${
                                            answer && answer.rating != null && star <= answer.rating
                                              ? 'fill-amber-400 text-amber-400'
                                              : 'text-gray-300'
                                          }`}
                                        />
                                      ))}
                                      <span className="text-sm font-medium ml-1">
                                        {answer?.rating ?? '-'}
                                      </span>
                                    </div>
                                  )}
                                  {/* Select display */}
                                  {(qType === 'single_select' || qType === 'multi_select') && answer?.selected_options && (
                                    <div className="flex flex-wrap gap-1 justify-end">
                                      {answer.selected_options.map((v) => (
                                        <Badge key={v} variant="secondary" className="text-xs">
                                          {getOptionLabel(q.options, v)}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                  {/* No answer */}
                                  {!answer && (
                                    <span className="text-xs text-muted-foreground">Not answered</span>
                                  )}
                                </div>
                              </div>
                              {/* Text answer */}
                              {qType === 'text' && answer?.text_value && (
                                <p className="text-sm text-muted-foreground bg-white border rounded px-3 py-2">
                                  {answer.text_value}
                                </p>
                              )}
                              {/* Comment */}
                              {answer?.comment && (
                                <p className="text-sm text-muted-foreground bg-white border rounded px-3 py-2 italic">
                                  &ldquo;{answer.comment}&rdquo;
                                </p>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* No data state */}
      {!answers?.length && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No responses have been submitted for this survey yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

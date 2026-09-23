import { useState } from 'react'
import { ClipboardList, Clock, MessageSquare } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useActiveSurveysForEmployee } from '@/features/reports/hooks/use-surveys'
import { SurveyTakeDialog } from '@/features/reports/components/survey-take-dialog'
import { formatDate } from '@/lib/utils'
import type { SurveyWithQuestions } from '@/types/database.types'

interface Props {
  employee: {
    id: string
    gender?: string | null
    department_id?: string | null
    designation_id?: string | null
    employment_type?: string | null
    status?: string | null
    date_of_joining?: string | null
    date_of_birth?: string | null
  } | null
}

function daysLeft(endDate: string | null): number | null {
  if (!endDate) return null
  const end = new Date(endDate)
  const today = new Date()
  end.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.round((end.getTime() - today.getTime()) / 86400000)
}

export function MySurveysTab({ employee }: Props) {
  const { data: surveys, isLoading } = useActiveSurveysForEmployee(employee)
  const [activeSurvey, setActiveSurvey] = useState<SurveyWithQuestions | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    )
  }

  const pending = (surveys ?? []) as SurveyWithQuestions[]

  if (pending.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 rounded-full bg-emerald-50 p-3">
            <ClipboardList className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="font-medium">You are all caught up</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No surveys are waiting for your response right now.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {pending.map((survey) => {
          const left = daysLeft(survey.end_date)
          const closingSoon = left !== null && left <= 3
          const questionCount = survey.survey_questions?.length ?? 0

          return (
            <Card key={survey.id}>
              <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-violet-50 p-2">
                    <MessageSquare className="h-5 w-5 text-violet-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{survey.title}</p>
                      {survey.is_anonymous && (
                        <Badge variant="secondary" className="text-xs">Anonymous</Badge>
                      )}
                      {closingSoon && (
                        <Badge className="bg-amber-100 text-amber-800 text-xs">
                          {left !== null && left <= 0 ? 'Closes today' : `${left} day${left === 1 ? '' : 's'} left`}
                        </Badge>
                      )}
                    </div>
                    {survey.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{survey.description}</p>
                    )}
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {questionCount} question{questionCount === 1 ? '' : 's'}
                      {survey.end_date && <> · open till {formatDate(survey.end_date)}</>}
                    </p>
                  </div>
                </div>
                <Button size="sm" className="shrink-0" onClick={() => setActiveSurvey(survey)}>
                  Respond
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {activeSurvey && (
        <SurveyTakeDialog
          open={!!activeSurvey}
          onOpenChange={(open) => !open && setActiveSurvey(null)}
          survey={activeSurvey}
        />
      )}
    </>
  )
}

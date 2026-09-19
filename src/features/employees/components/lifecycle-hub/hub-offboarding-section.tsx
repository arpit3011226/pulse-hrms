import { useState } from 'react'
import { CheckCircle2, Circle, AlertTriangle, CheckCheck, Star, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useExitRecord, useUpdateExitRecord } from '../../hooks/use-employee-lifecycle'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface HubOffboardingSectionProps {
  employeeId: string
}

interface ChecklistItem {
  key: string
  label: string
  done: boolean
}

const EXIT_SURVEY_CATEGORIES = [
  'Work-life balance',
  'Growth opportunities',
  'Team collaboration',
]

export function HubOffboardingSection({ employeeId }: HubOffboardingSectionProps) {
  const { data: exitRecord } = useExitRecord(employeeId)
  const updateExit = useUpdateExitRecord()

  const [surveyRatings, setSurveyRatings] = useState<Record<string, number>>({})
  const [surveySubmitted, setSurveySubmitted] = useState(false)

  const record = exitRecord as typeof exitRecord & {
    clearance_status?: string
    exit_interview_done?: boolean
    exit_interview_notes?: string
    status?: string
  } | null

  if (!record) return null

  const isInterviewDone = record.exit_interview_done || false
  const clearanceStatus = String(record.clearance_status || 'pending')

  // Derive checklist from exit record state
  const checklist: ChecklistItem[] = [
    { key: 'access', label: 'Revoke system access', done: clearanceStatus !== 'pending' },
    { key: 'equipment', label: 'Equipment return', done: clearanceStatus === 'completed' || clearanceStatus === 'cleared' },
    { key: 'knowledge', label: 'Knowledge transfer', done: clearanceStatus === 'completed' || clearanceStatus === 'cleared' },
    { key: 'settlement', label: 'Final settlement processing', done: clearanceStatus === 'completed' || clearanceStatus === 'cleared' },
  ]

  const completedCount = checklist.filter((c) => c.done).length

  // Parse existing survey data
  let existingSurvey: Record<string, number> | null = null
  if (isInterviewDone && record.exit_interview_notes) {
    try {
      existingSurvey = JSON.parse(record.exit_interview_notes)
    } catch {
      // Not JSON, that's fine
    }
  }

  const handleSubmitSurvey = async () => {
    if (Object.keys(surveyRatings).length < EXIT_SURVEY_CATEGORIES.length) {
      toast.error('Please rate all categories')
      return
    }
    try {
      await updateExit.mutateAsync({
        id: record.id,
        exit_interview_done: true,
        exit_interview_notes: JSON.stringify(surveyRatings),
      })
      setSurveySubmitted(true)
      toast.success('Exit survey submitted')
    } catch {
      toast.error('Failed to submit survey')
    }
  }

  const displaySurvey = existingSurvey || (surveySubmitted ? surveyRatings : null)

  return (
    <div className="space-y-4">
      {/* Offboarding checklist */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Offboarding</h3>
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
            Exit
          </span>
        </div>

        <div className="space-y-2">
          {checklist.map((item) => (
            <div
              key={item.key}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3',
                item.done ? 'bg-white' : 'bg-muted/20'
              )}
            >
              {item.done ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/30 shrink-0" />
              )}
              <span className={cn('text-sm', item.done ? 'text-foreground' : 'text-muted-foreground')}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Alert banner */}
        {completedCount > 0 && completedCount < checklist.length && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-600">
              Access removed -- IT notified
            </p>
          </div>
        )}

        {completedCount === checklist.length && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5">
            <CheckCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <p className="text-sm text-emerald-600">
              Offboarding complete -- All items cleared
            </p>
          </div>
        )}
      </div>

      {/* Exit survey */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Star className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Exit Survey</h3>
          {(isInterviewDone || surveySubmitted) && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
              {displaySurvey ? 'Submitted' : 'Triggered'}
            </span>
          )}
        </div>

        <div className="rounded-lg border bg-white p-4">
          {displaySurvey ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Exit feedback form</p>
                <span className="text-xs font-semibold text-amber-600">Submitted</span>
              </div>
              {EXIT_SURVEY_CATEGORIES.map((cat) => (
                <div key={cat} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-foreground">{cat}</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < (displaySurvey[cat] || 0)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-muted-foreground/20'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                <CheckCheck className="h-4 w-4 text-emerald-500" />
                <p className="text-xs text-emerald-600">Exit survey complete -- HR notified</p>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-medium mb-3">Exit feedback form</p>
              {EXIT_SURVEY_CATEGORIES.map((cat) => (
                <div key={cat} className="flex items-center justify-between py-2">
                  <span className="text-sm text-foreground">{cat}</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() =>
                          setSurveyRatings((prev) => ({ ...prev, [cat]: i + 1 }))
                        }
                        className="p-0.5 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`h-5 w-5 ${
                            i < (surveyRatings[cat] || 0)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-muted-foreground/25 hover:text-amber-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <Button
                size="sm"
                className="mt-3 w-full"
                onClick={handleSubmitSurvey}
                disabled={updateExit.isPending}
              >
                Submit Survey
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

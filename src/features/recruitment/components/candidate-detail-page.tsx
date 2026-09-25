import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft, Mail, Phone, Briefcase, Building2, FileText, ExternalLink,
  Calendar, Star, Lock, Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { useCandidateProfile } from '../hooks/use-recruitment'
import { usePermissions } from '@/hooks/use-permissions'
import { usePersonContext } from '@/features/auth/hooks/use-identity'
import { one } from '@/lib/supabase-embed'
import { formatDate, formatCurrency, getInitials, humanizeLabel } from '@/lib/utils'

/** Applications the panel can still act on; matches application_is_open() in the database. */
const OPEN_STATUSES = ['new', 'screening', 'in_progress', 'offer', 'on_hold']

interface CandidateDetailPageProps {
  candidateId: string
}

/**
 * One page holding everything about a candidate — who they are, the roles they
 * applied for, every interview and what the panel said.
 *
 * Before this the same person was spread across the Candidates tab and the
 * Applications tab with no way to open either, so a hiring manager had to read
 * two tables side by side and join them in their head.
 *
 * What a viewer sees depends on their part in the hiring:
 *   * HR, admin, leadership and the hiring manager see the whole record.
 *   * An interviewer sees the candidate and their CV while the application is
 *     open, and keeps their own interviews and feedback afterwards. They never
 *     see contact details or the offer, which is the usual practice — the panel
 *     judges the person, it does not negotiate with them.
 *
 * Row-level security already draws most of this line, so anything hidden here
 * is hidden in the database too. The checks below are about presenting an
 * honest screen, not about being the guard.
 */
export function CandidateDetailPage({ candidateId }: CandidateDetailPageProps) {
  const { canManageRecruitment, isAdmin, isHR, isLeadership } = usePermissions()
  const { data: me } = usePersonContext()
  const { data, isLoading } = useCandidateProfile(candidateId)

  const isRecruiter = canManageRecruitment || isAdmin || isHR || isLeadership
  const myEmployeeId = me?.employee_id ?? null

  const candidate = data?.candidate
  const applications = useMemo(() => data?.applications ?? [], [data])
  const interviews = useMemo(() => data?.interviews ?? [], [data])
  const offers = useMemo(() => data?.offers ?? [], [data])

  /**
   * A hiring manager is not a role in this system — it is a column on the
   * requisition. If any application they can read points at a requisition they
   * own, they are the hiring manager for this candidate.
   */
  const isHiringManager = useMemo(() => {
    if (!myEmployeeId) return false
    return applications.some((a) => {
      const req = one(a.job_requisition as unknown) as { hiring_manager_id?: string | null } | undefined
      return req?.hiring_manager_id === myEmployeeId
    })
  }, [applications, myEmployeeId])

  const seesEverything = isRecruiter || isHiringManager

  /** The interviews this person ran themselves, which they keep for good. */
  const myInterviews = useMemo(
    () => interviews.filter((i) => i.interviewer_id === myEmployeeId),
    [interviews, myEmployeeId]
  )

  const visibleInterviews = seesEverything ? interviews : myInterviews

  const hasOpenApplication = applications.some((a) => OPEN_STATUSES.includes(a.status))

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // Row-level security returned nothing. For an interviewer after the hire this
  // is the expected answer, so it is worded as a rule rather than a failure.
  if (!candidate) {
    return (
      <div className="space-y-5">
        <BackLink />
        <EmptyState
          icon={Lock}
          title="You cannot see this candidate"
          description={
            myInterviews.length > 0
              ? 'The application has closed, so the panel no longer sees the candidate. Your own interviews and feedback are on the Interviews tab.'
              : 'Candidate records are open to HR, the hiring manager, and the interview panel while the application is running.'
          }
        />
      </div>
    )
  }

  const fullName = `${candidate.first_name} ${candidate.last_name}`

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <BackLink />
        {seesEverything && (
          <Button variant="outline" size="sm" asChild>
            <Link to="/recruitment">
              <Pencil className="mr-2 h-3.5 w-3.5" /> Back to Candidates
            </Link>
          </Button>
        )}
      </div>

      {/* Who they are */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="text-base">
                  {getInitials(candidate.first_name, candidate.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h1 className="text-xl font-semibold">{fullName}</h1>
                <p className="text-sm text-muted-foreground">
                  {candidate.current_designation || 'Role not recorded'}
                  {candidate.current_company ? ` at ${candidate.current_company}` : ''}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <StatusBadge status={candidate.source} />
                  {candidate.experience_years != null && (
                    <Badge variant="outline">
                      {candidate.experience_years} yrs experience
                    </Badge>
                  )}
                  {candidate.in_talent_pool && <Badge variant="secondary">Talent pool</Badge>}
                </div>
              </div>
            </div>

            {candidate.resume_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer">
                  <FileText className="mr-2 h-3.5 w-3.5" /> Open resume
                  <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </Button>
            )}
          </div>

          <Separator className="my-5" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {seesEverything ? (
              <>
                <Field icon={Mail} label="Email" value={candidate.email} />
                <Field icon={Phone} label="Phone" value={candidate.phone || 'Not given'} />
              </>
            ) : (
              <div className="sm:col-span-2">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" /> Contact details
                </p>
                <p className="pt-1 text-sm text-muted-foreground">
                  Held by the recruitment team. The panel does not need them.
                </p>
              </div>
            )}
            <Field
              icon={Building2}
              label="Current company"
              value={candidate.current_company || 'Not given'}
            />
            <Field
              icon={Briefcase}
              label="Current role"
              value={candidate.current_designation || 'Not given'}
            />
          </div>

          {seesEverything && candidate.notes && (
            <>
              <Separator className="my-5" />
              <div>
                <p className="text-xs text-muted-foreground">Recruiter notes</p>
                <p className="whitespace-pre-wrap pt-1 text-sm">{candidate.notes}</p>
              </div>
            </>
          )}

          {!seesEverything && (
            <p className="pt-4 text-xs text-muted-foreground">
              You are on the interview panel for {fullName}.
              {hasOpenApplication
                ? ' You can see their background and CV while the application is running.'
                : ' The application has closed, so only your own interviews remain.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Roles applied for */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              This candidate has not been put forward for a role yet.
            </p>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => {
                const req = one(app.job_requisition as unknown) as
                  | {
                      title?: string
                      requisition_code?: string
                      location?: string | null
                      employment_type?: string | null
                      department?: { name?: string } | { name?: string }[] | null
                    }
                  | undefined
                const stage = one(app.current_stage as unknown) as
                  | { stage_name?: string }
                  | undefined
                const dept = one(req?.department as unknown) as { name?: string } | undefined

                return (
                  <div
                    key={app.id}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium">{req?.title || 'Role removed'}</p>
                        <p className="text-xs text-muted-foreground">
                          {[
                            req?.requisition_code,
                            dept?.name,
                            req?.location,
                            req?.employment_type ? humanizeLabel(req.employment_type) : null,
                          ]
                            .filter(Boolean)
                            .join(' · ') || 'No further details'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {stage?.stage_name && (
                          <Badge variant="secondary">{stage.stage_name}</Badge>
                        )}
                        <StatusBadge status={app.status} />
                      </div>
                    </div>
                    <p className="pt-2 text-xs text-muted-foreground">
                      Applied {formatDate(app.applied_date)}
                    </p>
                    {seesEverything && app.rejection_reason && (
                      <p className="pt-2 text-xs text-muted-foreground">
                        Reason: {app.rejection_reason}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interviews and what the panel said */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {seesEverything ? 'Interviews and feedback' : 'Your interviews'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {visibleInterviews.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              {seesEverything
                ? 'No interview has been scheduled yet.'
                : 'You have not interviewed this candidate.'}
            </p>
          ) : (
            <div className="space-y-3">
              {visibleInterviews.map((iv) => {
                const stage = one(iv.interview_stage as unknown) as
                  | { stage_name?: string }
                  | undefined
                const interviewer = one(iv.interviewer as unknown) as
                  | { first_name?: string; last_name?: string }
                  | undefined
                const feedback = one(iv.interview_feedback as unknown) as
                  | {
                      rating?: number | null
                      recommendation?: string
                      strengths?: string | null
                      areas_for_improvement?: string | null
                      comments?: string | null
                      interviewer_id?: string
                    }
                  | undefined

                // The panel keeps its own written feedback. Someone else's view
                // of the candidate is for the hiring manager and HR to read.
                const mayReadFeedback =
                  seesEverything || feedback?.interviewer_id === myEmployeeId

                return (
                  <div key={iv.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {stage?.stage_name || 'Interview'}
                          {interviewer
                            ? ` · ${interviewer.first_name} ${interviewer.last_name}`
                            : ''}
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(iv.scheduled_start)} · {humanizeLabel(iv.mode)}
                        </p>
                      </div>
                      <StatusBadge status={iv.status} />
                    </div>

                    {feedback && mayReadFeedback && (
                      <div className="mt-3 space-y-2 rounded-md bg-muted/50 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {feedback.rating != null && (
                            <span className="flex items-center gap-1 text-sm font-medium">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              {feedback.rating}/5
                            </span>
                          )}
                          {feedback.recommendation && (
                            <Badge variant="outline">
                              {humanizeLabel(feedback.recommendation)}
                            </Badge>
                          )}
                        </div>
                        {feedback.strengths && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">Strengths: </span>
                            {feedback.strengths}
                          </p>
                        )}
                        {feedback.areas_for_improvement && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">To work on: </span>
                            {feedback.areas_for_improvement}
                          </p>
                        )}
                        {feedback.comments && (
                          <p className="whitespace-pre-wrap text-sm">{feedback.comments}</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* The offer stays with HR and the hiring manager. */}
      {seesEverything && offers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Offers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {offers.map((offer) => (
                <div key={offer.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium">{offer.offered_designation}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(offer.offered_ctc)} per year
                        {offer.joining_date
                          ? ` · joining ${formatDate(offer.joining_date)}`
                          : ''}
                      </p>
                    </div>
                    <StatusBadge status={offer.offer_status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function BackLink() {
  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" asChild>
        <Link to="/recruitment"><ArrowLeft className="h-4 w-4" /></Link>
      </Button>
      <h2 className="text-lg font-semibold">Candidate</h2>
    </div>
  )
}

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail
  label: string
  value: string
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="pt-1 text-sm">{value}</p>
    </div>
  )
}

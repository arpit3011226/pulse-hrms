import { CalendarDays, CheckCircle2, Loader2, MapPin, Briefcase } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useMyCandidateView } from '../hooks/use-recruitment'
import { CandidateDocumentsCard } from './candidate-documents-card'
import { OfferDecisionCard } from './offer-decision-card'
import { formatDate } from '@/lib/utils'

const APPLICATION_STEPS = ['new', 'screening', 'interview', 'offer', 'hired']

const STATUS_COPY: Record<string, string> = {
  new: 'We have received your application',
  screening: 'Your application is being reviewed',
  interview: 'You are in the interview stage',
  offer: 'An offer has been made to you',
  hired: 'Welcome aboard',
  rejected: 'Not taken forward this time',
  withdrawn: 'You withdrew this application',
}

export function CandidatePortalPage() {
  const { profile } = useAuth()
  const { data, isLoading } = useMyCandidateView(profile?.id)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your application…
      </div>
    )
  }

  if (!data) {
    return (
      <div>
        <PageHeader title="My Application" description="Where your application stands." />
        <Card>
          <CardContent className="py-16 text-center">
            <p className="font-medium">No application found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This login is not linked to a candidate record. If you have applied recently, give it
              a little time or get in touch with the recruiter.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { candidate, applications, interviews, offers } = data
  const upcoming = (interviews as Array<Record<string, unknown>>).filter(
    (i) => i.status === 'scheduled' && new Date(i.scheduled_start as string) >= new Date()
  )
  /**
   * The offer to show them.
   *
   * Includes 'rejected' as well as 'sent' and 'accepted': once somebody has
   * answered, the answer should stay on their screen. Hiding a declined
   * offer leaves them wondering whether it registered at all.
   */
  const liveOffer = (offers as Array<Record<string, unknown>>).find(
    (o) =>
      o.offer_status === 'sent' ||
      o.offer_status === 'accepted' ||
      o.offer_status === 'rejected'
  )

  return (
    <div>
      <PageHeader
        title={`Hello, ${candidate.first_name}`}
        description="Where your application stands, and what happens next."
      />

      <div className="space-y-6">
        {/* Applications */}
        {(applications as Array<Record<string, unknown>>).map((app) => {
          const req = app.job_requisition as Record<string, unknown> | null
          const status = app.status as string
          const stepIndex = APPLICATION_STEPS.indexOf(status)
          const isClosed = status === 'rejected' || status === 'withdrawn'

          return (
            <Card key={app.id as string}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">
                      {(req?.title as string) ?? 'Your application'}
                    </CardTitle>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {req?.location ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {req.location as string}
                        </span>
                      ) : null}
                      {req?.employment_type ? (
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {(req.employment_type as string).replace('_', ' ')}
                        </span>
                      ) : null}
                      {app.applied_date ? (
                        <span>Applied {formatDate(app.applied_date as string)}</span>
                      ) : null}
                    </div>
                  </div>
                  <Badge
                    className={
                      status === 'hired'
                        ? 'bg-emerald-100 text-emerald-800'
                        : isClosed
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-blue-100 text-blue-800'
                    }
                  >
                    {STATUS_COPY[status] ?? status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {!isClosed && (
                  <div className="flex items-center gap-1">
                    {APPLICATION_STEPS.map((step, i) => {
                      const done = stepIndex >= i
                      return (
                        <div key={step} className="flex flex-1 items-center gap-1">
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] ${
                              done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                          </div>
                          {i < APPLICATION_STEPS.length - 1 && (
                            <div
                              className={`h-0.5 flex-1 ${stepIndex > i ? 'bg-primary' : 'bg-muted'}`}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                {!isClosed && (
                  <div className="mt-2 flex justify-between text-[11px] capitalize text-muted-foreground">
                    {APPLICATION_STEPS.map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}

        {/* What we have asked them to send in */}
        <CandidateDocumentsCard candidateId={candidate.id as string} />

        {/* Upcoming interviews */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" /> Your interviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Nothing scheduled at the moment. We will be in touch.
              </p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((i) => {
                  const stage = i.interview_stage as Record<string, unknown> | null
                  return (
                    <div key={i.id as string} className="rounded-md border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">
                            {(stage?.stage_name as string) ?? 'Interview'}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatDate(i.scheduled_start as string)} ·{' '}
                            {new Date(i.scheduled_start as string).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {(i.mode as string) ?? 'video'}
                        </Badge>
                      </div>
                      {i.location_or_link ? (
                        <p className="mt-2 break-all text-xs text-muted-foreground">
                          {i.location_or_link as string}
                        </p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Offer — theirs to answer, not a message to ring somebody */}
        {liveOffer && (
          <OfferDecisionCard
            offer={{
              id: liveOffer.id as string,
              offered_designation: (liveOffer.offered_designation as string) ?? null,
              offered_ctc: (liveOffer.offered_ctc as number) ?? null,
              joining_date: (liveOffer.joining_date as string) ?? null,
              valid_until: (liveOffer.valid_until as string) ?? null,
              offer_status: liveOffer.offer_status as string,
              accepted_name: (liveOffer.accepted_name as string) ?? null,
              accepted_at: (liveOffer.accepted_at as string) ?? null,
              decline_reason: (liveOffer.decline_reason as string) ?? null,
            }}
            candidateName={`${candidate.first_name} ${candidate.last_name}`}
          />
        )}
      </div>
    </div>
  )
}

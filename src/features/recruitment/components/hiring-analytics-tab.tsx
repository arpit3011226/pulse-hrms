import { useMemo } from 'react'
import { Clock, TrendingDown, Target, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  useJobRequisitions, useCandidateApplications, useOfferLetters, useInterviewStages,
} from '../hooks/use-recruitment'

function Stat({
  icon: Icon, label, value, hint, tone,
}: {
  icon: React.ElementType
  label: string
  value: string
  hint?: string
  tone: string
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-4">
        <div className={`rounded-lg p-2.5 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

export function HiringAnalyticsTab() {
  const { data: requisitions } = useJobRequisitions()
  const { data: applications } = useCandidateApplications()
  const { data: offers } = useOfferLetters()
  const { data: stages } = useInterviewStages()

  const stats = useMemo(() => {
    const reqs = requisitions ?? []
    const apps = (applications ?? []) as Array<{
      status: string; applied_date: string | null; current_stage_id: string | null
    }>
    const offs = (offers ?? []) as Array<{
      offer_status: string; sent_at?: string | null; responded_at?: string | null
      candidate_application_id: string
    }>

    const openRoles = reqs.filter((r) => r.status === 'open').length
    const totalHeadcount = reqs
      .filter((r) => r.status === 'open')
      .reduce((s, r) => s + (r.headcount ?? 0), 0)

    // Offer acceptance
    const responded = offs.filter(
      (o) => o.offer_status === 'accepted' || o.offer_status === 'rejected'
    )
    const accepted = offs.filter((o) => o.offer_status === 'accepted')
    const acceptanceRate =
      responded.length === 0 ? null : Math.round((accepted.length / responded.length) * 100)

    // Time to hire: application date to offer acceptance
    const appById = new Map(
      (applications ?? []).map((a) => [
        (a as { id: string }).id,
        (a as { applied_date: string | null }).applied_date,
      ])
    )
    const durations = accepted
      .map((o) => {
        const applied = appById.get(o.candidate_application_id)
        if (!applied || !o.responded_at) return null
        const days = Math.round(
          (new Date(o.responded_at).getTime() - new Date(applied).getTime()) / 86400000
        )
        return days >= 0 ? days : null
      })
      .filter((d): d is number => d != null)
    const avgTimeToHire =
      durations.length === 0
        ? null
        : Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)

    // Funnel by application status
    const funnelOrder = ['new', 'screening', 'interview', 'offer', 'hired']
    const funnel = funnelOrder.map((s) => ({
      stage: s,
      count: apps.filter((a) => a.status === s).length,
    }))
    const rejected = apps.filter((a) => a.status === 'rejected').length

    return {
      openRoles,
      totalHeadcount,
      totalApplications: apps.length,
      acceptanceRate,
      accepted: accepted.length,
      respondedCount: responded.length,
      avgTimeToHire,
      hiredCount: durations.length,
      funnel,
      rejected,
      stageCount: (stages ?? []).length,
    }
  }, [requisitions, applications, offers, stages])

  const maxFunnel = Math.max(1, ...stats.funnel.map((f) => f.count))

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Target}
          label="Open roles"
          value={String(stats.openRoles)}
          hint={`${stats.totalHeadcount} position${stats.totalHeadcount === 1 ? '' : 's'} to fill`}
          tone="bg-blue-50 text-blue-600"
        />
        <Stat
          icon={Users}
          label="Applications"
          value={String(stats.totalApplications)}
          hint={`${stats.rejected} not taken forward`}
          tone="bg-violet-50 text-violet-600"
        />
        <Stat
          icon={TrendingDown}
          label="Offer acceptance"
          value={stats.acceptanceRate != null ? `${stats.acceptanceRate}%` : '—'}
          hint={
            stats.respondedCount > 0
              ? `${stats.accepted} of ${stats.respondedCount} answered`
              : 'No offers answered yet'
          }
          tone="bg-emerald-50 text-emerald-600"
        />
        <Stat
          icon={Clock}
          label="Average time to hire"
          value={stats.avgTimeToHire != null ? `${stats.avgTimeToHire} days` : '—'}
          hint={
            stats.hiredCount > 0
              ? `Across ${stats.hiredCount} hire${stats.hiredCount === 1 ? '' : 's'}`
              : 'Needs an accepted offer to measure'
          }
          tone="bg-amber-50 text-amber-600"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.funnel.map((f) => (
            <div key={f.stage}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="capitalize">{f.stage}</span>
                <span className="font-medium">{f.count}</span>
              </div>
              <Progress value={(f.count / maxFunnel) * 100} className="h-2" />
            </div>
          ))}
          {stats.rejected > 0 && (
            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">Not taken forward</span>
              <Badge variant="secondary">{stats.rejected}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Time to hire measures the days between a candidate applying and accepting an offer. It only
        counts offers that were actually answered, so a small number of hires will move it a lot.
      </p>
    </div>
  )
}

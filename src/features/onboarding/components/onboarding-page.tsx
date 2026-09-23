import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CalendarClock, Rocket, UserCheck } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { getCurrentEmployee } from '@/features/attendance/api/attendance.api'
import { JoinersTab } from './joiners-tab'
import { ProbationTab } from './probation-tab'
import { TemplatesTab } from './templates-tab'
import { useOnboardingRuns, useProbationDue } from '../hooks/use-onboarding'
import { taskProgress } from '../types'

function StatCard({
  icon: Icon, label, value, tone,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  tone: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className={`rounded-lg p-2.5 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function OnboardingPage() {
  const { profile } = useAuth()
  const { isAdmin, isHR } = usePermissions()
  const canManage = isAdmin || isHR

  const { data: me } = useQuery({
    queryKey: ['current-employee', profile?.id],
    queryFn: () => getCurrentEmployee(profile!.id),
    enabled: !!profile?.id,
  })

  const { data: runs } = useOnboardingRuns()
  const { data: probation } = useProbationDue(30)

  const active = (runs ?? []).filter((r) => r.status === 'in_progress')
  const overdueTasks = active.reduce(
    (sum, r) => sum + taskProgress(r.onboarding_tasks).overdue,
    0
  )
  const dueCheckIns = active.reduce((sum, r) => {
    const today = new Date().toISOString().split('T')[0]
    return (
      sum +
      (r.onboarding_journeys ?? []).filter((j) => j.status === 'pending' && j.due_date <= today)
        .length
    )
  }, 0)

  return (
    <div>
      <PageHeader
        title="Onboarding"
        description="Bring new joiners up to speed — tasks, buddies, check-ins and confirmation."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Rocket}
          label="Being onboarded"
          value={active.length}
          tone="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="Overdue tasks"
          value={overdueTasks}
          tone="bg-rose-50 text-rose-600"
        />
        <StatCard
          icon={CalendarClock}
          label="Check-ins due"
          value={dueCheckIns}
          tone="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={UserCheck}
          label="Confirmations due"
          value={(probation ?? []).length}
          tone="bg-emerald-50 text-emerald-600"
        />
      </div>

      <Tabs defaultValue="joiners">
        <TabsList>
          <TabsTrigger value="joiners">Joiners</TabsTrigger>
          <TabsTrigger value="probation">Probation</TabsTrigger>
          {canManage && <TabsTrigger value="templates">Templates</TabsTrigger>}
        </TabsList>

        <TabsContent value="joiners" className="mt-6">
          <JoinersTab canManage={canManage} currentEmployeeId={me?.id} />
        </TabsContent>

        <TabsContent value="probation" className="mt-6">
          <ProbationTab canManage={canManage} />
        </TabsContent>

        {canManage && (
          <TabsContent value="templates" className="mt-6">
            <TemplatesTab canManage={canManage} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

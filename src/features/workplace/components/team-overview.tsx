import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight, Users, Wallet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { getCurrentEmployee } from '@/features/attendance/api/attendance.api'
import { useApprovalScope } from '@/features/settings/hooks/use-delegation'
import { formatCurrency } from '@/lib/utils'

/**
 * F36 — what a manager actually needs: who is away this month, and what the
 * team costs.
 *
 * Cost is only shown to roles that may see compensation. The RLS from 00038
 * already enforces that, so a manager who is not entitled simply gets nothing
 * back rather than a broken screen.
 */

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function monthDays(year: number, month: number): Date[] {
  const days: Date[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

export function TeamOverview() {
  const { profile, organization } = useAuth()
  const { canViewPayroll } = usePermissions()
  const [offset, setOffset] = useState(0)

  const { data: me } = useQuery({
    queryKey: ['current-employee', profile?.id],
    queryFn: () => getCurrentEmployee(profile!.id),
    enabled: !!profile?.id,
  })
  const myId = me?.id as string | undefined
  const { approverIds } = useApprovalScope(myId)

  const base = new Date()
  const cursor = new Date(base.getFullYear(), base.getMonth() + offset, 1)
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const from = new Date(year, month, 1).toISOString().split('T')[0]
  const to = new Date(year, month + 1, 0).toISOString().split('T')[0]

  const { data: team } = useQuery({
    queryKey: ['team-overview', 'members', approverIds, organization?.id],
    enabled: approverIds.length > 0 && !!organization?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_code, designation:designations!designation_id(title)')
        .eq('organization_id', organization!.id)
        .in('reporting_manager_id', approverIds)
        .eq('status', 'active')
        .order('first_name')
      return data ?? []
    },
  })

  const teamIds = useMemo(() => (team ?? []).map((t) => t.id as string), [team])

  const { data: leaves } = useQuery({
    queryKey: ['team-overview', 'leaves', teamIds, from, to],
    enabled: teamIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('leave_requests')
        .select('id, employee_id, start_date, end_date, status, leave_type:leave_types(name)')
        .in('employee_id', teamIds)
        .in('status', ['approved', 'pending'])
        .lte('start_date', to)
        .gte('end_date', from)
      return data ?? []
    },
  })

  const { data: cost } = useQuery({
    queryKey: ['team-overview', 'cost', teamIds],
    enabled: teamIds.length > 0 && canViewPayroll,
    queryFn: async () => {
      const { data } = await supabase
        .from('employee_compensation')
        .select('employee_id, annual_ctc')
        .in('employee_id', teamIds)
      return data ?? []
    },
  })

  const days = monthDays(year, month)
  const leaveRows = (leaves ?? []) as Array<Record<string, unknown>>

  function isOff(employeeId: string, day: Date): 'approved' | 'pending' | null {
    const iso = day.toISOString().split('T')[0]
    for (const l of leaveRows) {
      if (l.employee_id !== employeeId) continue
      if ((l.start_date as string) <= iso && (l.end_date as string) >= iso) {
        return l.status === 'approved' ? 'approved' : 'pending'
      }
    }
    return null
  }

  const totalCost = ((cost ?? []) as Array<Record<string, unknown>>).reduce(
    (s, c) => s + Number(c.annual_ctc ?? 0),
    0
  )

  if (approverIds.length === 0 || (team ?? []).length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 rounded-full bg-muted p-3">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium">No direct reports</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            This view shows who reports to you. If that looks wrong, the reporting manager on their
            employee record is what decides it.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-blue-50 p-2.5"><Users className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-semibold leading-none">{(team ?? []).length}</p>
              <p className="mt-1 text-xs text-muted-foreground">In your team</p>
            </div>
          </CardContent>
        </Card>
        {canViewPayroll && (
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="rounded-lg bg-emerald-50 p-2.5"><Wallet className="h-5 w-5 text-emerald-600" /></div>
              <div>
                <p className="text-2xl font-semibold leading-none">{formatCurrency(totalCost)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Annual team cost{(cost ?? []).length < (team ?? []).length ? ' (partial)' : ''}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4" /> Who is away
              </CardTitle>
              <CardDescription>
                {cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </CardDescription>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" onClick={() => setOffset((o) => o - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setOffset((o) => o + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-background p-1 text-left font-medium">Person</th>
                  {days.map((d) => (
                    <th key={d.toISOString()} className="p-0.5 text-center font-normal text-muted-foreground">
                      <div>{DAY_LABELS[(d.getDay() + 6) % 7]}</div>
                      <div>{d.getDate()}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(team ?? []).map((m) => (
                  <tr key={m.id as string}>
                    <td className="sticky left-0 whitespace-nowrap bg-background p-1 pr-3">
                      {m.first_name as string} {m.last_name as string}
                    </td>
                    {days.map((d) => {
                      const off = isOff(m.id as string, d)
                      const weekend = d.getDay() === 0 || d.getDay() === 6
                      return (
                        <td key={d.toISOString()} className="p-0.5">
                          <div
                            className={`h-5 rounded-sm ${
                              off === 'approved' ? 'bg-rose-400'
                              : off === 'pending' ? 'bg-amber-300'
                              : weekend ? 'bg-muted'
                              : 'bg-emerald-50'
                            }`}
                            title={off ? `Away (${off})` : weekend ? 'Weekend' : 'Working'}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-rose-400" /> Approved leave
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-amber-300" /> Awaiting approval
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-muted" /> Weekend
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

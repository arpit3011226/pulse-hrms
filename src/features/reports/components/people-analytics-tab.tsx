import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

type TimePeriod = '12m' | '6m' | '3m' | 'ytd'

function getMonthsForPeriod(period: TimePeriod): number {
  const now = new Date()
  switch (period) {
    case '12m':
      return 12
    case '6m':
      return 6
    case '3m':
      return 3
    case 'ytd': {
      // Months from January of current year to now (inclusive)
      return now.getMonth() + 1
    }
  }
}

function getPeriodStartDate(period: TimePeriod): Date {
  const now = new Date()
  switch (period) {
    case '12m': {
      const d = new Date()
      d.setFullYear(d.getFullYear() - 1)
      return d
    }
    case '6m': {
      const d = new Date()
      d.setMonth(d.getMonth() - 6)
      return d
    }
    case '3m': {
      const d = new Date()
      d.setMonth(d.getMonth() - 3)
      return d
    }
    case 'ytd':
      return new Date(now.getFullYear(), 0, 1)
  }
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#06b6d4', '#ec4899']

export function PeopleAnalyticsTab() {
  const { organization } = useAuth()
  const orgId = organization?.id ?? ''
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('12m')

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ['people-analytics-departments', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('organization_id', orgId)
        .order('name')
      if (error) throw error
      return data ?? []
    },
    enabled: !!orgId,
  })

  // Fetch active employees
  const { data: activeEmployees, isLoading: loadingActive } = useQuery({
    queryKey: ['people-analytics-active', orgId, selectedDept],
    queryFn: async () => {
      let query = supabase
        .from('employees')
        .select('id, department_id, date_of_joining, status, employment_type, department:departments!department_id(name)')
        .eq('organization_id', orgId)
        .eq('status', 'active')
      if (selectedDept !== 'all') {
        query = query.eq('department_id', selectedDept)
      }
      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
    enabled: !!orgId,
  })

  // Fetch all employees (including terminated) for attrition calculation
  const { data: allEmployees, isLoading: loadingAll } = useQuery({
    queryKey: ['people-analytics-all', orgId, selectedDept],
    queryFn: async () => {
      let query = supabase
        .from('employees')
        .select(
          'id, department_id, status, date_of_joining, department:departments!department_id(name), exit:employee_exit_records!employee_exit_records_employee_id_fkey(last_working_date, hr_override_last_working_date, status)'
        )
        .eq('organization_id', orgId)
      if (selectedDept !== 'all') {
        query = query.eq('department_id', selectedDept)
      }
      const { data, error } = await query
      if (error) throw error
      // Exit details live in employee_exit_records, not on employees.
      // Flatten the latest non-withdrawn exit into termination_date.
      return (data ?? []).map((e: any) => {
        const exit = (e.exit ?? [])
          .filter((x: any) => x.status !== 'withdrawn')
          .map((x: any) => x.hr_override_last_working_date ?? x.last_working_date)
          .filter(Boolean)
          .sort()
          .pop()
        return { ...e, termination_date: exit ?? null }
      })
    },
    enabled: !!orgId,
  })

  // Fetch open positions
  const { data: openPositions, isLoading: loadingPositions } = useQuery({
    queryKey: ['people-analytics-open-positions', orgId, selectedDept],
    queryFn: async () => {
      let query = supabase
        .from('job_requisitions')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'open')
      if (selectedDept !== 'all') {
        query = query.eq('department_id', selectedDept)
      }
      const { count, error } = await query
      if (error) throw error
      return count ?? 0
    },
    enabled: !!orgId,
  })

  // New Hires This Month
  const { data: newHiresCount, isLoading: loadingNewHires } = useQuery({
    queryKey: ['people-analytics-new-hires', orgId],
    queryFn: async () => {
      try {
        const firstOfMonth = new Date()
        firstOfMonth.setDate(1)
        const firstOfMonthStr = firstOfMonth.toISOString().split('T')[0]
        const { count, error } = await supabase
          .from('employees')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('status', 'active')
          .gte('date_of_joining', firstOfMonthStr)
        if (error) throw error
        return count ?? 0
      } catch {
        return 0
      }
    },
    enabled: !!orgId,
  })

  // Pending Leave Requests
  const { data: pendingLeaves, isLoading: loadingLeaves } = useQuery({
    queryKey: ['people-analytics-pending-leaves', orgId],
    queryFn: async () => {
      try {
        const { count, error } = await supabase
          .from('leave_requests')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('status', 'pending')
        if (error) throw error
        return count ?? 0
      } catch {
        return 0
      }
    },
    enabled: !!orgId,
  })

  // Active Training Enrollments
  const { data: activeTraining, isLoading: loadingTraining } = useQuery({
    queryKey: ['people-analytics-active-training', orgId],
    queryFn: async () => {
      try {
        const { count, error } = await supabase
          .from('training_enrollments')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('status', 'in_progress')
        if (error) throw error
        return count ?? 0
      } catch {
        return 0
      }
    },
    enabled: !!orgId,
  })

  // Latest Payroll Cost
  const { data: payrollCost, isLoading: loadingPayroll } = useQuery({
    queryKey: ['people-analytics-payroll-cost', orgId],
    queryFn: async () => {
      try {
        const { data: latestPayslip } = await supabase
          .from('payslips')
          .select('payroll_month, payroll_year')
          .eq('organization_id', orgId)
          .order('payroll_year', { ascending: false })
          .order('payroll_month', { ascending: false })
          .limit(1)
          // maybeSingle: payroll may not have been run yet.
          .maybeSingle()
        if (!latestPayslip) return 0
        const { data: payslips } = await supabase
          .from('payslips')
          .select('net_pay')
          .eq('organization_id', orgId)
          .eq('payroll_year', latestPayslip.payroll_year)
          .eq('payroll_month', latestPayslip.payroll_month)
        if (!payslips) return 0
        return payslips.reduce((sum, p) => sum + (p.net_pay || 0), 0)
      } catch {
        return 0
      }
    },
    enabled: !!orgId,
  })

  // Performance Review Completion
  const { data: perfCompletion, isLoading: loadingPerf } = useQuery({
    queryKey: ['people-analytics-perf-completion', orgId],
    queryFn: async () => {
      try {
        const { data: cycle } = await supabase
          .from('performance_cycles')
          .select('id')
          .eq('organization_id', orgId)
          .in('status', ['active', 'completed'])
          .order('end_date', { ascending: false })
          .limit(1)
          // maybeSingle: there may be no cycle at all, which is not an error.
          .maybeSingle()
        if (!cycle) return { rate: 0, completed: 0, total: 0 }
        const { data: reviews } = await supabase
          .from('performance_reviews')
          .select('status')
          .eq('performance_cycle_id', cycle.id)
        if (!reviews || reviews.length === 0) return { rate: 0, completed: 0, total: 0 }
        const completed = reviews.filter((r) =>
          ['finalized', 'acknowledged'].includes(r.status)
        ).length
        const rate = Math.round((completed / reviews.length) * 100)
        return { rate, completed, total: reviews.length }
      } catch {
        return { rate: 0, completed: 0, total: 0 }
      }
    },
    enabled: !!orgId,
  })

  const isLoading =
    loadingActive || loadingAll || loadingPositions || loadingNewHires ||
    loadingLeaves || loadingTraining || loadingPayroll || loadingPerf

  // Calculate headcount
  const headcount = activeEmployees?.length ?? 0

  // Calculate attrition rate scoped to time period
  const attritionRate = useMemo(() => {
    if (!allEmployees || allEmployees.length === 0) return 0
    const periodStart = getPeriodStartDate(timePeriod)
    const terminated = allEmployees.filter(
      (e) =>
        e.status === 'terminated' &&
        e.termination_date &&
        new Date(e.termination_date) >= periodStart
    ).length
    return allEmployees.length > 0
      ? Math.round((terminated / allEmployees.length) * 100 * 10) / 10
      : 0
  }, [allEmployees, timePeriod])

  // Calculate average tenure in years
  const avgTenure = useMemo(() => {
    if (!activeEmployees || activeEmployees.length === 0) return 0
    const now = new Date()
    const totalMonths = activeEmployees.reduce((sum, e) => {
      if (!e.date_of_joining) return sum
      const joinDate = new Date(e.date_of_joining)
      const months =
        (now.getFullYear() - joinDate.getFullYear()) * 12 +
        (now.getMonth() - joinDate.getMonth())
      return sum + months
    }, 0)
    const avgMonths = totalMonths / activeEmployees.length
    return Math.round((avgMonths / 12) * 10) / 10
  }, [activeEmployees])

  // Employment Type Mix
  const employmentTypeMix = useMemo(() => {
    if (!activeEmployees || activeEmployees.length === 0) return []
    const map = new Map<string, number>()
    for (const e of activeEmployees) {
      const type = (e as any).employment_type ?? 'Unknown'
      map.set(type, (map.get(type) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [activeEmployees])

  // 12-Month attrition trend scoped to time period
  const attritionTrend = useMemo(() => {
    if (!allEmployees) return []
    const now = new Date()
    const monthCount = getMonthsForPeriod(timePeriod)
    const months: { month: string; exits: number }[] = []
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' })
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      const exits = allEmployees.filter(
        (e) =>
          e.status === 'terminated' &&
          e.termination_date &&
          new Date(e.termination_date) >= monthStart &&
          new Date(e.termination_date) <= monthEnd
      ).length
      months.push({ month: label, exits })
    }
    return months
  }, [allEmployees, timePeriod])

  // Joining trend scoped to time period
  const joiningTrend = useMemo(() => {
    if (!allEmployees) return []
    const now = new Date()
    const monthCount = getMonthsForPeriod(timePeriod)
    const months: { month: string; hires: number }[] = []
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' })
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      const hires = allEmployees.filter(
        (e) =>
          e.date_of_joining &&
          new Date(e.date_of_joining) >= monthStart &&
          new Date(e.date_of_joining) <= monthEnd
      ).length
      months.push({ month: label, hires })
    }
    return months
  }, [allEmployees, timePeriod])

  // Department breakdown
  const deptBreakdown = useMemo(() => {
    if (!activeEmployees) return []
    const map = new Map<string, number>()
    for (const e of activeEmployees) {
      const dept = (e.department as any)?.name ?? 'Unassigned'
      map.set(dept, (map.get(dept) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [activeEmployees])

  const barColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#f43f5e']

  // Format payroll cost
  const formattedPayrollCost = useMemo(() => {
    const cost = payrollCost ?? 0
    if (cost === 0) return '-'
    if (cost > 100000) return `\u20B9${(cost / 100000).toFixed(1)}L`
    return `\u20B9${cost.toLocaleString()}`
  }, [payrollCost])

  const timePeriodLabel = useMemo(() => {
    switch (timePeriod) {
      case '12m': return 'Last 12 months'
      case '6m': return 'Last 6 months'
      case '3m': return 'Last 3 months'
      case 'ytd': return 'Year to date'
    }
  }, [timePeriod])

  if (isLoading) return <Skeleton className="h-96" />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={selectedDept} onValueChange={setSelectedDept}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments?.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Last 12 Months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12m">Last 12 Months</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="3m">Last 3 Months</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          </span>
          <span className="text-sm font-medium text-green-600">Live</span>
        </div>
      </div>

      {/* Stat Cards - 3 column grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Row 1 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Headcount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{headcount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Attrition Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{attritionRate}%</p>
            <p className="text-xs text-muted-foreground">{timePeriodLabel}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Tenure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{avgTenure} yrs</p>
          </CardContent>
        </Card>

        {/* Row 2 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{openPositions}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              New Hires This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{newHiresCount ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Leave Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingLeaves ?? 0}</p>
          </CardContent>
        </Card>

        {/* Row 3 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Training
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeTraining ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Latest Payroll Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formattedPayrollCost}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Performance Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{perfCompletion?.rate ?? 0}%</p>
            <p className="text-xs text-muted-foreground">
              {perfCompletion?.completed ?? 0}/{perfCompletion?.total ?? 0} reviews
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Employment Type Mix */}
      {employmentTypeMix.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employment Type Mix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={employmentTypeMix}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine
                  >
                    {employmentTypeMix.map((_entry, index) => (
                      <Cell
                        key={`pie-cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trend Charts - side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attrition Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attrition Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attritionTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="exits"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#f43f5e' }}
                    name="Exits"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Joining Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Joining Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={joiningTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="hires"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#22c55e' }}
                    name="New Hires"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Department Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Bar dataKey="count" name="Employees" radius={[0, 4, 4, 0]}>
                  {deptBreakdown.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={barColors[index % barColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

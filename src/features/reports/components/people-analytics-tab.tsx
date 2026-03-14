import { useMemo } from 'react'
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
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useState } from 'react'

export function PeopleAnalyticsTab() {
  const { organization } = useAuth()
  const orgId = organization?.id ?? ''
  const [selectedDept, setSelectedDept] = useState<string>('all')

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
        .select('id, department_id, date_of_joining, status, department:departments(name)')
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
        .select('id, department_id, status, date_of_joining, termination_date, department:departments(name)')
        .eq('organization_id', orgId)
      if (selectedDept !== 'all') {
        query = query.eq('department_id', selectedDept)
      }
      const { data, error } = await query
      if (error) throw error
      return data ?? []
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

  const isLoading = loadingActive || loadingAll || loadingPositions

  // Calculate headcount
  const headcount = activeEmployees?.length ?? 0

  // Calculate attrition rate (terminated in last 12 months / total * 100)
  const attritionRate = useMemo(() => {
    if (!allEmployees || allEmployees.length === 0) return 0
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)
    const terminated = allEmployees.filter(
      (e) =>
        e.status === 'terminated' &&
        e.termination_date &&
        new Date(e.termination_date) >= twelveMonthsAgo
    ).length
    return allEmployees.length > 0
      ? Math.round((terminated / allEmployees.length) * 100 * 10) / 10
      : 0
  }, [allEmployees])

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

  // 12-Month attrition trend
  const attritionTrend = useMemo(() => {
    if (!allEmployees) return []
    const now = new Date()
    const months: { month: string; exits: number }[] = []
    for (let i = 11; i >= 0; i--) {
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
  }, [allEmployees])

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

  if (isLoading) return <Skeleton className="h-96" />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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

        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          </span>
          <span className="text-sm font-medium text-green-600">Live</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4">
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
            <p className="text-xs text-muted-foreground">Last 12 months</p>
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
      </div>

      {/* 12-Month Attrition Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">12-Month Attrition Trend</CardTitle>
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
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#22c55e' }}
                  name="Exits"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

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

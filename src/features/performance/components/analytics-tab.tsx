import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { TrendingUp, TrendingDown, Users, Star, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  usePerformanceCycles,
  useActiveCycle,
  usePerformanceAnalytics,
  useRatingTrend,
} from '../hooks/use-performance'

interface DeltaBadgeProps {
  value: number
  suffix?: string
}

function DeltaBadge({ value, suffix = '' }: DeltaBadgeProps) {
  if (value === 0) return null
  const isPositive = value > 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium rounded-full px-1.5 py-0.5',
        isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
      )}
    >
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPositive ? '+' : ''}
      {value}
      {suffix}
    </span>
  )
}

export function AnalyticsTab() {
  const { data: cycles } = usePerformanceCycles()
  const { data: activeCycle } = useActiveCycle()
  const [selectedCycleId, setSelectedCycleId] = useState<string>('')

  const cycleId = selectedCycleId || activeCycle?.id || ''
  const { data: analytics, isLoading: analyticsLoading } = usePerformanceAnalytics(cycleId)
  const { data: ratingTrend, isLoading: trendLoading } = useRatingTrend()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analyticsData = analytics as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trendData = (ratingTrend || []) as any[]

  const avgRating = analyticsData?.avgRating ?? 0
  const completionRate = analyticsData?.completionRate ?? 0
  const topPerformers = analyticsData?.topPerformers ?? 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ratingsByDepartment = (analyticsData?.ratingsByDepartment || []) as any[]

  const isLoading = analyticsLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cycle selector */}
      <div className="flex items-center gap-3">
        <Select value={cycleId} onValueChange={setSelectedCycleId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select cycle" />
          </SelectTrigger>
          <SelectContent>
            {(cycles || []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.cycle_name}
                {activeCycle?.id === c.id ? ' (Active)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold">{avgRating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">/5.0</span>
                </div>
              </div>
              <div className="rounded-full bg-orange-100 p-3">
                <Star className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Review Completion</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold">{completionRate}%</span>
                </div>
              </div>
              <div className="rounded-full bg-emerald-100 p-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Top Performers</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold">{topPerformers}</span>
                  <span className="text-sm text-muted-foreground">employees</span>
                </div>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ratings by Department */}
      {ratingsByDepartment.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ratings by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ratingsByDepartment}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 5]} tickCount={6} />
                  <YAxis
                    type="category"
                    dataKey="department"
                    width={140}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [value.toFixed(1), 'Avg Rating']}
                  />
                  <Bar
                    dataKey="avgRating"
                    fill="#f97316"
                    radius={[0, 4, 4, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rating Trend */}
      {trendData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rating Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="cycleName" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 5]} tickCount={6} />
                  <Tooltip
                    formatter={(value: number) => [value.toFixed(2), 'Avg Rating']}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgRating"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={{ fill: '#f97316', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!cycleId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select a performance cycle to view analytics.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

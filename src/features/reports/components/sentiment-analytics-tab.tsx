import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ArrowUp, ArrowDown, Minus, BarChart3 } from 'lucide-react'
import { useSentimentData, useSentimentByDepartment } from '../hooks/use-surveys'
import { useAuth } from '@/features/auth/hooks/use-auth'
import type { SurveyCategory } from '@/types/database.types'

type TimePeriod = 'current_quarter' | 'previous_quarter' | 'last_6_months' | 'last_12_months' | 'custom'

const CATEGORY_LABELS: Record<string, string> = {
  work_life_balance: 'Work-Life Balance',
  career_growth: 'Career Growth',
  manager_support: 'Manager Support',
  compensation: 'Compensation',
  team_culture: 'Team Culture',
}

const CATEGORY_ORDER: SurveyCategory[] = [
  'work_life_balance',
  'career_growth',
  'manager_support',
  'compensation',
  'team_culture',
]

const DEPT_COLUMN_LABELS: { key: string; label: string }[] = [
  { key: 'work_life_balance', label: 'WLB' },
  { key: 'career_growth', label: 'Career' },
  { key: 'manager_support', label: 'Manager' },
  { key: 'compensation', label: 'Comp' },
  { key: 'team_culture', label: 'Culture' },
]

function getScoreColor(score: number): string {
  if (score >= 75) return 'bg-emerald-500'
  if (score >= 65) return 'bg-amber-500'
  return 'bg-rose-500'
}

function getScoreClasses(score: number): string {
  if (score >= 75) return 'text-emerald-600 bg-emerald-100'
  if (score >= 65) return 'text-amber-600 bg-amber-100'
  return 'text-rose-600 bg-rose-100'
}

function getQuarterDates(offset: number): { start: string; end: string } {
  const now = new Date()
  const currentQuarter = Math.floor(now.getMonth() / 3)
  const targetQuarter = currentQuarter + offset
  const year = now.getFullYear() + Math.floor(targetQuarter / 4)
  const q = ((targetQuarter % 4) + 4) % 4
  const startMonth = q * 3
  const start = new Date(year, startMonth, 1)
  const end = offset === 0
    ? now
    : new Date(year, startMonth + 3, 0) // last day of quarter
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

function computeDateRange(period: TimePeriod, customStart: string, customEnd: string): {
  startDate: string
  endDate: string
  prevStartDate: string
  prevEndDate: string
} {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  switch (period) {
    case 'current_quarter': {
      const current = getQuarterDates(0)
      const prev = getQuarterDates(-1)
      return { startDate: current.start, endDate: current.end, prevStartDate: prev.start, prevEndDate: prev.end }
    }
    case 'previous_quarter': {
      const prev = getQuarterDates(-1)
      const prevPrev = getQuarterDates(-2)
      return { startDate: prev.start, endDate: prev.end, prevStartDate: prevPrev.start, prevEndDate: prevPrev.end }
    }
    case 'last_6_months': {
      const sixMonthsAgo = new Date(now)
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const twelveMonthsAgo = new Date(now)
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
      return {
        startDate: sixMonthsAgo.toISOString().split('T')[0],
        endDate: today,
        prevStartDate: twelveMonthsAgo.toISOString().split('T')[0],
        prevEndDate: sixMonthsAgo.toISOString().split('T')[0],
      }
    }
    case 'last_12_months': {
      const twelveMonthsAgo = new Date(now)
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
      const twentyFourMonthsAgo = new Date(now)
      twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24)
      return {
        startDate: twelveMonthsAgo.toISOString().split('T')[0],
        endDate: today,
        prevStartDate: twentyFourMonthsAgo.toISOString().split('T')[0],
        prevEndDate: twelveMonthsAgo.toISOString().split('T')[0],
      }
    }
    case 'custom': {
      if (!customStart || !customEnd) {
        return { startDate: '', endDate: '', prevStartDate: '', prevEndDate: '' }
      }
      const startMs = new Date(customStart).getTime()
      const endMs = new Date(customEnd).getTime()
      const durationMs = endMs - startMs
      const prevEnd = new Date(startMs)
      const prevStart = new Date(startMs - durationMs)
      return {
        startDate: customStart,
        endDate: customEnd,
        prevStartDate: prevStart.toISOString().split('T')[0],
        prevEndDate: prevEnd.toISOString().split('T')[0],
      }
    }
  }
}

export function SentimentAnalyticsTab() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'hr_admin'

  const [period, setPeriod] = useState<TimePeriod>('current_quarter')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const { startDate, endDate, prevStartDate, prevEndDate } = useMemo(
    () => computeDateRange(period, customStart, customEnd),
    [period, customStart, customEnd]
  )

  const { data: sentimentData, isLoading: sentimentLoading } = useSentimentData(startDate, endDate)
  const { data: prevSentimentData } = useSentimentData(prevStartDate, prevEndDate)
  const { data: deptData, isLoading: deptLoading } = useSentimentByDepartment(startDate, endDate)

  const isLoading = sentimentLoading || deptLoading

  // Build engagement drivers with deltas
  const engagementDrivers = useMemo(() => {
    if (!sentimentData?.length) return []

    const currentMap = new Map(sentimentData.map((d) => [d.category, d]))
    const prevMap = new Map((prevSentimentData ?? []).map((d) => [d.category, d]))

    return CATEGORY_ORDER
      .map((cat) => {
        const current = currentMap.get(cat)
        if (!current) return null
        const prev = prevMap.get(cat)
        const score = current.score
        const delta = prev ? Math.round(score - prev.score) : 0
        return {
          category: cat,
          label: CATEGORY_LABELS[cat] ?? cat,
          score,
          delta,
          responseCount: current.responseCount,
        }
      })
      .filter(Boolean) as {
        category: SurveyCategory
        label: string
        score: number
        delta: number
        responseCount: number
      }[]
  }, [sentimentData, prevSentimentData])

  // Empty state
  if (!isLoading && (!sentimentData?.length) && (!deptData?.length)) {
    return (
      <div className="space-y-6">
        <Header period={period} setPeriod={setPeriod} customStart={customStart} customEnd={customEnd} setCustomStart={setCustomStart} setCustomEnd={setCustomEnd} />
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium text-muted-foreground">No survey data available</p>
            <p className="text-sm text-muted-foreground">
              Run engagement surveys to see sentiment analytics here.
            </p>
            {isAdmin && (
              <Button variant="outline" size="sm" className="mt-2">
                Create Survey
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header period={period} setPeriod={setPeriod} customStart={customStart} customEnd={customEnd} setCustomStart={setCustomStart} setCustomEnd={setCustomEnd} />
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-2.5 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Header period={period} setPeriod={setPeriod} customStart={customStart} customEnd={customEnd} setCustomStart={setCustomStart} setCustomEnd={setCustomEnd} />

      {/* Engagement Drivers */}
      {engagementDrivers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Engagement Drivers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {engagementDrivers.map((driver) => (
              <div key={driver.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{driver.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{driver.score}</span>
                    <DeltaIndicator delta={driver.delta} />
                  </div>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted">
                  <div
                    className={`h-2.5 rounded-full ${getScoreColor(driver.score)}`}
                    style={{ width: `${driver.score}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* By Department Table */}
      {deptData && deptData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Department</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  {DEPT_COLUMN_LABELS.map((col) => (
                    <TableHead key={col.key} className="text-center">
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {deptData.map((row) => (
                  <TableRow key={row.department}>
                    <TableCell className="font-medium">{row.department}</TableCell>
                    {DEPT_COLUMN_LABELS.map((col) => {
                      const score = row.scores[col.key]
                      if (score == null) {
                        return (
                          <TableCell key={col.key} className="text-center">
                            <span className="text-xs text-muted-foreground">&mdash;</span>
                          </TableCell>
                        )
                      }
                      return (
                        <TableCell key={col.key} className="text-center">
                          <span
                            className={`inline-flex min-w-[2.5rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${getScoreClasses(score)}`}
                          >
                            {score}
                          </span>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function DeltaIndicator({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="flex items-center gap-0.5 text-emerald-600">
        <ArrowUp className="h-3.5 w-3.5" />
        <span className="text-xs">+{delta}</span>
      </span>
    )
  }
  if (delta < 0) {
    return (
      <span className="flex items-center gap-0.5 text-rose-600">
        <ArrowDown className="h-3.5 w-3.5" />
        <span className="text-xs">{delta}</span>
      </span>
    )
  }
  return (
    <span className="flex items-center text-muted-foreground">
      <Minus className="h-3.5 w-3.5" />
    </span>
  )
}

function Header({
  period,
  setPeriod,
  customStart,
  customEnd,
  setCustomStart,
  setCustomEnd,
}: {
  period: TimePeriod
  setPeriod: (p: TimePeriod) => void
  customStart: string
  customEnd: string
  setCustomStart: (v: string) => void
  setCustomEnd: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <h3 className="text-lg font-semibold">Sentiment Analytics</h3>
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current_quarter">Current Quarter</SelectItem>
            <SelectItem value="previous_quarter">Previous Quarter</SelectItem>
            <SelectItem value="last_6_months">Last 6 Months</SelectItem>
            <SelectItem value="last_12_months">Last 12 Months</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        {period === 'custom' && (
          <>
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-[150px]"
              placeholder="Start date"
            />
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-[150px]"
              placeholder="End date"
            />
          </>
        )}
      </div>
    </div>
  )
}

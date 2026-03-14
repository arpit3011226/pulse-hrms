import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// TODO: Replace with actual survey data when survey module is built

interface EngagementDriver {
  label: string
  score: number
  delta: number
  trend: string
  color: string
}

const engagementDrivers: EngagementDriver[] = [
  { label: 'Work-Life Balance', score: 78, delta: 3, trend: '\u2191', color: 'bg-emerald-500' },
  { label: 'Career Growth', score: 58, delta: -4, trend: '\u2193', color: 'bg-rose-500' },
  { label: 'Manager Support', score: 71, delta: 1, trend: '\u2191', color: 'bg-amber-500' },
  { label: 'Compensation', score: 65, delta: 0, trend: '\u2014', color: 'bg-amber-500' },
  { label: 'Team Culture', score: 82, delta: 5, trend: '\u2191', color: 'bg-emerald-500' },
]

interface DeptSentiment {
  department: string
  workLifeBalance: number
  careerGrowth: number
  managerSupport: number
  compensation: number
  teamCulture: number
}

const departmentSentiment: DeptSentiment[] = [
  { department: 'Engineering', workLifeBalance: 75, careerGrowth: 62, managerSupport: 70, compensation: 68, teamCulture: 80 },
  { department: 'Sales', workLifeBalance: 65, careerGrowth: 72, managerSupport: 74, compensation: 60, teamCulture: 78 },
  { department: 'Marketing', workLifeBalance: 82, careerGrowth: 55, managerSupport: 76, compensation: 70, teamCulture: 85 },
  { department: 'HR', workLifeBalance: 80, careerGrowth: 68, managerSupport: 82, compensation: 72, teamCulture: 88 },
  { department: 'Finance', workLifeBalance: 72, careerGrowth: 60, managerSupport: 68, compensation: 75, teamCulture: 70 },
  { department: 'Operations', workLifeBalance: 68, careerGrowth: 52, managerSupport: 65, compensation: 58, teamCulture: 74 },
]

const metricKeys: { key: keyof Omit<DeptSentiment, 'department'>; label: string }[] = [
  { key: 'workLifeBalance', label: 'WLB' },
  { key: 'careerGrowth', label: 'Career' },
  { key: 'managerSupport', label: 'Manager' },
  { key: 'compensation', label: 'Comp' },
  { key: 'teamCulture', label: 'Culture' },
]

function getScoreClasses(score: number): string {
  if (score >= 75) return 'text-emerald-600 bg-emerald-100'
  if (score >= 65) return 'text-amber-600 bg-amber-100'
  return 'text-rose-600 bg-rose-100'
}

function getCurrentQuarter(): string {
  const now = new Date()
  const q = Math.ceil((now.getMonth() + 1) / 3)
  return `Q${q} ${now.getFullYear()}`
}

export function SentimentAnalyticsTab() {
  return (
    <div className="space-y-6">
      {/* Quarter Badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sentiment Analytics</h3>
        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
          {getCurrentQuarter()}
        </Badge>
      </div>

      {/* Engagement Drivers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Engagement Drivers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {engagementDrivers.map((driver) => (
            <div key={driver.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{driver.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{driver.score}</span>
                  <span
                    className={
                      driver.delta > 0
                        ? 'text-emerald-600'
                        : driver.delta < 0
                          ? 'text-rose-600'
                          : 'text-muted-foreground'
                    }
                  >
                    {driver.trend}{' '}
                    {driver.delta !== 0 && (
                      <span className="text-xs">
                        {driver.delta > 0 ? '+' : ''}
                        {driver.delta}
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted">
                <div
                  className={`h-2.5 rounded-full ${driver.color}`}
                  style={{ width: `${driver.score}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* By Department Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">By Department</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                {metricKeys.map((m) => (
                  <TableHead key={m.key} className="text-center">
                    {m.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {departmentSentiment.map((row) => (
                <TableRow key={row.department}>
                  <TableCell className="font-medium">{row.department}</TableCell>
                  {metricKeys.map((m) => {
                    const score = row[m.key]
                    return (
                      <TableCell key={m.key} className="text-center">
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
    </div>
  )
}

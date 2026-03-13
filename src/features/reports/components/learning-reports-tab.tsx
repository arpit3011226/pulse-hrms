import { useMemo } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { useLearningReport } from '../hooks/use-reports'
import { usePermissions } from '@/hooks/use-permissions'
import { exportToCSV } from '../utils/export-csv'

export function LearningReportsTab() {
  const { data: enrollments, isLoading } = useLearningReport()
  const { hasPermission } = usePermissions()
  const canExport = hasPermission('export_reports')

  const byStatus = useMemo(() => {
    if (!enrollments) return []
    const map = new Map<string, number>()
    for (const e of enrollments) {
      map.set(e.status, (map.get(e.status) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count)
  }, [enrollments])

  const byCourse = useMemo(() => {
    if (!enrollments) return []
    const map = new Map<string, { enrolled: number; completed: number; avgProgress: number }>()
    for (const e of enrollments) {
      const name = (e.course as any)?.course_name ?? 'Unknown'
      const existing = map.get(name) ?? { enrolled: 0, completed: 0, avgProgress: 0 }
      existing.enrolled++
      if (e.status === 'completed') existing.completed++
      existing.avgProgress += e.progress_percent ?? 0
      map.set(name, existing)
    }
    return Array.from(map.entries())
      .map(([course, stats]) => ({
        course,
        enrolled: stats.enrolled,
        completed: stats.completed,
        avgProgress: Math.round(stats.avgProgress / stats.enrolled),
        completionRate: stats.enrolled > 0 ? Math.round((stats.completed / stats.enrolled) * 100) : 0,
      }))
      .sort((a, b) => b.enrolled - a.enrolled)
  }, [enrollments])

  const totalCompleted = enrollments?.filter((e) => e.status === 'completed').length ?? 0
  const totalEnrolled = enrollments?.length ?? 0
  const overallCompletionRate = totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 100) : 0

  if (isLoading) return <Skeleton className="h-64" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm">
          <span className="font-medium">Total Enrollments: {totalEnrolled}</span>
          <span className="text-muted-foreground">Completed: {totalCompleted}</span>
          <span className="text-muted-foreground">Completion Rate: {overallCompletionRate}%</span>
        </div>
        {canExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToCSV(
                enrollments ?? [],
                [
                  { header: 'Employee', accessor: (r: any) => `${r.employee?.first_name} ${r.employee?.last_name}` },
                  { header: 'Code', accessor: (r: any) => r.employee?.employee_code },
                  { header: 'Course', accessor: (r: any) => r.course?.course_name },
                  { header: 'Course Code', accessor: (r: any) => r.course?.course_code },
                  { header: 'Status', accessor: (r: any) => r.status },
                  { header: 'Progress %', accessor: (r: any) => r.progress_percent },
                  { header: 'Enrolled', accessor: (r: any) => r.enrolled_date },
                  { header: 'Completed', accessor: (r: any) => r.completion_date },
                ],
                'learning-report'
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Enrollments by Status</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byStatus.map((row) => (
                  <TableRow key={row.status}>
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                  </TableRow>
                ))}
                {byStatus.length === 0 && (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No enrollments</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">By Course</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Enrolled</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byCourse.map((row) => (
                  <TableRow key={row.course}>
                    <TableCell>{row.course}</TableCell>
                    <TableCell className="text-right">{row.enrolled}</TableCell>
                    <TableCell className="text-right">{row.completed}</TableCell>
                    <TableCell className="text-right">{row.completionRate}%</TableCell>
                  </TableRow>
                ))}
                {byCourse.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No data</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

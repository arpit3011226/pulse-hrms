import { useState, useMemo } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useAttendanceReport } from '../hooks/use-reports'
import { usePermissions } from '@/hooks/use-permissions'
import { exportToCSV } from '../utils/export-csv'

export function AttendanceReportsTab() {
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const [startDate, setStartDate] = useState(thirtyDaysAgo)
  const [endDate, setEndDate] = useState(today)

  const { data: records, isLoading } = useAttendanceReport(startDate, endDate)
  const { hasPermission } = usePermissions()
  const canExport = hasPermission('export_reports')

  const summary = useMemo(() => {
    if (!records) return { present: 0, absent: 0, halfDay: 0, total: 0 }
    const present = records.filter((r) => r.status === 'present').length
    const absent = records.filter((r) => r.status === 'absent').length
    const halfDay = records.filter((r) => r.status === 'half_day').length
    return { present, absent, halfDay, total: records.length }
  }, [records])

  const byDepartment = useMemo(() => {
    if (!records) return []
    const map = new Map<string, { present: number; absent: number; halfDay: number }>()
    for (const r of records) {
      const dept = (r.employee as any)?.department?.name ?? 'Unassigned'
      const existing = map.get(dept) ?? { present: 0, absent: 0, halfDay: 0 }
      if (r.status === 'present') existing.present++
      else if (r.status === 'absent') existing.absent++
      else if (r.status === 'half_day') existing.halfDay++
      map.set(dept, existing)
    }
    return Array.from(map.entries())
      .map(([dept, stats]) => ({ dept, ...stats }))
      .sort((a, b) => (b.present + b.absent + b.halfDay) - (a.present + a.absent + a.halfDay))
  }, [records])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label>Start Date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <Label>End Date</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        {canExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToCSV(
                records ?? [],
                [
                  { header: 'Date', accessor: (r: any) => r.date },
                  { header: 'Employee', accessor: (r: any) => `${r.employee?.first_name} ${r.employee?.last_name}` },
                  { header: 'Code', accessor: (r: any) => r.employee?.employee_code },
                  { header: 'Department', accessor: (r: any) => r.employee?.department?.name },
                  { header: 'Status', accessor: (r: any) => r.status },
                ],
                `attendance-report-${startDate}-to-${endDate}`
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{summary.total}</p>
                <p className="text-xs text-muted-foreground">Total Records</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{summary.present}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
                <p className="text-xs text-muted-foreground">Absent</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{summary.halfDay}</p>
                <p className="text-xs text-muted-foreground">Half Day</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Attendance by Department</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Present</TableHead>
                    <TableHead className="text-right">Absent</TableHead>
                    <TableHead className="text-right">Half Day</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byDepartment.map((row) => (
                    <TableRow key={row.dept}>
                      <TableCell>{row.dept}</TableCell>
                      <TableCell className="text-right text-emerald-600">{row.present}</TableCell>
                      <TableCell className="text-right text-red-600">{row.absent}</TableCell>
                      <TableCell className="text-right text-amber-600">{row.halfDay}</TableCell>
                    </TableRow>
                  ))}
                  {byDepartment.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No data for this period</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

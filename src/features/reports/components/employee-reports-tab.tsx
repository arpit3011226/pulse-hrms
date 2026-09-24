import { useMemo } from 'react'
import { one } from '@/lib/supabase-embed'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useEmployeeReport } from '../hooks/use-reports'
import { usePermissions } from '@/hooks/use-permissions'
import { exportToCSV } from '../utils/export-csv'

export function EmployeeReportsTab() {
  const { data: employees, isLoading } = useEmployeeReport()
  const { hasPermission } = usePermissions()
  const canExport = hasPermission('export_reports')

  const byDepartment = useMemo(() => {
    if (!employees) return []
    const map = new Map<string, number>()
    for (const e of employees) {
      const dept = (one(e.department))?.name ?? 'Unassigned'
      map.set(dept, (map.get(dept) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [employees])

  const byStatus = useMemo(() => {
    if (!employees) return []
    const map = new Map<string, number>()
    for (const e of employees) {
      map.set(e.status, (map.get(e.status) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count)
  }, [employees])

  const byType = useMemo(() => {
    if (!employees) return []
    const map = new Map<string, number>()
    for (const e of employees) {
      const t = e.employment_type ?? 'Unknown'
      map.set(t, (map.get(t) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
  }, [employees])

  const newHires30 = useMemo(() => {
    if (!employees) return 0
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    return employees.filter((e) => new Date(e.created_at) >= cutoff).length
  }, [employees])

  if (isLoading) return <Skeleton className="h-64" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm">
          <span className="font-medium">Total: {employees?.length ?? 0}</span>
          <span className="text-muted-foreground">New hires (30d): {newHires30}</span>
        </div>
        {canExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToCSV(
                byDepartment,
                [
                  { header: 'Department', accessor: (r) => r.name },
                  { header: 'Count', accessor: (r) => r.count },
                ],
                'employee-report-by-department'
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">By Department</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byDepartment.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right">
                      {employees ? Math.round((row.count / employees.length) * 100) : 0}%
                    </TableCell>
                  </TableRow>
                ))}
                {byDepartment.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No data</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">By Status</CardTitle></CardHeader>
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
                    <TableCell className="capitalize">{row.status.replace(/_/g, ' ')}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">By Employment Type</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byType.map((row) => (
                  <TableRow key={row.type}>
                    <TableCell className="capitalize">{row.type.replace(/_/g, ' ')}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

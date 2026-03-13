import { useMemo } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { useLeaveReport } from '../hooks/use-reports'
import { usePermissions } from '@/hooks/use-permissions'
import { exportToCSV } from '../utils/export-csv'

export function LeaveReportsTab() {
  const { data: leaves, isLoading } = useLeaveReport()
  const { hasPermission } = usePermissions()
  const canExport = hasPermission('export_reports')

  const byStatus = useMemo(() => {
    if (!leaves) return []
    const map = new Map<string, number>()
    for (const l of leaves) {
      map.set(l.status, (map.get(l.status) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count)
  }, [leaves])

  const byType = useMemo(() => {
    if (!leaves) return []
    const map = new Map<string, { count: number; days: number }>()
    for (const l of leaves) {
      const name = (l.leave_type as any)?.name ?? 'Unknown'
      const existing = map.get(name) ?? { count: 0, days: 0 }
      map.set(name, { count: existing.count + 1, days: existing.days + (l.total_days ?? 0) })
    }
    return Array.from(map.entries())
      .map(([type, { count, days }]) => ({ type, count, days }))
      .sort((a, b) => b.days - a.days)
  }, [leaves])

  if (isLoading) return <Skeleton className="h-64" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Total Requests: {leaves?.length ?? 0}</span>
        {canExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToCSV(
                leaves ?? [],
                [
                  { header: 'Employee', accessor: (r: any) => `${r.employee?.first_name} ${r.employee?.last_name}` },
                  { header: 'Code', accessor: (r: any) => r.employee?.employee_code },
                  { header: 'Leave Type', accessor: (r: any) => r.leave_type?.name },
                  { header: 'Start', accessor: (r: any) => r.start_date },
                  { header: 'End', accessor: (r: any) => r.end_date },
                  { header: 'Days', accessor: (r: any) => r.total_days },
                  { header: 'Status', accessor: (r: any) => r.status },
                ],
                'leave-report'
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">By Leave Type</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Total Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byType.map((row) => (
                  <TableRow key={row.type}>
                    <TableCell>{row.type}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right">{row.days}</TableCell>
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

import { useMemo } from 'react'
import { one } from '@/lib/supabase-embed'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { useRecruitmentReport, useApplicationsReport } from '../hooks/use-reports'
import { usePermissions } from '@/hooks/use-permissions'
import { exportToCSV } from '../utils/export-csv'

export function RecruitmentReportsTab() {
  const { data: requisitions, isLoading: reqLoading } = useRecruitmentReport()
  const { data: applications, isLoading: appLoading } = useApplicationsReport()
  const { hasPermission } = usePermissions()
  const canExport = hasPermission('export_reports')

  const reqByStatus = useMemo(() => {
    if (!requisitions) return []
    const map = new Map<string, number>()
    for (const r of requisitions) {
      map.set(r.status, (map.get(r.status) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count)
  }, [requisitions])

  const appByStatus = useMemo(() => {
    if (!applications) return []
    const map = new Map<string, number>()
    for (const a of applications) {
      map.set(a.status, (map.get(a.status) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count)
  }, [applications])

  const totalHeadcount = useMemo(() => {
    if (!requisitions) return 0
    return requisitions.filter((r) => r.status === 'open').reduce((sum, r) => sum + (r.headcount ?? 0), 0)
  }, [requisitions])

  if (reqLoading || appLoading) return <Skeleton className="h-64" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm">
          <span className="font-medium">Requisitions: {requisitions?.length ?? 0}</span>
          <span className="text-muted-foreground">Open Headcount: {totalHeadcount}</span>
          <span className="text-muted-foreground">Applications: {applications?.length ?? 0}</span>
        </div>
        {canExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToCSV(
                requisitions ?? [],
                [
                  { header: 'Code', accessor: (r) => r.requisition_code },
                  { header: 'Title', accessor: (r) => r.title },
                  { header: 'Department', accessor: (r) => one(r.department)?.name },
                  { header: 'Headcount', accessor: (r) => r.headcount },
                  { header: 'Status', accessor: (r) => r.status },
                  { header: 'Created', accessor: (r) => r.created_at?.split('T')[0] },
                ],
                'recruitment-report'
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Requisitions by Status</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reqByStatus.map((row) => (
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
          <CardHeader><CardTitle className="text-base">Applications by Stage</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appByStatus.map((row) => (
                  <TableRow key={row.status}>
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                  </TableRow>
                ))}
                {appByStatus.length === 0 && (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No applications</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

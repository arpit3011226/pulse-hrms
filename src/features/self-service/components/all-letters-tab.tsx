import { FileText, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable } from '@/components/shared/data-table'
import { useAllLetterRequests } from '../hooks/use-self-service'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { resolvePlaceholders } from '../utils/resolve-placeholders'
import { generateLetterPdf } from '../utils/generate-letter-pdf'
import type { LetterRequestWithRelations } from '@/types/database.types'

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  pending_manager: { label: 'Pending Manager', color: 'bg-yellow-100 text-yellow-800' },
  manager_approved: { label: 'Manager Approved', color: 'bg-blue-100 text-blue-800' },
  manager_rejected: { label: 'Rejected (Mgr)', color: 'bg-red-100 text-red-800' },
  pending_hr: { label: 'Pending HR', color: 'bg-orange-100 text-orange-800' },
  hr_approved: { label: 'HR Approved', color: 'bg-green-100 text-green-800' },
  hr_rejected: { label: 'Rejected (HR)', color: 'bg-red-100 text-red-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600' },
}

export function AllLettersTab() {
  const { organization } = useAuth()
  const { data: requests, isLoading } = useAllLetterRequests()

  function handleDownload(req: LetterRequestWithRelations) {
    if (!organization || !req.template || !req.employee) return

    const resolved = req.resolved_body_html || resolvePlaceholders(req.template.body_html, {
      employee: req.employee as any,
      organization,
    })
    generateLetterPdf(
      resolved,
      req.template.name,
      organization,
      `${req.employee.first_name} ${req.employee.last_name}`,
      req.created_at
    )
  }

  if (isLoading) {
    return <Skeleton className="h-64" />
  }

  const columns = [
    {
      accessorKey: 'employee',
      header: 'Employee',
      cell: ({ row }: any) => {
        const emp = row.original.employee
        return emp ? (
          <div>
            <p className="text-sm font-medium">{emp.first_name} {emp.last_name}</p>
            <p className="text-xs text-muted-foreground">{emp.employee_code || emp.email}</p>
          </div>
        ) : '-'
      },
    },
    {
      accessorKey: 'template',
      header: 'Letter Type',
      cell: ({ row }: any) => (
        <span className="text-sm">{row.original.template?.name || '-'}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const s = STATUS_STYLES[row.original.status] || STATUS_STYLES.draft
        return <Badge variant="outline" className={s.color}>{s.label}</Badge>
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Requested On',
      cell: ({ row }: any) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.created_at).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
          })}
        </span>
      ),
    },
    {
      accessorKey: 'remarks',
      header: 'Remarks',
      cell: ({ row }: any) => (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
          {row.original.remarks || '-'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }: any) => {
        if (row.original.status === 'completed') {
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload(row.original)}
            >
              <Download className="h-4 w-4" />
            </Button>
          )
        }
        return null
      },
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={requests || []}
      searchKey="employee"
      searchPlaceholder="Search by employee..."
    />
  )
}

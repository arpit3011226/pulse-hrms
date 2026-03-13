import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import {
  Plus,
  Play,
  Eye,
  CheckCircle,
  FileText,
  Send,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { RunPayrollDialog } from './run-payroll-dialog'
import {
  usePayrollCycles,
  usePayrollRuns,
  usePayrollRunDetail,
  useCreatePayrollRun,
  useComputePayroll,
  useApprovePayrollRun,
  useGeneratePayslips,
  usePublishPayslips,
} from '../hooks/use-payroll'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { formatCurrency, getMonthName } from '../utils/payroll-utils'
import { toast } from 'sonner'

// --------------------------------------------------
// Types
// --------------------------------------------------

interface PayrollCycleRow {
  id: string
  payroll_month: number
  payroll_year: number
  processing_status: string
  pay_date: string | null
  start_date: string
  end_date: string
}

interface PayrollRunRow {
  id: string
  payroll_cycle_id: string
  run_number: number
  run_type: string
  run_status: string
  total_employees: number | null
  total_gross: number | null
  total_deductions: number | null
  total_net_pay: number | null
}

interface RunEmployeeRow {
  id: string
  employee: {
    first_name: string
    last_name: string
    employee_code: string
    department: { name: string } | null
  }
  gross_earnings: number
  total_deductions: number
  net_pay: number
  total_employer_contributions: number
  working_days: number
  lop_days: number
  payroll_earnings: { amount: number; salary_component: { component_name: string; component_code: string } }[]
  payroll_deductions: { amount: number; salary_component: { component_name: string; component_code: string } }[]
}

// --------------------------------------------------
// Component
// --------------------------------------------------

export function PayrollRunsTab() {
  const { profile } = useAuth()
  const { canManagePayroll } = usePermissions()
  const currentYear = new Date().getFullYear()

  // State
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedCycleId, setSelectedCycleId] = useState<string>('')
  const [selectedRunId, setSelectedRunId] = useState<string>('')
  const [showDetail, setShowDetail] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Queries
  const { data: cycles, isLoading: cyclesLoading } = usePayrollCycles(selectedYear)
  const { data: runs, isLoading: runsLoading } = usePayrollRuns(selectedCycleId)
  const { data: runDetail, isLoading: detailLoading } = usePayrollRunDetail(
    showDetail ? selectedRunId : ''
  )

  // Mutations
  const createRun = useCreatePayrollRun()
  const computePayroll = useComputePayroll()
  const approveRun = useApprovePayrollRun()
  const generatePayslips = useGeneratePayslips()
  const publishPayslips = usePublishPayslips()

  // Year options (current year +/- 2)
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  // ------------------------------------------------
  // Handlers
  // ------------------------------------------------

  const handleCreateRun = async (cycleId: string, nextRunNumber: number) => {
    try {
      await createRun.mutateAsync({
        payroll_cycle_id: cycleId,
        run_number: nextRunNumber,
        run_type: 'regular',
        run_status: 'draft',
      })
      toast.success('Payroll run created')
    } catch {
      toast.error('Failed to create payroll run')
    }
  }

  const handleCompute = async (runId: string) => {
    try {
      await computePayroll.mutateAsync(runId)
      toast.success('Payroll computed successfully')
    } catch {
      toast.error('Failed to compute payroll')
    }
  }

  const handleApprove = async (runId: string) => {
    try {
      await approveRun.mutateAsync({ runId, approvedBy: profile?.id })
      toast.success('Payroll run approved')
    } catch {
      toast.error('Failed to approve payroll run')
    }
  }

  const handleGeneratePayslips = async (runId: string) => {
    try {
      await generatePayslips.mutateAsync(runId)
      toast.success('Payslips generated')
    } catch {
      toast.error('Failed to generate payslips')
    }
  }

  const handlePublish = async (runId: string) => {
    try {
      await publishPayslips.mutateAsync(runId)
      toast.success('Payslips published to employees')
    } catch {
      toast.error('Failed to publish payslips')
    }
  }

  // ------------------------------------------------
  // Cycle columns
  // ------------------------------------------------

  const cycleColumns: ColumnDef<PayrollCycleRow>[] = [
    {
      accessorKey: 'payroll_month',
      header: 'Month',
      cell: ({ row }) => getMonthName(row.original.payroll_month),
    },
    {
      accessorKey: 'payroll_year',
      header: 'Year',
    },
    {
      accessorKey: 'processing_status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.processing_status} />,
    },
    {
      accessorKey: 'pay_date',
      header: 'Pay Date',
      cell: ({ row }) =>
        row.original.pay_date
          ? new Date(row.original.pay_date).toLocaleDateString()
          : '-',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const cycle = row.original
        const isSelected = selectedCycleId === cycle.id
        return (
          <Button
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setSelectedCycleId(isSelected ? '' : cycle.id)
              setSelectedRunId('')
              setShowDetail(false)
            }}
          >
            {isSelected ? (
              <ChevronDown className="mr-1 h-4 w-4" />
            ) : (
              <ChevronRight className="mr-1 h-4 w-4" />
            )}
            {isSelected ? 'Hide Runs' : 'View Runs'}
          </Button>
        )
      },
    },
  ]

  // ------------------------------------------------
  // Run columns
  // ------------------------------------------------

  const runColumns: ColumnDef<PayrollRunRow>[] = [
    {
      accessorKey: 'run_number',
      header: 'Run #',
    },
    {
      accessorKey: 'run_type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="capitalize">{row.original.run_type}</span>
      ),
    },
    {
      accessorKey: 'run_status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.run_status} />,
    },
    {
      accessorKey: 'total_employees',
      header: 'Employees',
      cell: ({ row }) => row.original.total_employees ?? '-',
    },
    {
      accessorKey: 'total_gross',
      header: 'Total Gross',
      cell: ({ row }) =>
        row.original.total_gross != null
          ? formatCurrency(row.original.total_gross)
          : '-',
    },
    {
      accessorKey: 'total_net_pay',
      header: 'Total Net',
      cell: ({ row }) =>
        row.original.total_net_pay != null
          ? formatCurrency(row.original.total_net_pay)
          : '-',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const run = row.original
        return (
          <div className="flex items-center gap-1">
            {run.run_status === 'draft' && canManagePayroll && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCompute(run.id)}
                disabled={computePayroll.isPending}
              >
                <Play className="mr-1 h-3 w-3" />
                Compute
              </Button>
            )}
            {run.run_status === 'completed' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedRunId(run.id)
                    setShowDetail(true)
                  }}
                >
                  <Eye className="mr-1 h-3 w-3" />
                  Details
                </Button>
                {canManagePayroll && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApprove(run.id)}
                    disabled={approveRun.isPending}
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Approve
                  </Button>
                )}
              </>
            )}
            {run.run_status === 'approved' && canManagePayroll && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGeneratePayslips(run.id)}
                  disabled={generatePayslips.isPending}
                >
                  <FileText className="mr-1 h-3 w-3" />
                  Payslips
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePublish(run.id)}
                  disabled={publishPayslips.isPending}
                >
                  <Send className="mr-1 h-3 w-3" />
                  Publish
                </Button>
              </>
            )}
          </div>
        )
      },
    },
  ]

  // ------------------------------------------------
  // Employee detail columns
  // ------------------------------------------------

  const employeeColumns: ColumnDef<RunEmployeeRow>[] = [
    {
      id: 'employee_name',
      header: 'Employee',
      cell: ({ row }) => {
        const emp = row.original.employee
        return (
          <div>
            <p className="font-medium">
              {emp.first_name} {emp.last_name}
            </p>
            <p className="text-xs text-muted-foreground">{emp.employee_code}</p>
          </div>
        )
      },
    },
    {
      id: 'department',
      header: 'Department',
      cell: ({ row }) => row.original.employee?.department?.name ?? '-',
    },
    {
      accessorKey: 'gross_earnings',
      header: 'Gross',
      cell: ({ row }) => formatCurrency(row.original.gross_earnings),
    },
    {
      accessorKey: 'total_deductions',
      header: 'Deductions',
      cell: ({ row }) => formatCurrency(row.original.total_deductions),
    },
    {
      accessorKey: 'net_pay',
      header: 'Net Pay',
      cell: ({ row }) => (
        <span className="font-semibold">{formatCurrency(row.original.net_pay)}</span>
      ),
    },
    {
      accessorKey: 'total_employer_contributions',
      header: 'Employer Cost',
      cell: ({ row }) => formatCurrency(row.original.total_employer_contributions),
    },
    {
      accessorKey: 'working_days',
      header: 'Days',
      cell: ({ row }) => (
        <span>
          {row.original.working_days}
          {row.original.lop_days > 0 && (
            <span className="text-xs text-destructive ml-1">
              (-{row.original.lop_days} LOP)
            </span>
          )}
        </span>
      ),
    },
  ]

  // ------------------------------------------------
  // Derived state
  // ------------------------------------------------

  const selectedCycle = (cycles || []).find(
    (c: PayrollCycleRow) => c.id === selectedCycleId
  )
  const runsList = (runs || []) as PayrollRunRow[]
  const hasNoRuns = selectedCycleId && !runsLoading && runsList.length === 0
  const nextRunNumber = runsList.length > 0 ? Math.max(...runsList.map((r) => r.run_number)) + 1 : 1

  // ------------------------------------------------
  // Render
  // ------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Cycles Section */}
      <DataTable
        columns={cycleColumns}
        data={(cycles || []) as PayrollCycleRow[]}
        searchKey="payroll_month"
        searchPlaceholder="Search payroll cycles..."
        isLoading={cyclesLoading}
        toolbarActions={
          <div className="flex items-center gap-2">
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => {
                setSelectedYear(parseInt(v))
                setSelectedCycleId('')
                setSelectedRunId('')
                setShowDetail(false)
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canManagePayroll && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Cycle
              </Button>
            )}
          </div>
        }
      />

      {/* Runs Section (visible when a cycle is selected) */}
      {selectedCycleId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">
              Payroll Runs &mdash;{' '}
              {selectedCycle
                ? `${getMonthName(selectedCycle.payroll_month)} ${selectedCycle.payroll_year}`
                : ''}
            </CardTitle>
            {hasNoRuns && canManagePayroll && (
              <Button
                size="sm"
                onClick={() => handleCreateRun(selectedCycleId, nextRunNumber)}
                disabled={createRun.isPending}
              >
                <Plus className="mr-1 h-4 w-4" />
                Create Run
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <DataTable
              columns={runColumns}
              data={runsList}
              isLoading={runsLoading}
            />
          </CardContent>
        </Card>
      )}

      {/* Employee-level detail (visible when a run is expanded) */}
      {showDetail && selectedRunId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Employee Payroll Details</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={employeeColumns}
              data={(runDetail || []) as RunEmployeeRow[]}
              searchKey="employee_name"
              searchPlaceholder="Search employees..."
              isLoading={detailLoading}
            />
          </CardContent>
        </Card>
      )}

      {/* Create Cycle Dialog */}
      <RunPayrollDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  )
}

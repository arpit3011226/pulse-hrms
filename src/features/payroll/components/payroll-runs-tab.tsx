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
  Workflow,
  ShieldCheck,
  XCircle,
  Clock,
  Banknote,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { RunPayrollDialog } from './run-payroll-dialog'
import { PayrollRunWorkflow } from './payroll-workflow/payroll-run-workflow'
import {
  usePayrollCycles,
  usePayrollRuns,
  usePayrollRunDetail,
  useCreatePayrollRun,
  useComputePayroll,
  useGeneratePayslips,
  usePublishPayslips,
  useCurrentEmployee,
  useExecutePayroll,
} from '../hooks/use-payroll'
import {
  usePayrollApprovals,
  useSubmitForApproval,
  useApprovePayrollCycle,
  useRejectPayrollCycle,
  usePayrollConfig,
} from '../hooks/use-payroll-config'
import { usePermissions } from '@/hooks/use-permissions'
import { formatCurrency, getMonthName } from '../utils/payroll-utils'
import { toast } from 'sonner'
import { humanizeLabel } from '@/lib/utils'

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
  approval_status?: string
  submitted_for_approval_at?: string | null
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
// Approval status badge helper
// --------------------------------------------------

function ApprovalStatusBadge({ status }: { status?: string }) {
  if (!status || status === 'not_submitted') return null

  const variants: Record<string, { label: string; className: string }> = {
    pending_l1: { label: 'Pending L1', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    pending_l2: { label: 'Pending L2', className: 'bg-blue-100 text-blue-800 border-blue-200' },
    approved: { label: 'Approved', className: 'bg-green-100 text-green-800 border-green-200' },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800 border-red-200' },
  }

  const v = variants[status]
  if (!v) return null

  return (
    <Badge variant="outline" className={v.className}>
      {v.label}
    </Badge>
  )
}

// --------------------------------------------------
// Component
// --------------------------------------------------

export function PayrollRunsTab() {
  const { canManagePayroll, isAdmin, isHR, role } = usePermissions()
  const currentYear = new Date().getFullYear()

  // State
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedCycleId, setSelectedCycleId] = useState<string>('')
  const [selectedRunId, setSelectedRunId] = useState<string>('')
  const [showDetail, setShowDetail] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [workflowCycleId, setWorkflowCycleId] = useState<string>('')
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectCycleId, setRejectCycleId] = useState<string>('')
  const [rejectLevel, setRejectLevel] = useState<1 | 2>(1)
  const [rejectRemarks, setRejectRemarks] = useState('')

  // Queries
  const { data: cycles, isLoading: cyclesLoading } = usePayrollCycles(selectedYear)
  const { data: runs, isLoading: runsLoading } = usePayrollRuns(selectedCycleId)
  const { data: runDetail, isLoading: detailLoading } = usePayrollRunDetail(
    showDetail ? selectedRunId : ''
  )
  const { data: currentEmployee } = useCurrentEmployee()
  const { data: payrollConfig } = usePayrollConfig()
  const { data: approvals } = usePayrollApprovals(selectedCycleId)

  // Mutations
  const createRun = useCreatePayrollRun()
  const computePayroll = useComputePayroll()
  const generatePayslips = useGeneratePayslips()
  const publishPayslips = usePublishPayslips()
  const submitForApproval = useSubmitForApproval()
  const approveCycle = useApprovePayrollCycle()
  const rejectCycle = useRejectPayrollCycle()
  const executePayroll = useExecutePayroll()

  // Year options (current year +/- 2)
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  // ------------------------------------------------
  // Role-based approval checks
  // ------------------------------------------------

  const canApproveL1 = (() => {
    if (!payrollConfig) return canManagePayroll
    const approverRole = payrollConfig.first_approver_role
    return role === 'super_admin' || role === approverRole
  })()

  const canApproveL2 = (() => {
    if (!payrollConfig) return isAdmin || isHR
    const approverRole = payrollConfig.second_approver_role
    return role === 'super_admin' || role === approverRole
  })()

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
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err ?? 'Unknown error')
      console.error('Failed to compute payroll:', err)
      toast.error(`Failed to compute payroll: ${msg}`)
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

  const handleExecutePayroll = async (cycleId: string) => {
    try {
      await executePayroll.mutateAsync(cycleId)
      toast.success('Payroll executed — CSV downloaded')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err ?? 'Unknown error')
      console.error('Failed to execute payroll:', err)
      toast.error(`Failed to execute payroll: ${msg}`)
    }
  }

  const handleSubmitForApproval = async (cycleId: string) => {
    if (!currentEmployee?.id) {
      toast.error('Cannot identify current employee')
      return
    }
    try {
      await submitForApproval.mutateAsync({ cycleId, submittedBy: currentEmployee.id })
      toast.success('Payroll submitted for approval')
    } catch {
      toast.error('Failed to submit for approval')
    }
  }

  const handleApproveCycle = async (cycleId: string, level: 1 | 2) => {
    if (!currentEmployee?.id) {
      toast.error('Cannot identify current employee')
      return
    }
    try {
      await approveCycle.mutateAsync({ cycleId, level, approverId: currentEmployee.id })
      toast.success(`Level ${level} approval granted`)
    } catch {
      toast.error('Failed to approve')
    }
  }

  const handleRejectCycle = async () => {
    if (!currentEmployee?.id || !rejectRemarks.trim()) {
      toast.error('Please provide rejection remarks')
      return
    }
    try {
      await rejectCycle.mutateAsync({
        cycleId: rejectCycleId,
        level: rejectLevel,
        approverId: currentEmployee.id,
        remarks: rejectRemarks,
      })
      toast.success('Payroll rejected')
      setRejectDialogOpen(false)
      setRejectRemarks('')
    } catch {
      toast.error('Failed to reject')
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
      id: 'approval_status',
      header: 'Approval',
      cell: ({ row }) => <ApprovalStatusBadge status={row.original.approval_status} />,
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
        const approvalStatus = cycle.approval_status || 'not_submitted'
        const isComputed = cycle.processing_status === 'computed'

        return (
          <div className="flex items-center gap-1">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWorkflowCycleId(cycle.id)}
            >
              <Workflow className="mr-1 h-3 w-3" />
              Workflow
            </Button>

            {/* Submit for Approval - shown when computed and not yet submitted */}
            {isComputed && approvalStatus === 'not_submitted' && canManagePayroll && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSubmitForApproval(cycle.id)}
                disabled={submitForApproval.isPending}
              >
                <Send className="mr-1 h-3 w-3" />
                Submit for Approval
              </Button>
            )}

            {/* L1 Approve/Reject - shown to L1 approvers when pending L1 */}
            {approvalStatus === 'pending_l1' && canApproveL1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-700 hover:text-green-800"
                  onClick={() => handleApproveCycle(cycle.id, 1)}
                  disabled={approveCycle.isPending}
                >
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Approve L1
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-700 hover:text-red-800"
                  onClick={() => {
                    setRejectCycleId(cycle.id)
                    setRejectLevel(1)
                    setRejectDialogOpen(true)
                  }}
                >
                  <XCircle className="mr-1 h-3 w-3" />
                  Reject
                </Button>
              </>
            )}

            {/* L2 Approve/Reject - shown to L2 approvers when pending L2 */}
            {approvalStatus === 'pending_l2' && canApproveL2 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-700 hover:text-green-800"
                  onClick={() => handleApproveCycle(cycle.id, 2)}
                  disabled={approveCycle.isPending}
                >
                  <ShieldCheck className="mr-1 h-3 w-3" />
                  Approve L2
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-700 hover:text-red-800"
                  onClick={() => {
                    setRejectCycleId(cycle.id)
                    setRejectLevel(2)
                    setRejectDialogOpen(true)
                  }}
                >
                  <XCircle className="mr-1 h-3 w-3" />
                  Reject
                </Button>
              </>
            )}

            {/* Execute Payroll / Mark as Paid - shown when approved and not yet paid */}
            {approvalStatus === 'approved' && cycle.processing_status !== 'paid' && canManagePayroll && (
              <Button
                size="sm"
                onClick={() => handleExecutePayroll(cycle.id)}
                disabled={executePayroll.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {executePayroll.isPending ? (
                  <Download className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Banknote className="mr-1 h-3 w-3" />
                )}
                Execute Payroll
              </Button>
            )}
          </div>
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
        <span>{humanizeLabel(row.original.run_type)}</span>
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
            {(run.run_status === 'completed' || run.run_status === 'approved') && (
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

  // If workflow mode is active, render the workflow view
  if (workflowCycleId) {
    return (
      <PayrollRunWorkflow
        cycleId={workflowCycleId}
        onBack={() => setWorkflowCycleId('')}
      />
    )
  }

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

      {/* Approval Timeline (visible when a cycle is selected) */}
      {selectedCycleId && approvals && approvals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Approval Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6">
              {(approvals as Array<{
                id: string
                approval_level: number
                status: string
                remarks: string | null
                approved_at: string | null
                approver?: { first_name: string; last_name: string } | null
              }>).map((approval) => (
                <div key={approval.id} className="flex items-start gap-3">
                  <div className={`mt-1 h-3 w-3 rounded-full shrink-0 ${
                    approval.status === 'approved'
                      ? 'bg-green-500'
                      : approval.status === 'rejected'
                        ? 'bg-red-500'
                        : 'bg-yellow-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium">
                      Level {approval.approval_level} - <span className="capitalize">{approval.status}</span>
                    </p>
                    {approval.approver && (
                      <p className="text-xs text-muted-foreground">
                        {approval.approver.first_name} {approval.approver.last_name}
                      </p>
                    )}
                    {approval.approved_at && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(approval.approved_at).toLocaleString()}
                      </p>
                    )}
                    {approval.remarks && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        &ldquo;{approval.remarks}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payroll</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this payroll cycle.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection remarks..."
            value={rejectRemarks}
            onChange={(e) => setRejectRemarks(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectCycle}
              disabled={rejectCycle.isPending || !rejectRemarks.trim()}
            >
              Reject Payroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

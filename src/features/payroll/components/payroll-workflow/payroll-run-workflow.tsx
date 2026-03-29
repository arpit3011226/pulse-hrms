import { useState } from 'react'
import {
  ArrowLeft,
  FileText,
  Play,
  CheckCircle2,
  Send,
  Banknote,
  Loader2,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getMonthName } from '../../utils/payroll-utils'
import {
  usePayrollRuns,
  usePayrollCycles,
  useGeneratePayslips,
  usePublishPayslips,
  useExecutePayroll,
} from '../../hooks/use-payroll'
import { usePermissions } from '@/hooks/use-permissions'
import { PayrollSummaryCards } from './payroll-summary-cards'
import { PayrollProcessingView } from './payroll-processing-view'
import { PayrollPayslipView } from './payroll-payslip-view'
import { toast } from 'sonner'

interface PayrollRunWorkflowProps {
  cycleId: string
  onBack?: () => void
}

type WorkflowStage = 'draft' | 'processing' | 'computed' | 'payslips' | 'approval' | 'paid'

const STAGES: { key: WorkflowStage; label: string; icon: React.ElementType }[] = [
  { key: 'draft', label: 'Draft', icon: FileText },
  { key: 'processing', label: 'Compute', icon: Play },
  { key: 'computed', label: 'Validated', icon: CheckCircle2 },
  { key: 'payslips', label: 'Payslips', icon: FileText },
  { key: 'approval', label: 'Approval', icon: Send },
  { key: 'paid', label: 'Paid', icon: Banknote },
]

function getStageIndex(cycleStatus: string, runStatus: string, viewingPayslips: boolean): number {
  if (cycleStatus === 'paid') return 5
  if (cycleStatus === 'approved') return 4
  if (cycleStatus === 'computed') return viewingPayslips ? 3 : 2
  if (runStatus === 'completed') return 2
  if (runStatus === 'processing') return 1
  return 0
}

export function PayrollRunWorkflow({ cycleId, onBack }: PayrollRunWorkflowProps) {
  const { canManagePayroll } = usePermissions()
  const { data: cycles } = usePayrollCycles()
  const { data: runs, refetch: refetchRuns } = usePayrollRuns(cycleId)
  const generatePayslips = useGeneratePayslips()
  const publishPayslips = usePublishPayslips()
  const executePayroll = useExecutePayroll()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cycle = (cycles || []).find((c: any) => c.id === cycleId) as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const run = ((runs || []) as any[])[0]

  const [viewPayslips, setViewPayslips] = useState(false)

  if (!cycle) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading...
      </div>
    )
  }

  const monthLabel = `${getMonthName(cycle.payroll_month)} ${cycle.payroll_year}`
  const runStatus: string = run?.run_status || 'draft'
  const cycleStatus: string = cycle?.processing_status || 'draft'
  const currentStageIndex = getStageIndex(cycleStatus, runStatus, viewPayslips)

  const totalGross = run?.total_gross || 0
  const totalDeductions = run?.total_deductions || 0
  const totalNet = run?.total_net_pay || 0
  const totalEmployees = run?.total_employees || 0

  const handleGeneratePayslips = async () => {
    if (!run) return
    try {
      await generatePayslips.mutateAsync(run.id)
      toast.success('Payslips generated')
      refetchRuns()
    } catch {
      toast.error('Failed to generate payslips')
    }
  }

  const handlePublishPayslips = async () => {
    if (!run) return
    try {
      await publishPayslips.mutateAsync(run.id)
      toast.success('Payslips published to employees')
      refetchRuns()
    } catch {
      toast.error('Failed to publish payslips')
    }
  }

  const handleExecutePayroll = async () => {
    try {
      await executePayroll.mutateAsync(cycleId)
      toast.success('Payroll executed — CSV downloaded')
    } catch (err: any) {
      const msg = err?.message || 'Unknown error'
      toast.error(`Failed to execute payroll: ${msg}`)
    }
  }

  const handleStatusChange = () => {
    refetchRuns()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack ? (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <Link to="/payroll">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payroll Run</h1>
            <p className="text-sm text-muted-foreground">{monthLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Generate & Publish Payslips — available after compute */}
          {(runStatus === 'completed' || runStatus === 'approved') && canManagePayroll && !viewPayslips && (
            <>
              <Button
                onClick={handleGeneratePayslips}
                disabled={generatePayslips.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <FileText className="mr-2 h-4 w-4" />
                Generate Payslips
              </Button>
              <Button
                variant="outline"
                onClick={handlePublishPayslips}
                disabled={publishPayslips.isPending}
              >
                <Send className="mr-2 h-4 w-4" />
                Publish
              </Button>
              <Button
                variant="outline"
                onClick={() => setViewPayslips(true)}
              >
                <FileText className="mr-2 h-4 w-4" />
                View Payslips
              </Button>
            </>
          )}
          {/* Execute Payroll — available after cycle approved */}
          {cycleStatus === 'approved' && canManagePayroll && (
            <Button
              onClick={handleExecutePayroll}
              disabled={executePayroll.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Banknote className="mr-2 h-4 w-4" />
              Execute Payroll
            </Button>
          )}
          {viewPayslips && (
            <Button variant="outline" onClick={() => setViewPayslips(false)}>
              Back to Summary
            </Button>
          )}
        </div>
      </div>

      {/* Stage stepper */}
      <div className="flex items-center gap-1 rounded-xl border bg-white px-4 py-3">
        {STAGES.map((stage, i) => {
          const Icon = stage.icon
          const isCurrent = i === currentStageIndex
          const isPast = i < currentStageIndex
          return (
            <div key={stage.key} className="flex items-center gap-1 flex-1">
              <div
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors flex-1 justify-center',
                  isCurrent && 'bg-orange-100 text-orange-700 border border-orange-300',
                  isPast && 'text-emerald-600',
                  !isCurrent && !isPast && 'text-muted-foreground'
                )}
              >
                {isPast ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <Icon className={cn('h-4 w-4 shrink-0', isCurrent ? 'text-orange-600' : 'text-muted-foreground/50')} />
                )}
                <span className="hidden sm:inline">{stage.label}</span>
              </div>
              {i < STAGES.length - 1 && (
                <div className={cn('h-px w-4 shrink-0', isPast ? 'bg-emerald-300' : 'bg-border')} />
              )}
            </div>
          )
        })}
      </div>

      {/* Summary cards */}
      <PayrollSummaryCards
        totalGross={totalGross}
        totalDeductions={totalDeductions}
        totalNet={totalNet}
        totalEmployees={totalEmployees}
        dimmed={runStatus === 'draft' || runStatus === 'processing'}
      />

      {/* Stage content */}
      {viewPayslips ? (
        <PayrollPayslipView
          runId={run?.id || ''}
          runStatus={runStatus}
          payrollMonth={cycle.payroll_month}
          payrollYear={cycle.payroll_year}
          onStatusChange={handleStatusChange}
        />
      ) : (runStatus === 'draft' || runStatus === 'processing' || runStatus === 'completed' || runStatus === 'approved') && run ? (
        <PayrollProcessingView
          runId={run.id}
          runStatus={runStatus}
          onStatusChange={handleStatusChange}
        />
      ) : !run ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-muted-foreground">No payroll run found for this cycle.</p>
          <p className="text-xs text-muted-foreground mt-1">Create a run from the Payroll Runs tab.</p>
        </div>
      ) : null}
    </div>
  )
}

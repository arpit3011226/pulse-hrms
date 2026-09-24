import { useState, useEffect } from 'react'
import { CheckCircle2, Loader2, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatCurrency } from '../../utils/payroll-utils'
import { useComputePayroll, usePayrollRunDetail } from '../../hooks/use-payroll'
import { toast } from 'sonner'

interface PayrollProcessingViewProps {
  runId: string
  runStatus: string
  onStatusChange?: () => void
}

interface RunEmployee {
  id: string
  employee: {
    first_name: string
    last_name: string
    employee_code: string
  }
  gross_earnings: number
  total_deductions: number
  net_pay: number
  payroll_status: string
}

export function PayrollProcessingView({ runId, runStatus, onStatusChange }: PayrollProcessingViewProps) {
  const computePayroll = useComputePayroll()
  const { data: runDetail } = usePayrollRunDetail(
    runStatus === 'completed' || runStatus === 'approved' ? runId : ''
  )

  const [progress, setProgress] = useState(runStatus === 'draft' ? 0 : 100)
  const [isComputing, setIsComputing] = useState(false)

  // Animate progress when computing
  useEffect(() => {
    if (!isComputing) return
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval)
          return prev
        }
        return prev + Math.random() * 15
      })
    }, 300)
    return () => clearInterval(interval)
  }, [isComputing])

  const handleCompute = async () => {
    setIsComputing(true)
    setProgress(5)
    try {
      await computePayroll.mutateAsync(runId)
      setProgress(100)
      toast.success('Payroll computed successfully')
      onStatusChange?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err ?? 'Unknown error')
      console.error('Failed to compute payroll:', err)
      toast.error(`Failed to compute payroll: ${msg}`)
      setProgress(0)
    } finally {
      setIsComputing(false)
    }
  }

  const employees = (runDetail || []) as RunEmployee[]
  const isComplete = runStatus === 'completed' || runStatus === 'approved' || progress >= 100

  return (
    <div className="space-y-5">
      {/* Progress bar section */}
      <div className="rounded-xl border bg-white p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isComputing ? (
              <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
            ) : isComplete ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <Play className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="font-semibold text-foreground">
              {isComputing
                ? 'Computing salaries...'
                : isComplete
                  ? 'Computation complete'
                  : 'Ready to compute'}
            </span>
          </div>
          <span className="text-sm font-bold text-orange-600">
            {Math.round(Math.min(progress, 100))}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              isComplete
                ? 'bg-emerald-500'
                : 'bg-gradient-to-r from-orange-400 to-orange-500'
            )}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        {runStatus === 'draft' && !isComputing && progress === 0 && (
          <div className="mt-4 flex justify-center">
            <Button onClick={handleCompute} className="bg-orange-500 hover:bg-orange-600">
              <Play className="mr-2 h-4 w-4" />
              Start Computation
            </Button>
          </div>
        )}
      </div>

      {/* Employee validation table */}
      {isComplete && employees.length > 0 && (
        <div className="rounded-xl border bg-white">
          <div className="border-b px-6 py-4">
            <h3 className="font-semibold text-foreground">Employee Breakdown</h3>
            <p className="text-xs text-muted-foreground">{employees.length} employees processed</p>
          </div>
          <div className="divide-y">
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-3 text-xs font-medium text-muted-foreground">
              <span>Employee</span>
              <span className="w-28 text-right">Gross</span>
              <span className="w-28 text-right">Deductions</span>
              <span className="w-28 text-right">Net Pay</span>
              <span className="w-8" />
            </div>

            {employees.map((emp) => (
              <div
                key={emp.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-6 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {emp.employee.first_name} {emp.employee.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{emp.employee.employee_code}</p>
                </div>
                <span className="w-28 text-right text-sm">
                  {formatCurrency(emp.gross_earnings)}
                </span>
                <span className="w-28 text-right text-sm text-red-500">
                  -{formatCurrency(emp.total_deductions)}
                </span>
                <span className="w-28 text-right text-sm font-semibold text-emerald-600">
                  {formatCurrency(emp.net_pay)}
                </span>
                <div className="flex w-8 justify-center">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

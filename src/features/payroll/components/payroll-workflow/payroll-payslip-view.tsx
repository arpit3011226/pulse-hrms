import { useState } from 'react'
import { FileText, Send, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { PieChart, Pie, Cell } from 'recharts'
import { cn, getInitials } from '@/lib/utils'
import { formatCurrency, getMonthName } from '../../utils/payroll-utils'
import {
  usePayrollRunDetail,
  useGeneratePayslips,
  usePublishPayslips,
} from '../../hooks/use-payroll'
import { toast } from 'sonner'

interface PayrollPayslipViewProps {
  runId: string
  runStatus: string
  payrollMonth: number
  payrollYear: number
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
  payroll_earnings: {
    amount: number
    salary_component: { component_name: string; component_code: string }
  }[]
  payroll_deductions: {
    amount: number
    salary_component: { component_name: string; component_code: string }
  }[]
}

const DONUT_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

export function PayrollPayslipView({
  runId,
  runStatus,
  payrollMonth,
  payrollYear,
  onStatusChange,
}: PayrollPayslipViewProps) {
  const { data: runDetail } = usePayrollRunDetail(runId)
  const generatePayslips = useGeneratePayslips()
  const publishPayslips = usePublishPayslips()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const employees = (runDetail || []) as RunEmployee[]

  const handleGenerate = async () => {
    try {
      await generatePayslips.mutateAsync(runId)
      toast.success('Payslips generated')
      onStatusChange?.()
    } catch {
      toast.error('Failed to generate payslips')
    }
  }

  const handlePublish = async () => {
    try {
      await publishPayslips.mutateAsync(runId)
      toast.success('Payslips published to employees')
      onStatusChange?.()
    } catch {
      toast.error('Failed to publish payslips')
    }
  }

  const monthLabel = `${getMonthName(payrollMonth)} ${payrollYear}`

  return (
    <div className="space-y-5">
      {/* Actions bar */}
      <div className="flex items-center justify-between rounded-xl border bg-white px-6 py-4">
        <div>
          <h3 className="font-semibold text-foreground">Payslip Generation</h3>
          <p className="text-xs text-muted-foreground">{monthLabel} - {employees.length} employees</p>
        </div>
        <div className="flex items-center gap-2">
          {(runStatus === 'completed' || runStatus === 'approved') && (
            <Button
              onClick={handleGenerate}
              disabled={generatePayslips.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {generatePayslips.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Generate Payslips
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handlePublish}
            disabled={publishPayslips.isPending}
          >
            {publishPayslips.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Publish All
          </Button>
        </div>
      </div>

      {/* Payslip cards */}
      <div className="space-y-4">
        {employees.map((emp) => {
          const isExpanded = expandedId === emp.id
          const earnings = emp.payroll_earnings || []
          const deductions = emp.payroll_deductions || []

          // Build donut data from all components
          const donutData = [
            ...earnings.map((e) => ({
              name: e.salary_component?.component_name || 'Earning',
              value: e.amount,
            })),
            ...deductions.map((d) => ({
              name: d.salary_component?.component_name || 'Deduction',
              value: d.amount,
            })),
          ].filter((d) => d.value > 0)

          const total = donutData.reduce((s, d) => s + d.value, 0)

          const chartConfig = donutData.reduce(
            (acc, d, i) => {
              acc[d.name] = { label: d.name, color: DONUT_COLORS[i % DONUT_COLORS.length] }
              return acc
            },
            {} as Record<string, { label: string; color: string }>
          )

          return (
            <div key={emp.id} className="rounded-xl border bg-white overflow-hidden">
              {/* Card header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : emp.id)}
                className="flex w-full items-center gap-4 px-6 py-4 text-left hover:bg-muted/30 transition-colors"
              >
                <Avatar className="h-10 w-10 border">
                  <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                    {getInitials(emp.employee.first_name, emp.employee.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {emp.employee.first_name} {emp.employee.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {monthLabel} Payslip
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 border border-emerald-200">
                  <CheckCircle2 className="mr-1 inline h-3 w-3" />
                  Generated
                </span>
                <span className="ml-2 text-lg font-bold text-emerald-600">
                  {formatCurrency(emp.net_pay)}
                </span>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t px-6 py-5">
                  <div className="grid gap-6 lg:grid-cols-[1fr_200px]">
                    {/* Component breakdown */}
                    <div className="space-y-1">
                      {/* Earnings */}
                      {earnings.length > 0 && (
                        <div className="mb-3">
                          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Earnings
                          </p>
                          {earnings.map((e, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5">
                              <span className="text-sm text-foreground">
                                {e.salary_component?.component_name}
                              </span>
                              <span className="text-sm font-medium">
                                {formatCurrency(e.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Deductions */}
                      {deductions.length > 0 && (
                        <div className="mb-3">
                          <div className="my-2 border-t" />
                          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Deductions
                          </p>
                          {deductions.map((d, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5">
                              <span className="text-sm text-red-500">
                                {d.salary_component?.component_name}
                              </span>
                              <span className="text-sm font-medium text-red-500">
                                -{formatCurrency(d.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Net pay */}
                      <div className="border-t pt-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">Net Pay</span>
                          <span className="text-lg font-bold text-emerald-600">
                            {formatCurrency(emp.net_pay)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Donut chart */}
                    {donutData.length > 0 && (
                      <div className="flex flex-col items-center">
                        <ChartContainer
                          config={chartConfig}
                          className="h-[180px] w-[180px]"
                        >
                          <PieChart>
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Pie
                              data={donutData}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={75}
                              paddingAngle={2}
                              dataKey="value"
                              nameKey="name"
                            >
                              {donutData.map((_, i) => (
                                <Cell
                                  key={i}
                                  fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                                />
                              ))}
                            </Pie>
                          </PieChart>
                        </ChartContainer>

                        {/* Legend */}
                        <div className="mt-2 space-y-1">
                          {donutData.map((d, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <div
                                className={cn('h-2.5 w-2.5 rounded-full')}
                                style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                              />
                              <span className="text-muted-foreground">
                                {d.name} {total > 0 ? `${Math.round((d.value / total) * 100)}%` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

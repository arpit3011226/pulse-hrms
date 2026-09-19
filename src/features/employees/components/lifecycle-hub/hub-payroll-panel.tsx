import { Wallet } from 'lucide-react'
import { useEmployeeCompensation, useMyPayslips } from '@/features/payroll/hooks/use-payroll'

interface HubPayrollPanelProps {
  employeeId: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatLakhs(amount: number): string {
  if (amount >= 100000) {
    const lakhs = amount / 100000
    return `${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1)}L`
  }
  return formatCurrency(amount)
}

export function HubPayrollPanel({ employeeId }: HubPayrollPanelProps) {
  const { data: compensation, isLoading: loadingComp } = useEmployeeCompensation(employeeId)
  const { data: payslips, isLoading: loadingPayslips } = useMyPayslips(employeeId)

  if (loadingComp || loadingPayslips) {
    return <div className="animate-pulse rounded-lg border bg-muted/30 p-6 h-20" />
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comp = compensation as any

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latestPayslip = (payslips ?? [])[0] as any

  if (!comp) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
        <Wallet className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
        No compensation assigned
      </div>
    )
  }

  const monthlyGross = comp.monthly_gross ?? 0
  const annualCTC = monthlyGross * 12
  const components = comp.employee_compensation_components ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const earnings = components.filter((c: any) => c.salary_component?.component_type === 'earning')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deductions = components.filter((c: any) => c.salary_component?.component_type === 'deduction')

  return (
    <div className="space-y-3">
      {/* CTC summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border bg-orange-50/50 px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground">Annual CTC</p>
          <p className="text-lg font-bold text-orange-600">₹{formatLakhs(annualCTC)}</p>
        </div>
        <div className="rounded-lg border bg-emerald-50/50 px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground">Monthly Gross</p>
          <p className="text-lg font-bold text-emerald-600">{formatCurrency(monthlyGross)}</p>
        </div>
      </div>

      {/* Component breakdown */}
      {(earnings.length > 0 || deductions.length > 0) && (
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {comp.salary_structure?.structure_name || 'Salary Structure'}
          </p>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {earnings.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between py-1">
              <span className="text-sm text-foreground">{c.salary_component?.component_name}</span>
              <span className="text-sm font-medium">{formatCurrency(c.monthly_amount)}</span>
            </div>
          ))}
          {deductions.length > 0 && <div className="my-1.5 border-t" />}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {deductions.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between py-1">
              <span className="text-sm text-red-500">{c.salary_component?.component_name}</span>
              <span className="text-sm font-medium text-red-500">
                -{formatCurrency(c.monthly_amount)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Latest payslip */}
      {latestPayslip && (
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Latest Payslip</p>
            <span className="text-xs font-medium text-emerald-600">
              {latestPayslip.published ? 'Published' : 'Generated'}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">
              Net Pay
            </span>
            <span className="text-lg font-bold text-emerald-600">
              {formatCurrency(latestPayslip.net_pay ?? 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

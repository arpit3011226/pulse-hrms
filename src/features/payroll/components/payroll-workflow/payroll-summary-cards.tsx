import { Banknote, ShieldMinus, Receipt, FileStack } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PayrollSummaryCardsProps {
  totalGross: number
  totalDeductions: number
  totalNet: number
  totalEmployees: number
  dimmed?: boolean
}

function formatLakhs(amount: number): string {
  if (amount >= 100000) {
    const lakhs = amount / 100000
    return `₹${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1)}L`
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

const CARDS = [
  {
    key: 'gross',
    label: 'Salary Components',
    icon: Banknote,
    bg: 'bg-indigo-50',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    valueColor: 'text-indigo-700',
  },
  {
    key: 'deductions',
    label: 'Deductions (PF/ESI)',
    icon: ShieldMinus,
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    valueColor: 'text-amber-700',
  },
  {
    key: 'net',
    label: 'Net Payable',
    icon: Receipt,
    bg: 'bg-emerald-50',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    valueColor: 'text-emerald-700',
  },
  {
    key: 'employees',
    label: 'Employees',
    icon: FileStack,
    bg: 'bg-rose-50',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    valueColor: 'text-rose-700',
  },
] as const

export function PayrollSummaryCards({
  totalGross,
  totalDeductions,
  totalNet,
  totalEmployees,
  dimmed,
}: PayrollSummaryCardsProps) {
  const values: Record<string, string> = {
    gross: formatLakhs(totalGross),
    deductions: formatLakhs(totalDeductions),
    net: formatLakhs(totalNet),
    employees: String(totalEmployees),
  }

  return (
    <div className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4', dimmed && 'opacity-60')}>
      {CARDS.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.key}
            className={cn('rounded-xl border p-4', card.bg)}
          >
            <div className="flex items-center gap-3">
              <div className={cn('rounded-lg p-2', card.iconBg)}>
                <Icon className={cn('h-5 w-5', card.iconColor)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className={cn('text-lg font-bold', card.valueColor)}>
                  {values[card.key]}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

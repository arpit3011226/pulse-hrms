import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { IndianRupee, TrendingDown, Calculator } from 'lucide-react'
import { formatCurrency } from '../utils/payroll-utils'
import type { TaxBreakdown } from '../utils/tax-calculator'
import type { TaxRegime } from '@/types/database.types'

interface TaxSummaryCardProps {
  regime: TaxRegime
  breakdown: TaxBreakdown | null
  monthlyTds: number
  compact?: boolean
}

export function TaxSummaryCard({ regime, breakdown, monthlyTds, compact }: TaxSummaryCardProps) {
  if (!breakdown) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No tax computation available. Submit your declaration to see the summary.
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <Card className="border-orange-200 bg-orange-50/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">
                {regime === 'new' ? 'New Regime' : 'Old Regime'}
              </span>
            </div>
            <Badge variant="outline" className="border-orange-300 text-orange-700">
              Monthly TDS: {formatCurrency(monthlyTds)}
            </Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-orange-700">
              {formatCurrency(breakdown.totalTax)}
            </span>
            <span className="text-xs text-muted-foreground">annual tax</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <IndianRupee className="h-4 w-4 text-orange-600" />
          Tax Summary
          <Badge variant="outline" className="ml-auto">
            {regime === 'new' ? 'New Regime' : 'Old Regime'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <SummaryRow label="Gross Income" value={breakdown.grossIncome} />
          <SummaryRow label="Standard Deduction" value={breakdown.standardDeduction} negative />
          {breakdown.totalExemptions > 0 && (
            <SummaryRow label="Exemptions (Ch VI-A)" value={breakdown.totalExemptions} negative />
          )}
          <SummaryRow label="Taxable Income" value={breakdown.taxableIncome} highlight />
        </div>

        <div className="border-t pt-3">
          <div className="grid grid-cols-2 gap-3">
            <SummaryRow label="Tax on Slabs" value={breakdown.slabTax} />
            {breakdown.rebate87A > 0 && (
              <SummaryRow label="Rebate u/s 87A" value={breakdown.rebate87A} negative />
            )}
            {breakdown.surcharge > 0 && (
              <SummaryRow label="Surcharge" value={breakdown.surcharge} />
            )}
            <SummaryRow label="Health & Edu. Cess (4%)" value={breakdown.cess} />
          </div>
        </div>

        <div className="border-t pt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Total Annual Tax</span>
            <span className="text-lg font-bold text-orange-700">
              {formatCurrency(breakdown.totalTax)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <TrendingDown className="h-3 w-3" />
              Monthly TDS
            </span>
            <span className="font-semibold text-orange-600">
              {formatCurrency(monthlyTds)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SummaryRow({
  label,
  value,
  negative,
  highlight,
}: {
  label: string
  value: number
  negative?: boolean
  highlight?: boolean
}) {
  return (
    <div className="col-span-2 flex items-center justify-between">
      <span className={`text-sm ${highlight ? 'font-medium' : 'text-muted-foreground'}`}>
        {label}
      </span>
      <span className={`text-sm ${highlight ? 'font-semibold' : ''} ${negative ? 'text-green-600' : ''}`}>
        {negative ? '- ' : ''}
        {formatCurrency(value)}
      </span>
    </div>
  )
}

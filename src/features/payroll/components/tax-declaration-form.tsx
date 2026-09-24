import { useState, useMemo } from 'react'
import { Loader2, Info, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useCurrentEmployee } from '../hooks/use-payroll'
import { useMyTaxDeclaration, useCreateTaxDeclaration, useUpdateTaxDeclaration } from '../hooks/use-tax'
import { useEmployeeCompensation } from '../hooks/use-payroll'
import {
  calculateAnnualTax,
  calculateMonthlyTds,
  compareRegimes,
  getCurrentFinancialYear,
  getFinancialYearOptions,
  EXEMPTION_LIMITS,
  type Exemptions,
} from '../utils/tax-calculator'
import { formatCurrency } from '../utils/payroll-utils'
import { TaxSummaryCard } from './tax-summary-card'
import type { TaxRegime } from '@/types/database.types'

export function TaxDeclarationForm() {

  const { organization } = useAuth()
  const { data: employee, isLoading: empLoading } = useCurrentEmployee()
  const employeeId = employee?.id || ''

  const fyOptions = getFinancialYearOptions()
  const [financialYear, setFinancialYear] = useState(getCurrentFinancialYear())

  const { data: existing, isLoading: declLoading } = useMyTaxDeclaration(employeeId, financialYear)
  const { data: compensation } = useEmployeeCompensation(employeeId)
  const createMutation = useCreateTaxDeclaration()
  const updateMutation = useUpdateTaxDeclaration()

  // Form state
  const [regime, setRegime] = useState<TaxRegime>('new')
  const [section80c, setSection80c] = useState(0)
  const [section80d, setSection80d] = useState(0)
  const [homeLoanInterest, setHomeLoanInterest] = useState(0)
  const [hraClaimed, setHraClaimed] = useState(0)
  const [npsContribution, setNpsContribution] = useState(0)
  const [otherDeductions, setOtherDeductions] = useState(0)
  const [otherDeductionsDetail, setOtherDeductionsDetail] = useState('')

  // Reset the fields when a different declaration is loaded. Adjusting during
  // render rather than in an effect keeps it to a single pass; an effect made the
  // form render once with the old values and again with the new ones.
  const [loadedId, setLoadedId] = useState<string | null | undefined>(undefined)
  const currentId = existing?.id ?? null
  if (currentId !== loadedId) {
    setLoadedId(currentId)
    if (existing) {
      setRegime(existing.tax_regime as TaxRegime)
      setSection80c(existing.section_80c || 0)
      setSection80d(existing.section_80d || 0)
      setHomeLoanInterest(existing.home_loan_interest || 0)
      setHraClaimed(existing.hra_claimed || 0)
      setNpsContribution(existing.nps_contribution || 0)
      setOtherDeductions(existing.other_deductions || 0)
      setOtherDeductionsDetail(existing.other_deductions_detail || '')
    } else {
      setRegime('new')
      setSection80c(0)
      setSection80d(0)
      setHomeLoanInterest(0)
      setHraClaimed(0)
      setNpsContribution(0)
      setOtherDeductions(0)
      setOtherDeductionsDetail('')
    }
  }

  const annualIncome = compensation?.annual_ctc || (compensation?.monthly_gross || 0) * 12

  const exemptions: Exemptions = useMemo(
    () => ({
      section_80c: section80c,
      section_80d: section80d,
      home_loan_interest: homeLoanInterest,
      hra_claimed: hraClaimed,
      nps_contribution: npsContribution,
      other_deductions: otherDeductions,
    }),
    [section80c, section80d, homeLoanInterest, hraClaimed, npsContribution, otherDeductions]
  )

  const breakdown = useMemo(
    () => (annualIncome > 0 ? calculateAnnualTax(annualIncome, regime, exemptions) : null),
    [annualIncome, regime, exemptions]
  )

  const monthlyTds = useMemo(
    () => (annualIncome > 0 ? calculateMonthlyTds(annualIncome, regime, exemptions) : 0),
    [annualIncome, regime, exemptions]
  )

  const comparison = useMemo(
    () => (annualIncome > 0 ? compareRegimes(annualIncome, exemptions) : null),
    [annualIncome, exemptions]
  )

  const isEditable = !existing || existing.status === 'draft' || existing.status === 'rejected'
  const isSaving = createMutation.isPending || updateMutation.isPending

  async function handleSave(submitFlag: boolean) {
    if (!employeeId || !organization) return
    const payload = {
      employee_id: employeeId,
      organization_id: organization.id,
      financial_year: financialYear,
      tax_regime: regime,
      section_80c: section80c,
      section_80d: section80d,
      home_loan_interest: homeLoanInterest,
      hra_claimed: hraClaimed,
      nps_contribution: npsContribution,
      other_deductions: otherDeductions,
      other_deductions_detail: otherDeductionsDetail || null,
      status: submitFlag ? ('submitted' as const) : ('draft' as const),
    }

    try {
      if (existing) {
        await updateMutation.mutateAsync({ id: existing.id, ...payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      toast.success(submitFlag ? 'Declaration submitted for verification' : 'Draft saved')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save declaration')
    }
  }

  if (empLoading || declLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">My Tax Declaration</h3>
          <p className="text-sm text-muted-foreground">
            Declare your investments and exemptions for income tax computation.
          </p>
        </div>
        <Select value={financialYear} onValueChange={setFinancialYear}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fyOptions.map((fy) => (
              <SelectItem key={fy} value={fy}>
                FY {fy}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status badge */}
      {existing && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <StatusBadge status={existing.status} />
          {existing.remarks && (
            <span className="text-sm text-muted-foreground">
              &mdash; {existing.remarks}
            </span>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form */}
        <div className="space-y-6 lg:col-span-2">
          {/* Regime Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tax Regime</CardTitle>
              <CardDescription>
                Choose between Old and New regime for FY {financialYear}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <RegimeButton
                  selected={regime === 'new'}
                  onClick={() => isEditable && setRegime('new')}
                  label="New Regime"
                  description="Standard deduction 75K, no exemptions, lower slab rates"
                  disabled={!isEditable}
                />
                <RegimeButton
                  selected={regime === 'old'}
                  onClick={() => isEditable && setRegime('old')}
                  label="Old Regime"
                  description="Standard deduction 50K, claim 80C/80D/HRA/NPS exemptions"
                  disabled={!isEditable}
                />
              </div>

              {comparison && (
                <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50/50 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Info className="h-4 w-4 text-orange-500" />
                    <span>
                      <strong>{comparison.recommended === 'new' ? 'New' : 'Old'} Regime</strong> saves
                      you {formatCurrency(comparison.savings)} in taxes for your income.
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Old: {formatCurrency(comparison.old.totalTax)}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>New: {formatCurrency(comparison.new.totalTax)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Exemption Fields (only for Old Regime) */}
          {regime === 'old' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Investment Declarations</CardTitle>
                <CardDescription>
                  Declare your investments and deductions under the Old Regime.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ExemptionField
                  label="Section 80C"
                  sublabel="PPF, ELSS, LIC, NSC, Tuition fees, etc."
                  value={section80c}
                  onChange={setSection80c}
                  max={EXEMPTION_LIMITS.section_80c}
                  disabled={!isEditable}
                />
                <ExemptionField
                  label="Section 80D"
                  sublabel="Medical/health insurance premium"
                  value={section80d}
                  onChange={setSection80d}
                  max={EXEMPTION_LIMITS.section_80d}
                  disabled={!isEditable}
                />
                <ExemptionField
                  label="Section 24 - Home Loan Interest"
                  sublabel="Interest on housing loan"
                  value={homeLoanInterest}
                  onChange={setHomeLoanInterest}
                  max={EXEMPTION_LIMITS.home_loan_interest}
                  disabled={!isEditable}
                />
                <ExemptionField
                  label="HRA Exemption"
                  sublabel="House Rent Allowance claimed"
                  value={hraClaimed}
                  onChange={setHraClaimed}
                  disabled={!isEditable}
                />
                <ExemptionField
                  label="Section 80CCD(1B) - NPS"
                  sublabel="Additional NPS contribution"
                  value={npsContribution}
                  onChange={setNpsContribution}
                  max={EXEMPTION_LIMITS.nps_contribution}
                  disabled={!isEditable}
                />
                <div className="space-y-2">
                  <ExemptionField
                    label="Other Deductions"
                    sublabel="Any other eligible deductions"
                    value={otherDeductions}
                    onChange={setOtherDeductions}
                    disabled={!isEditable}
                  />
                  {otherDeductions > 0 && (
                    <div className="ml-1">
                      <Label className="text-xs text-muted-foreground">Details</Label>
                      <Textarea
                        value={otherDeductionsDetail}
                        onChange={(e) => setOtherDeductionsDetail(e.target.value)}
                        placeholder="Describe other deductions..."
                        rows={2}
                        disabled={!isEditable}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {isEditable && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={isSaving}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Draft
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Declaration
              </Button>
            </div>
          )}
        </div>

        {/* Tax Preview */}
        <div className="space-y-4">
          <TaxSummaryCard
            regime={regime}
            breakdown={breakdown}
            monthlyTds={monthlyTds}
          />

          {annualIncome > 0 && (
            <Card className="border-purple-200 bg-purple-50/50">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-purple-700">Your Annual CTC</p>
                <p className="text-2xl font-bold text-purple-800">
                  {formatCurrency(annualIncome)}
                </p>
                <p className="text-xs text-purple-600">
                  Monthly gross: {formatCurrency(compensation?.monthly_gross || annualIncome / 12)}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RegimeButton({
  selected,
  onClick,
  label,
  description,
  disabled,
}: {
  selected: boolean
  onClick: () => void
  label: string
  description: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 rounded-lg border-2 p-4 text-left transition-colors ${
        selected
          ? 'border-orange-500 bg-orange-50'
          : 'border-muted hover:border-orange-200'
      } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`h-4 w-4 rounded-full border-2 ${
            selected ? 'border-orange-500 bg-orange-500' : 'border-muted-foreground/30'
          }`}
        >
          {selected && (
            <div className="flex h-full items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-white" />
            </div>
          )}
        </div>
        <span className="font-medium">{label}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </button>
  )
}

function ExemptionField({
  label,
  sublabel,
  value,
  onChange,
  max,
  disabled,
}: {
  label: string
  sublabel: string
  value: number
  onChange: (v: number) => void
  max?: number
  disabled?: boolean
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground">{sublabel}</p>
        </div>
        {max && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs">
                  Max: {formatCurrency(max)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Maximum eligible deduction: {formatCurrency(max)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        placeholder="0"
        min={0}
        max={max}
        disabled={disabled}
      />
      {max && value > max && (
        <p className="text-xs text-red-500">
          Exceeds limit of {formatCurrency(max)}. Only {formatCurrency(max)} will be considered.
        </p>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
    submitted: 'bg-blue-100 text-blue-700 border-blue-200',
    verified: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
  }
  return (
    <Badge variant="outline" className={variants[status] || ''}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

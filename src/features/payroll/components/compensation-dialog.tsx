import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useAssignCompensation, useSalaryStructures } from '../hooks/use-payroll'
import { supabase } from '@/lib/supabase'
import { formatCurrency, calculateComponentAmount, calculateStatutoryDeductions } from '../utils/payroll-utils'
import type {
  EmployeeCompensationWithRelations,
  SalaryStructureWithComponents,
} from '@/types/database.types'
import { toast } from 'sonner'

const compensationSchema = z.object({
  employee_id: z.string().min(1, 'Employee is required'),
  salary_structure_id: z.string().min(1, 'Salary structure is required'),
  annual_ctc: z.coerce.number().positive('Annual CTC must be greater than 0'),
  effective_from: z.string().min(1, 'Effective date is required'),
  revision_reason: z.string().optional(),
})

type CompensationFormData = z.output<typeof compensationSchema>

interface ActiveEmployee {
  id: string
  first_name: string
  last_name: string
  employee_code: string | null
}

interface ComponentBreakup {
  salary_component_id: string
  component_code: string
  component_name: string
  component_type: string
  calculation_type: string
  calculation_value: number
  monthly_amount: number
  annual_amount: number
  /** Shown instead of the structure's rule when the figure came from elsewhere. */
  calculation_note: string | null
}

interface CompensationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  compensation?: EmployeeCompensationWithRelations
}

export function CompensationDialog({
  open,
  onOpenChange,
  compensation,
}: CompensationDialogProps) {
  const isRevising = !!compensation
  const { organization } = useAuth()
  const { data: structures } = useSalaryStructures()
  const assignCompensation = useAssignCompensation()
  const [employees, setEmployees] = useState<ActiveEmployee[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof compensationSchema>, unknown, CompensationFormData>({
    resolver: zodResolver(compensationSchema),
    defaultValues: {
      employee_id: '',
      salary_structure_id: '',
      annual_ctc: 0,
      effective_from: '',
      revision_reason: '',
    },
  })

  const watchedStructureId = watch('salary_structure_id')
  const watchedCtc = watch('annual_ctc')

  // Fetch active employees
  useEffect(() => {
    if (!open || !organization?.id) return
    let cancelled = false
    setLoadingEmployees(true)
    supabase
      .from('employees')
      .select('id, first_name, last_name, employee_code')
      .eq('organization_id', organization.id)
      .eq('status', 'active')
      .order('first_name')
      .then(({ data, error }) => {
        if (cancelled) return
        setLoadingEmployees(false)
        if (error) {
          // Silent before, which left an empty picker and no clue why.
          console.error('Failed to fetch employees:', error)
          toast.error('Could not load the employee list. Please refresh and try again.')
          return
        }
        setEmployees(data || [])
      })
    return () => {
      cancelled = true
    }
  }, [open, organization?.id])

  // Reset form when dialog opens/closes or compensation changes
  useEffect(() => {
    if (open) {
      if (compensation) {
        reset({
          employee_id: compensation.employee_id,
          salary_structure_id: compensation.salary_structure_id,
          annual_ctc: compensation.annual_ctc,
          effective_from: new Date().toISOString().split('T')[0],
          revision_reason: '',
        })
      } else {
        reset({
          employee_id: '',
          salary_structure_id: '',
          annual_ctc: 0,
          effective_from: new Date().toISOString().split('T')[0],
          revision_reason: '',
        })
      }
    }
  }, [open, compensation, reset])

  // Find selected structure with components
  const selectedStructure = useMemo(() => {
    if (!watchedStructureId || !structures) return null
    return (structures as SalaryStructureWithComponents[]).find(
      (s) => s.id === watchedStructureId
    ) || null
  }, [watchedStructureId, structures])

  // Compute component breakup
  // watch() reports the form input, which is still a string until zod coerces it.
  const monthlyGross = Number(watchedCtc) > 0 ? Number(watchedCtc) / 12 : 0

  const breakup: ComponentBreakup[] = useMemo(() => {
    if (!selectedStructure?.salary_structure_components || monthlyGross <= 0) {
      return []
    }

    const components = selectedStructure.salary_structure_components

    // First pass: find basic amount (percentage_of_gross)
    const basicComp = components.find(
      (c) =>
        c.salary_component?.component_code === 'BASIC' &&
        c.calculation_type === 'percentage_of_gross'
    )
    const basicMonthly = basicComp
      ? Math.round((monthlyGross * basicComp.default_value) / 100)
      : Math.round(monthlyGross * 0.4)

    const active = components
      .filter((c) => c.is_active && c.salary_component)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))

    /**
     * Statutory amounts come from the same calculator payroll uses, not from
     * the percentage written on the structure.
     *
     * The structure says PF is 12% of basic, which on a basic of 40,000 reads
     * 4,800. Payroll pays 1,800, because provident fund is 12% of a basic
     * capped at 15,000. The preview was showing one figure and the payslip
     * another, and the wrong one was being saved onto the employee.
     */
    const statutory = calculateStatutoryDeductions(basicMonthly, monthlyGross)
    const statutoryAmount = (type: string | null | undefined): number | null => {
      switch (type) {
        case 'pf_employee': return statutory.pfEmployee
        case 'pf_employer': return statutory.pfEmployer
        case 'esi_employee': return statutory.esiEmployee
        case 'esi_employer': return statutory.esiEmployer
        case 'pt': return statutory.pt
        case 'lwf': return statutory.lwf
        default: return null  // TDS and anything else stay as configured
      }
    }

    const rows = active.map((c) => {
      const comp = c.salary_component!
      const fromStructure = calculateComponentAmount(
        c.calculation_type,
        c.default_value,
        basicMonthly,
        monthlyGross
      )
      const statutoryOverride = comp.is_statutory ? statutoryAmount(comp.statutory_type) : null
      const monthly = statutoryOverride ?? fromStructure
      return {
        salary_component_id: c.salary_component_id,
        component_code: comp.component_code,
        component_name: comp.component_name,
        component_type: comp.component_type,
        calculation_type: c.calculation_type,
        calculation_value: c.default_value,
        monthly_amount: monthly,
        annual_amount: monthly * 12,
        // Set where the figure does not come from the structure's own rule,
        // so the Calculation column never states something we did not apply.
        calculation_note:
          statutoryOverride !== null && statutoryOverride !== fromStructure
            ? 'Statutory limit applied'
            : (null as string | null),
      }
    })

    /**
     * Special allowance is the balancing figure.
     *
     * The only structure that exists pays basic 40% of gross, HRA 50% of
     * basic and DA 10% of basic — 64% of gross between them — with special
     * allowance left at a flat zero. Anybody assigned through it was given
     * 64% of the salary they had agreed: a 12,00,000 CTC produced components
     * adding up to 7,68,000, and payroll then paid exactly that.
     *
     * Every employee seeded before this screen existed carries a special
     * allowance of 36% of gross, which is the remainder. That is the
     * convention in Indian payroll and plainly the intent here, so the
     * shortfall is put where the existing data already puts it.
     */
    const SA_CODE = 'SA'
    const earningsTotal = rows
      .filter((r) => r.component_type === 'earning')
      .reduce((sum, r) => sum + r.monthly_amount, 0)
    const shortfall = monthlyGross - earningsTotal
    const sa = rows.find((r) => r.component_code === SA_CODE)

    if (sa && shortfall > 0) {
      sa.monthly_amount += shortfall
      sa.annual_amount = sa.monthly_amount * 12
      sa.calculation_note = 'Balance of gross'
    }

    return rows
  }, [selectedStructure, monthlyGross])

  /**
   * What the employee will actually be paid, worked out the way the payslip
   * works it out. The old "Total" row added the earnings and the deductions
   * together and called the result a total, which for somebody on 1,00,000 a
   * month read 69,000.
   */
  const totals = useMemo(() => {
    const sum = (type: string) =>
      breakup.filter((c) => c.component_type === type)
        .reduce((acc, c) => acc + c.monthly_amount, 0)
    const gross = sum('earning')
    const deductions = sum('deduction')
    return {
      gross,
      deductions,
      net: gross - deductions,
      employer: sum('employer_contribution'),
      balances: Math.abs(gross - monthlyGross) <= 1,
    }
  }, [breakup, monthlyGross])

  const onSubmit = async (data: CompensationFormData) => {
    if (!organization?.id) return

    try {
      await assignCompensation.mutateAsync({
        compensation: {
          organization_id: organization.id,
          employee_id: data.employee_id,
          salary_structure_id: data.salary_structure_id,
          annual_ctc: data.annual_ctc,
          monthly_gross: Math.round(data.annual_ctc / 12),
          effective_from: data.effective_from,
          is_current: true,
          revision_reason: data.revision_reason || null,
          // created_by is worked out in the database. It is a foreign key to
          // employees, and this screen only has the auth profile id — passing
          // that was what made every assignment fail.
        },
        components: breakup.map((c) => ({
          salary_component_id: c.salary_component_id,
          monthly_amount: c.monthly_amount,
          annual_amount: c.annual_amount,
          calculation_type: c.calculation_type,
          calculation_value: c.calculation_value,
        })),
      })
      toast.success(
        isRevising ? 'Compensation revised successfully' : 'Compensation assigned successfully'
      )
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save compensation')
    }
  }

  const formatCalcLabel = (type: string, value: number) => {
    switch (type) {
      case 'percentage_of_gross':
        return `${value}% of Gross`
      case 'percentage_of_basic':
        return `${value}% of Basic`
      case 'flat':
        return `Flat ${formatCurrency(value)}`
      default:
        return type
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="page">
        <DialogHeader>
          <DialogTitle>
            {isRevising ? 'Revise Compensation' : 'Assign Compensation'}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 pb-4">
              {/* Employee & Structure Selection */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="employee_id">Employee *</Label>
                  <Select
                    value={watch('employee_id')}
                    onValueChange={(v) => setValue('employee_id', v, { shouldValidate: true })}
                    disabled={isRevising}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={loadingEmployees ? 'Loading...' : 'Select employee'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}
                          {emp.employee_code ? ` (${emp.employee_code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.employee_id && (
                    <p className="text-sm text-destructive">{errors.employee_id.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary_structure_id">Salary Structure *</Label>
                  <Select
                    value={watch('salary_structure_id')}
                    onValueChange={(v) =>
                      setValue('salary_structure_id', v, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select structure" />
                    </SelectTrigger>
                    <SelectContent>
                      {((structures as SalaryStructureWithComponents[]) || [])
                        .filter((s) => s.is_active)
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.structure_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {errors.salary_structure_id && (
                    <p className="text-sm text-destructive">
                      {errors.salary_structure_id.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="annual_ctc">Annual CTC *</Label>
                  <Input
                    id="annual_ctc"
                    type="number"
                    step="1"
                    min="0"
                    {...register('annual_ctc')}
                    placeholder="e.g., 600000"
                  />
                  {errors.annual_ctc && (
                    <p className="text-sm text-destructive">{errors.annual_ctc.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Monthly Gross</Label>
                  <Input value={formatCurrency(monthlyGross)} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="effective_from">Effective From *</Label>
                  <Input
                    id="effective_from"
                    type="date"
                    {...register('effective_from')}
                  />
                  {errors.effective_from && (
                    <p className="text-sm text-destructive">{errors.effective_from.message}</p>
                  )}
                </div>
              </div>

              {isRevising && (
                <div className="space-y-2">
                  <Label htmlFor="revision_reason">Revision Reason</Label>
                  <Input
                    id="revision_reason"
                    {...register('revision_reason')}
                    placeholder="e.g., Annual appraisal, Promotion"
                  />
                </div>
              )}

              {/* Component Breakup Preview */}
              {breakup.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="text-base">Component Breakup Preview</Label>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Component</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Calculation</TableHead>
                            <TableHead className="text-right">Monthly</TableHead>
                            <TableHead className="text-right">Annual</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {breakup.map((comp) => (
                            <TableRow key={comp.salary_component_id}>
                              <TableCell className="font-medium">
                                {comp.component_name}
                              </TableCell>
                              <TableCell>
                                <span className="capitalize text-xs text-muted-foreground">
                                  {comp.component_type.replace('_', ' ')}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs">
                                {comp.calculation_note ?? formatCalcLabel(comp.calculation_type, comp.calculation_value)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(comp.monthly_amount)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(comp.annual_amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/50">
                            <TableCell colSpan={3}>Gross earnings</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(totals.gross)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(totals.gross * 12)}
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-muted/50">
                            <TableCell colSpan={3}>Less deductions</TableCell>
                            <TableCell className="text-right">
                              −{formatCurrency(totals.deductions)}
                            </TableCell>
                            <TableCell className="text-right">
                              −{formatCurrency(totals.deductions * 12)}
                            </TableCell>
                          </TableRow>
                          <TableRow className="font-semibold bg-muted/50">
                            <TableCell colSpan={3}>Take home</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(totals.net)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(totals.net * 12)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {!totals.balances && (
                      <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        This salary structure adds up to {formatCurrency(totals.gross)} a
                        month, but the agreed salary is {formatCurrency(monthlyGross)}. Saving
                        it would pay this person{' '}
                        {formatCurrency(Math.abs(monthlyGross - totals.gross))} a month less
                        than agreed. Correct the structure on the Structures tab first.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={assignCompensation.isPending || !totals.balances}>
              {assignCompensation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isRevising ? 'Revise Compensation' : 'Assign Compensation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

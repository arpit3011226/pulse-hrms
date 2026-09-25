import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  SALARY_COMPONENT_TYPES,
  SALARY_COMPONENT_CATEGORIES,
  CALCULATION_TYPES,
  STATUTORY_TYPES,
} from '@/lib/constants'
import { useCreateSalaryComponent, useUpdateSalaryComponent } from '../hooks/use-payroll'
import type { SalaryComponent } from '@/types/database.types'
import { toast } from 'sonner'

const componentSchema = z.object({
  component_name: z.string().min(1, 'Component name is required'),
  component_code: z.string().min(1, 'Component code is required'),
  component_type: z.enum(['earning', 'deduction', 'employer_contribution']),
  category: z.enum(['fixed', 'variable', 'statutory', 'reimbursement']),
  is_taxable: z.boolean(),
  is_statutory: z.boolean(),
  statutory_type: z.enum(['pf_employee', 'pf_employer', 'esi_employee', 'esi_employer', 'pt', 'tds']).optional().nullable(),
  calculation_type: z.enum(['flat', 'percentage_of_basic', 'percentage_of_gross']),
  default_value: z.number().min(0, 'Must be 0 or greater'),
  description: z.string().optional(),
  display_order: z.number().optional(),
})

type ComponentFormValues = z.infer<typeof componentSchema>

interface ComponentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  component?: SalaryComponent
}

export function ComponentFormDialog({ open, onOpenChange, component }: ComponentFormDialogProps) {
  const isEditing = !!component
  const createMutation = useCreateSalaryComponent()
  const updateMutation = useUpdateSalaryComponent()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ComponentFormValues>({
    resolver: zodResolver(componentSchema),
    defaultValues: component
      ? {
          component_name: component.component_name,
          component_code: component.component_code,
          component_type: component.component_type,
          category: component.category,
          is_taxable: component.is_taxable,
          is_statutory: component.is_statutory,
          statutory_type: component.statutory_type ?? undefined,
          calculation_type: component.calculation_type,
          default_value: component.default_value,
          description: component.description ?? '',
          display_order: component.display_order ?? 0,
        }
      : {
          is_taxable: true,
          is_statutory: false,
          default_value: 0,
          display_order: 0,
        },
  })

  const isStatutory = watch('is_statutory')

  // Reset form when dialog opens with new component data
  useEffect(() => {
    if (open) {
      if (component) {
        reset({
          component_name: component.component_name,
          component_code: component.component_code,
          component_type: component.component_type,
          category: component.category,
          is_taxable: component.is_taxable,
          is_statutory: component.is_statutory,
          statutory_type: component.statutory_type ?? undefined,
          calculation_type: component.calculation_type,
          default_value: component.default_value,
          description: component.description ?? '',
          display_order: component.display_order ?? 0,
        })
      } else {
        reset({
          component_name: '',
          component_code: '',
          component_type: 'earning',
          category: 'fixed',
          is_taxable: true,
          is_statutory: false,
          statutory_type: undefined,
          calculation_type: undefined,
          default_value: 0,
          description: '',
          display_order: 0,
        })
      }
    }
  }, [open, component, reset])

  const onSubmit = async (data: ComponentFormValues) => {
    try {
      const payload = {
        ...data,
        component_code: data.component_code.toUpperCase(),
        statutory_type: data.is_statutory ? (data.statutory_type ?? null) : null,
        description: data.description || null,
        display_order: data.display_order ?? 0,
      }

      if (isEditing) {
        await updateMutation.mutateAsync({ id: component.id, ...payload })
        toast.success('Salary component updated')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Salary component created')
      }
      onOpenChange(false)
    } catch (err: unknown) {
      console.error('Salary component error:', err)
      const msg = err instanceof Error ? err.message : 'Failed to save salary component'
      toast.error(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="page">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Salary Component' : 'Add Salary Component'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Component Name & Code */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="component_name">Component Name *</Label>
              <Input id="component_name" {...register('component_name')} />
              {errors.component_name && (
                <p className="text-sm text-destructive">{errors.component_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="component_code">Code *</Label>
              <Input
                id="component_code"
                {...register('component_code')}
                className="uppercase"
                placeholder="e.g. BASIC"
              />
              {errors.component_code && (
                <p className="text-sm text-destructive">{errors.component_code.message}</p>
              )}
            </div>
          </div>

          {/* Type & Category */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select
                onValueChange={(v) => setValue('component_type', v as ComponentFormValues['component_type'])}
                defaultValue={component?.component_type}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {SALARY_COMPONENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.component_type && (
                <p className="text-sm text-destructive">{errors.component_type.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                onValueChange={(v) => setValue('category', v as ComponentFormValues['category'])}
                defaultValue={component?.category}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {SALARY_COMPONENT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category.message}</p>
              )}
            </div>
          </div>

          {/* Switches: Taxable & Statutory */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={watch('is_taxable')}
                onCheckedChange={(v) => setValue('is_taxable', v)}
              />
              <Label>Taxable</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={watch('is_statutory')}
                onCheckedChange={(v) => setValue('is_statutory', v)}
              />
              <Label>Statutory</Label>
            </div>
          </div>

          {/* Statutory Type (conditional) */}
          {isStatutory && (
            <div className="space-y-2">
              <Label>Statutory Type</Label>
              <Select
                onValueChange={(v) => setValue('statutory_type', v as ComponentFormValues['statutory_type'])}
                defaultValue={component?.statutory_type ?? undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select statutory type" />
                </SelectTrigger>
                <SelectContent>
                  {STATUTORY_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Calculation Type & Default Value */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Calculation Type *</Label>
              <Select
                onValueChange={(v) => setValue('calculation_type', v as ComponentFormValues['calculation_type'])}
                defaultValue={component?.calculation_type}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select calculation" />
                </SelectTrigger>
                <SelectContent>
                  {CALCULATION_TYPES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.calculation_type && (
                <p className="text-sm text-destructive">{errors.calculation_type.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_value">Default Value *</Label>
              <Input
                id="default_value"
                type="number"
                step="any"
                {...register('default_value', { valueAsNumber: true })}
              />
              {errors.default_value && (
                <p className="text-sm text-destructive">{errors.default_value.message}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register('description')} placeholder="Optional description" />
          </div>

          {/* Display Order */}
          <div className="space-y-2">
            <Label htmlFor="display_order">Display Order</Label>
            <Input
              id="display_order"
              type="number"
              {...register('display_order', { valueAsNumber: true })}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

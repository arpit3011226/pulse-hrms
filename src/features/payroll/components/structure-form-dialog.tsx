import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { CALCULATION_TYPES } from '@/lib/constants'
import {
  useSalaryComponents,
  useCreateSalaryStructure,
  useUpdateSalaryStructure,
} from '../hooks/use-payroll'
import { toast } from 'sonner'

const structureSchema = z.object({
  structure_name: z.string().min(1, 'Structure name is required'),
  structure_code: z.string().min(1, 'Structure code is required'),
  description: z.string().optional(),
  is_default: z.boolean().optional(),
})

type StructureFormData = z.infer<typeof structureSchema>

interface StructureComponent {
  id: string
  salary_component_id: string
  calculation_type: string
  default_value: number
  display_order: number
  salary_component: {
    id: string
    component_name: string
    component_code: string
    component_type: string
  }
}

interface StructureData {
  id: string
  structure_name: string
  structure_code: string
  description: string | null
  is_default: boolean
  is_active: boolean
  salary_structure_components: StructureComponent[]
}

interface ComponentRow {
  salary_component_id: string
  calculation_type: string
  default_value: number
  display_order: number
  included: boolean
}

interface StructureFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  structure?: StructureData
}

export function StructureFormDialog({ open, onOpenChange, structure }: StructureFormDialogProps) {
  const isEditing = !!structure
  const { data: allComponents } = useSalaryComponents()
  const createStructure = useCreateSalaryStructure()
  const updateStructure = useUpdateSalaryStructure()
  const [componentRows, setComponentRows] = useState<ComponentRow[]>([])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StructureFormData>({
    resolver: zodResolver(structureSchema),
    defaultValues: {
      structure_name: '',
      structure_code: '',
      description: '',
      is_default: false,
    },
  })

  const isDefault = watch('is_default')

  // Initialize component rows when dialog opens or allComponents load
  useEffect(() => {
    if (!allComponents) return

    const existingMap = new Map<string, StructureComponent>()
    if (structure?.salary_structure_components) {
      structure.salary_structure_components.forEach((sc) => {
        existingMap.set(sc.salary_component_id, sc)
      })
    }

    const rows: ComponentRow[] = allComponents
      .filter((c) => c.is_active)
      .map((comp, index: number) => {
        const existing = existingMap.get(comp.id)
        if (existing) {
          return {
            salary_component_id: comp.id,
            calculation_type: existing.calculation_type,
            default_value: existing.default_value,
            display_order: existing.display_order,
            included: true,
          }
        }
        return {
          salary_component_id: comp.id,
          calculation_type: 'flat',
          default_value: 0,
          display_order: index + 1,
          included: false,
        }
      })

    // Sort so included items come first, then by display_order
    rows.sort((a, b) => {
      if (a.included !== b.included) return a.included ? -1 : 1
      return a.display_order - b.display_order
    })

    setComponentRows(rows)

    if (structure) {
      reset({
        structure_name: structure.structure_name,
        structure_code: structure.structure_code,
        description: structure.description || '',
        is_default: structure.is_default,
      })
    } else {
      reset({
        structure_name: '',
        structure_code: '',
        description: '',
        is_default: false,
      })
    }
  }, [structure, allComponents, reset])

  const toggleComponent = (componentId: string, checked: boolean) => {
    setComponentRows((prev) =>
      prev.map((row) =>
        row.salary_component_id === componentId ? { ...row, included: checked } : row
      )
    )
  }

  const updateComponentRow = (componentId: string, field: keyof ComponentRow, value: unknown) => {
    setComponentRows((prev) =>
      prev.map((row) =>
        row.salary_component_id === componentId ? { ...row, [field]: value } : row
      )
    )
  }

  const getComponentName = (componentId: string) => {
    const comp = allComponents?.find((c) => c.id === componentId)
    return comp?.component_name || 'Unknown'
  }

  const getComponentCode = (componentId: string) => {
    const comp = allComponents?.find((c) => c.id === componentId)
    return comp?.component_code || ''
  }

  const getComponentType = (componentId: string) => {
    const comp = allComponents?.find((c) => c.id === componentId)
    return comp?.component_type || ''
  }

  const onSubmit = async (data: StructureFormData) => {
    const includedComponents = componentRows
      .filter((r) => r.included)
      .map((r, index) => ({
        salary_component_id: r.salary_component_id,
        calculation_type: r.calculation_type as 'flat' | 'percentage_of_basic' | 'percentage_of_gross',
        default_value: r.default_value,
        display_order: index + 1,
        is_active: true as const,
      }))

    try {
      if (isEditing && structure) {
        await updateStructure.mutateAsync({
          id: structure.id,
          structure: data,
          components: includedComponents,
        })
        toast.success('Salary structure updated')
      } else {
        await createStructure.mutateAsync({
          structure: { ...data, is_active: true },
          components: includedComponents,
        })
        toast.success('Salary structure created')
      }
      onOpenChange(false)
    } catch (err: unknown) {
      console.error('Salary structure error:', err)
      const msg = err instanceof Error ? err.message : 'Failed to save salary structure'
      toast.error(msg)
    }
  }

  const isPending = createStructure.isPending || updateStructure.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="page">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Salary Structure' : 'Create Salary Structure'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 pb-4">
              {/* Structure Metadata */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="structure_name">Structure Name *</Label>
                  <Input id="structure_name" {...register('structure_name')} placeholder="e.g., Standard CTC" />
                  {errors.structure_name && <p className="text-sm text-destructive">{errors.structure_name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="structure_code">Structure Code *</Label>
                  <Input id="structure_code" {...register('structure_code')} placeholder="e.g., STD-CTC" />
                  {errors.structure_code && <p className="text-sm text-destructive">{errors.structure_code.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" {...register('description')} placeholder="Optional description" />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="is_default"
                  checked={isDefault}
                  onCheckedChange={(checked) => setValue('is_default', checked)}
                />
                <Label htmlFor="is_default">Set as default structure</Label>
              </div>

              <Separator />

              {/* Component Assignment */}
              <div className="space-y-3">
                <Label className="text-base">Salary Components</Label>
                <p className="text-sm text-muted-foreground">
                  Select the components to include in this structure and configure their calculation type and default value.
                </p>

                {componentRows.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No salary components found. Please create salary components first.
                  </p>
                )}

                <div className="space-y-2">
                  {componentRows.map((row) => (
                    <div
                      key={row.salary_component_id}
                      className={`rounded-lg border p-3 space-y-2 ${row.included ? 'bg-muted/30' : 'opacity-60'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={row.included}
                          onCheckedChange={(checked) =>
                            toggleComponent(row.salary_component_id, checked === true)
                          }
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{getComponentName(row.salary_component_id)}</p>
                          <p className="text-xs text-muted-foreground">
                            {getComponentCode(row.salary_component_id)} &middot; {getComponentType(row.salary_component_id)}
                          </p>
                        </div>
                      </div>

                      {row.included && (
                        <div className="grid gap-3 sm:grid-cols-2 pl-7">
                          <div className="space-y-1">
                            <Label className="text-xs">Calculation Type</Label>
                            <Select
                              value={row.calculation_type}
                              onValueChange={(v) =>
                                updateComponentRow(row.salary_component_id, 'calculation_type', v)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CALCULATION_TYPES.map((ct) => (
                                  <SelectItem key={ct.value} value={ct.value}>
                                    {ct.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Default Value</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={row.default_value}
                              onChange={(e) =>
                                updateComponentRow(
                                  row.salary_component_id,
                                  'default_value',
                                  Number(e.target.value)
                                )
                              }
                              placeholder="0"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Structure' : 'Create Structure'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

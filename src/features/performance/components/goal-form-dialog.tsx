import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { GOAL_CATEGORIES, GOAL_UNITS } from '@/lib/constants'
import {
  useCreateEmployeeGoal,
  useUpdateEmployeeGoal,
  useUpsertGoalKeyResults,
} from '../hooks/use-performance'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import type { EmployeeGoal, GoalKeyResult } from '@/types/database.types'
import { toast } from 'sonner'

const goalSchema = z.object({
  goal_title: z.string().min(1, 'Goal title is required'),
  goal_description: z.string().optional(),
  category: z.enum(['individual', 'team', 'organizational']),
  weightage: z.coerce.number().min(0).max(100),
  unit: z.enum(['percentage', 'number', 'currency', 'boolean']),
  target_value: z.coerce.number().min(0).optional(),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
})

type GoalFormData = z.output<typeof goalSchema>

interface KeyResultRow {
  id?: string
  kr_title: string
  target_value: number
  unit: 'percentage' | 'number' | 'currency' | 'boolean'
  weightage: number
}

const defaultKR: Omit<KeyResultRow, 'id'> = {
  kr_title: '',
  target_value: 100,
  unit: 'percentage',
  weightage: 0,
}

interface GoalFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal?: EmployeeGoal & { goal_key_results?: GoalKeyResult[] }
  employeeId: string
  cycleId: string
}

export function GoalFormDialog({ open, onOpenChange, goal, employeeId, cycleId }: GoalFormDialogProps) {
  const isEditing = !!goal
  const isAdminMode = !employeeId // admin creating goal for someone else
  const createGoal = useCreateEmployeeGoal()
  const updateGoal = useUpdateEmployeeGoal()
  const upsertKRs = useUpsertGoalKeyResults()
  const [keyResults, setKeyResults] = useState<KeyResultRow[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const { organization } = useAuth()

  // Fetch employees list for admin mode
  const { data: employees } = useQuery({
    queryKey: ['employees-list-for-goals', organization?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_code')
        .eq('organization_id', organization!.id)
        .eq('status', 'active')
        .order('first_name')
      return data ?? []
    },
    enabled: isAdminMode && !!organization?.id && open,
  })

  const resolvedEmployeeId = isAdminMode ? selectedEmployeeId : employeeId

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.input<typeof goalSchema>, unknown, GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      category: 'individual',
      unit: 'percentage',
      weightage: 10,
      target_value: 100,
    },
  })

  const watchCategory = watch('category')
  const watchUnit = watch('unit')

  useEffect(() => {
    if (goal) {
      reset({
        goal_title: goal.goal_title,
        goal_description: goal.goal_description || '',
        category: goal.category,
        weightage: goal.weightage,
        unit: goal.unit,
        target_value: goal.target_value ?? 100,
        start_date: goal.start_date || '',
        due_date: goal.due_date || '',
      })
      if (goal.goal_key_results && goal.goal_key_results.length > 0) {
        setKeyResults(
          goal.goal_key_results.map((kr) => ({
            id: kr.id,
            kr_title: kr.kr_title,
            target_value: kr.target_value,
            unit: kr.unit,
            weightage: kr.weightage,
          }))
        )
      } else {
        setKeyResults([])
      }
    } else {
      reset({
        goal_title: '',
        goal_description: '',
        category: 'individual',
        weightage: 10,
        unit: 'percentage',
        target_value: 100,
        start_date: '',
        due_date: '',
      })
      setKeyResults([])
      setSelectedEmployeeId('')
    }
  }, [goal, reset])

  const addKeyResult = () => {
    setKeyResults([...keyResults, { ...defaultKR }])
  }

  const removeKeyResult = (index: number) => {
    setKeyResults(keyResults.filter((_, i) => i !== index))
  }

  const updateKeyResult = (index: number, field: keyof KeyResultRow, value: unknown) => {
    setKeyResults(keyResults.map((kr, i) => (i === index ? { ...kr, [field]: value } : kr)))
  }

  const krWeightageTotal = keyResults.reduce((sum, kr) => sum + kr.weightage, 0)

  const onSubmit = async (data: GoalFormData) => {
    if (!resolvedEmployeeId) {
      toast.error('Please select an employee')
      return
    }
    if (keyResults.length > 0 && Math.abs(krWeightageTotal - 100) > 0.01) {
      toast.error('Key result weightages must sum to 100')
      return
    }

    try {
      if (isEditing && goal) {
        await updateGoal.mutateAsync({
          id: goal.id,
          goal_title: data.goal_title,
          goal_description: data.goal_description || null,
          category: data.category,
          weightage: data.weightage,
          unit: data.unit,
          target_value: data.target_value ?? null,
          start_date: data.start_date || null,
          due_date: data.due_date || null,
        })

        if (keyResults.length > 0) {
          await upsertKRs.mutateAsync({
            goalId: goal.id,
            keyResults: keyResults.map((kr) => ({
              ...(kr.id ? { id: kr.id } : {}),
              kr_title: kr.kr_title,
              target_value: kr.target_value,
              unit: kr.unit,
              weightage: kr.weightage,
            })),
          })
        }
        toast.success('Goal updated')
      } else {
        const newGoal = await createGoal.mutateAsync({
          employee_id: resolvedEmployeeId,
          performance_cycle_id: cycleId,
          goal_title: data.goal_title,
          goal_description: data.goal_description || null,
          category: data.category,
          weightage: data.weightage,
          unit: data.unit,
          target_value: data.target_value ?? null,
          start_date: data.start_date || null,
          due_date: data.due_date || null,
          status: 'not_started',
          current_value: 0,
        })

        if (keyResults.length > 0 && newGoal?.id) {
          await upsertKRs.mutateAsync({
            goalId: newGoal.id,
            keyResults: keyResults.map((kr) => ({
              kr_title: kr.kr_title,
              target_value: kr.target_value,
              unit: kr.unit,
              weightage: kr.weightage,
            })),
          })
        }
        toast.success('Goal created')
      }
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err ?? 'Unknown error')
      console.error('Failed to save goal:', err)
      toast.error(`Failed to save goal: ${msg}`)
    }
  }

  const isPending = createGoal.isPending || updateGoal.isPending || upsertKRs.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Goal' : 'Create Goal'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-6 pb-4">
              {/* Employee Selector (admin mode only) */}
              {isAdminMode && !isEditing && (
                <div className="space-y-2">
                  <Label>Employee *</Label>
                  <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {(employees ?? []).map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} ({emp.employee_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Goal Title */}
              <div className="space-y-2">
                <Label htmlFor="goal_title">Goal Title *</Label>
                <Input id="goal_title" {...register('goal_title')} placeholder="Enter goal title" />
                {errors.goal_title && <p className="text-sm text-destructive">{errors.goal_title.message}</p>}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="goal_description">Description</Label>
                <Textarea id="goal_description" {...register('goal_description')} placeholder="Describe the goal..." rows={3} />
              </div>

              {/* Category & Weightage */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={watchCategory} onValueChange={(v) => setValue('category', v as GoalFormData['category'])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {GOAL_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weightage">Weightage (%)</Label>
                  <Input id="weightage" type="number" min={0} max={100} {...register('weightage')} />
                  {errors.weightage && <p className="text-sm text-destructive">{errors.weightage.message}</p>}
                </div>
              </div>

              {/* Unit & Target */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={watchUnit} onValueChange={(v) => setValue('unit', v as GoalFormData['unit'])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {GOAL_UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_value">Target Value</Label>
                  <Input id="target_value" type="number" min={0} {...register('target_value')} />
                </div>
              </div>

              {/* Dates */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input id="start_date" type="date" {...register('start_date')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input id="due_date" type="date" {...register('due_date')} />
                </div>
              </div>

              <Separator />

              {/* Key Results */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Key Results</Label>
                    {keyResults.length > 0 && (
                      <p className={`text-xs mt-0.5 ${Math.abs(krWeightageTotal - 100) > 0.01 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        Total weightage: {krWeightageTotal}% {Math.abs(krWeightageTotal - 100) > 0.01 ? '(must be 100%)' : ''}
                      </p>
                    )}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addKeyResult}>
                    <Plus className="mr-1 h-3 w-3" /> Add Key Result
                  </Button>
                </div>

                {keyResults.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No key results added. Key results are optional but help track granular progress.
                  </p>
                )}

                {keyResults.map((kr, index) => (
                  <Card key={index}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <Input
                          value={kr.kr_title}
                          onChange={(e) => updateKeyResult(index, 'kr_title', e.target.value)}
                          placeholder="Key result title"
                          className="flex-1"
                        />
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive flex-shrink-0" onClick={() => removeKeyResult(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Target Value</Label>
                          <Input
                            type="number"
                            min={0}
                            value={kr.target_value}
                            onChange={(e) => updateKeyResult(index, 'target_value', Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Unit</Label>
                          <Select
                            value={kr.unit}
                            onValueChange={(v) => updateKeyResult(index, 'unit', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {GOAL_UNITS.map((u) => (
                                <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Weightage (%)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={kr.weightage}
                            onChange={(e) => updateKeyResult(index, 'weightage', Number(e.target.value))}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Goal' : 'Create Goal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

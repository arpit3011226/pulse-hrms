import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  WORKFLOW_EVENT_MODULES,
  WORKFLOW_FREQUENCIES,
  WORKFLOW_TIMING_OPTIONS,
  WORKFLOW_CONDITION_FIELDS,
  WORKFLOW_CONDITION_OPERATORS,
  WORKFLOW_ACTION_TYPES,
  WORKFLOW_RECIPIENTS,
  WORKFLOW_PLACEHOLDERS,
} from '@/lib/constants'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronRight, ChevronLeft, Check, Zap, Clock } from 'lucide-react'
import type {
  Workflow,
  WorkflowTriggerType,
  WorkflowTriggerConfig,
  WorkflowCondition,
  WorkflowAction,
  WorkflowActionConfig,
} from '@/types/database.types'

interface WorkflowBuilderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflow?: Workflow
  templateData?: Partial<Workflow>
  onSave: (data: Partial<Workflow> & { is_enabled: boolean }) => void
}

interface FormData {
  name: string
  description: string
  trigger_type: WorkflowTriggerType
  trigger_config: WorkflowTriggerConfig
  conditions: WorkflowCondition[]
  actions: WorkflowAction[]
}

const STEPS = [
  { number: 1, label: 'Trigger' },
  { number: 2, label: 'Conditions' },
  { number: 3, label: 'Actions' },
]

const DEFAULT_FORM: FormData = {
  name: '',
  description: '',
  trigger_type: 'event',
  trigger_config: {},
  conditions: [],
  actions: [
    {
      type: 'send_notification',
      config: { recipients: 'employee', title: '', message: '' },
    },
  ],
}

function getEventsForModule(module: string) {
  const found = WORKFLOW_EVENT_MODULES.find((m) => m.module === module)
  return found ? [...found.events] : []
}

function getTimingForEvent(eventValue: string): string[] {
  for (const mod of WORKFLOW_EVENT_MODULES) {
    const ev = mod.events.find((e) => e.value === eventValue)
    if (ev) return [...ev.timingOptions]
  }
  return ['on_event']
}

export function WorkflowBuilderDialog({
  open,
  onOpenChange,
  workflow,
  templateData,
  onSave,
}: WorkflowBuilderDialogProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({ ...DEFAULT_FORM })
  const [isSaving, setIsSaving] = useState(false)

  // Track which text field is active for placeholder insertion
  const activeFieldRef = useRef<{ actionIndex: number; field: 'title' | 'message' } | null>(null)

  // Reset form when dialog opens / closes or data changes
  useEffect(() => {
    if (!open) {
      setCurrentStep(1)
      return
    }

    if (workflow) {
      setFormData({
        name: workflow.name,
        description: workflow.description ?? '',
        trigger_type: workflow.trigger_type,
        trigger_config: workflow.trigger_config,
        conditions: workflow.conditions,
        actions: workflow.actions.length > 0 ? workflow.actions : DEFAULT_FORM.actions,
      })
    } else if (templateData) {
      setFormData({
        name: templateData.name ?? '',
        description: templateData.description ?? '',
        trigger_type: templateData.trigger_type ?? 'event',
        trigger_config: templateData.trigger_config ?? {},
        conditions: templateData.conditions ?? [],
        actions:
          templateData.actions && templateData.actions.length > 0
            ? templateData.actions
            : DEFAULT_FORM.actions,
      })
    } else {
      setFormData({ ...DEFAULT_FORM })
    }

    setCurrentStep(1)
  }, [open, workflow, templateData])

  // ── Field helpers ──────────────────────────────────────────────────────────

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  function updateTriggerConfig(patch: Partial<WorkflowTriggerConfig>) {
    setFormData((prev) => ({
      ...prev,
      trigger_config: { ...prev.trigger_config, ...patch },
    }))
  }

  // ── Conditions helpers ─────────────────────────────────────────────────────

  function addCondition() {
    update('conditions', [
      ...formData.conditions,
      { field: 'employment_status', operator: 'is', value: 'active' },
    ])
  }

  function updateCondition(index: number, patch: Partial<WorkflowCondition>) {
    const updated = formData.conditions.map((c, i) => (i === index ? { ...c, ...patch } : c))
    update('conditions', updated)
  }

  function removeCondition(index: number) {
    update(
      'conditions',
      formData.conditions.filter((_, i) => i !== index)
    )
  }

  // ── Actions helpers ────────────────────────────────────────────────────────

  function addAction() {
    update('actions', [
      ...formData.actions,
      {
        type: 'send_notification',
        config: { recipients: 'employee', title: '', message: '' },
      },
    ])
  }

  function updateAction(index: number, patch: Partial<WorkflowAction>) {
    const updated = formData.actions.map((a, i) =>
      i === index ? { ...a, ...patch } : a
    )
    update('actions', updated)
  }

  function updateActionConfig(index: number, patch: Partial<WorkflowActionConfig>) {
    const updated = formData.actions.map((a, i) =>
      i === index ? { ...a, config: { ...a.config, ...patch } } : a
    )
    update('actions', updated)
  }

  function removeAction(index: number) {
    if (formData.actions.length <= 1) {
      toast.error('At least one action is required')
      return
    }
    update(
      'actions',
      formData.actions.filter((_, i) => i !== index)
    )
  }

  function insertPlaceholder(key: string) {
    if (!activeFieldRef.current) {
      toast.info('Click on a title or message field first, then click a placeholder.')
      return
    }

    const { actionIndex, field } = activeFieldRef.current
    const fieldName = `action-${actionIndex}-${field}`
    const textarea = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(
      `[data-field-id="${fieldName}"]`
    )

    if (textarea) {
      const start = textarea.selectionStart ?? textarea.value.length
      const end = textarea.selectionEnd ?? textarea.value.length
      const current = textarea.value
      const newValue = current.substring(0, start) + key + current.substring(end)

      updateActionConfig(actionIndex, { [field]: newValue })

      setTimeout(() => {
        textarea.focus()
        const newPos = start + key.length
        textarea.setSelectionRange(newPos, newPos)
      }, 0)
    } else {
      // Fallback: append
      const action = formData.actions[actionIndex]
      if (action) {
        updateActionConfig(actionIndex, {
          [field]: (action.config[field] ?? '') + key,
        })
      }
    }
  }

  // ── Navigation & Save ──────────────────────────────────────────────────────

  function canProceedStep1() {
    if (!formData.name.trim()) return false
    if (formData.trigger_type === 'event') {
      return !!formData.trigger_config.event
    }
    return !!formData.trigger_config.frequency && !!formData.trigger_config.time
  }

  function canProceedStep3() {
    return formData.actions.every(
      (a) => a.config.title.trim() && a.config.message.trim()
    )
  }

  async function handleSave(enabled: boolean) {
    if (!canProceedStep3()) {
      toast.error('Please fill in all action titles and messages')
      return
    }

    setIsSaving(true)
    try {
      await onSave({
        name: formData.name,
        description: formData.description || null,
        trigger_type: formData.trigger_type,
        trigger_config: formData.trigger_config,
        conditions: formData.conditions,
        actions: formData.actions,
        is_enabled: enabled,
      })
    } catch {
      // error handled in parent
    } finally {
      setIsSaving(false)
    }
  }

  // ── Derived state for event selectors ──────────────────────────────────────

  const selectedModule = formData.trigger_config.event
    ? WORKFLOW_EVENT_MODULES.find((m) =>
        m.events.some((e) => e.value === formData.trigger_config.event)
      )?.module ?? ''
    : ''

  const availableEvents = selectedModule ? getEventsForModule(selectedModule) : []

  const availableTiming = formData.trigger_config.event
    ? getTimingForEvent(formData.trigger_config.event)
    : ['on_event']

  const isEditing = !!workflow

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Workflow' : 'Create Workflow'}
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((step, i) => (
            <div key={step.number} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  currentStep === step.number
                    ? 'bg-primary text-primary-foreground'
                    : currentStep > step.number
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {currentStep > step.number ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span>{step.number}</span>
                )}
                {step.label}
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 1: Trigger ─────────────────────────────────────────────── */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Workflow Name *</Label>
                <Input
                  placeholder="e.g. Birthday Notification"
                  value={formData.name}
                  onChange={(e) => update('name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Brief description"
                  value={formData.description}
                  onChange={(e) => update('description', e.target.value)}
                />
              </div>
            </div>

            {/* Trigger type toggle */}
            <div className="space-y-3">
              <Label>Trigger Type</Label>
              <RadioGroup
                value={formData.trigger_type}
                onValueChange={(v) => {
                  update('trigger_type', v as WorkflowTriggerType)
                  update('trigger_config', {})
                }}
                className="flex gap-4"
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="event" />
                  <Zap className="h-4 w-4" />
                  <span className="text-sm">Event-based</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="time" />
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Time-based</span>
                </label>
              </RadioGroup>
            </div>

            {/* Event-based config */}
            {formData.trigger_type === 'event' && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Module</Label>
                    <Select
                      value={selectedModule}
                      onValueChange={(mod) => {
                        // Reset event when module changes
                        updateTriggerConfig({
                          event: undefined,
                          timing: undefined,
                          days_offset: undefined,
                        })
                        // Just changing module means we find events for it
                        const events = getEventsForModule(mod)
                        if (events.length > 0 && events[0]) {
                          updateTriggerConfig({ event: events[0].value, timing: 'on_event' })
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select module" />
                      </SelectTrigger>
                      <SelectContent>
                        {WORKFLOW_EVENT_MODULES.map((m) => (
                          <SelectItem key={m.module} value={m.module}>
                            {m.module}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Event</Label>
                    <Select
                      value={formData.trigger_config.event ?? ''}
                      onValueChange={(ev) => {
                        updateTriggerConfig({ event: ev, timing: 'on_event', days_offset: undefined })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select event" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableEvents.map((ev) => (
                          <SelectItem key={ev.value} value={ev.value}>
                            {ev.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.trigger_config.event && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Timing</Label>
                      <Select
                        value={formData.trigger_config.timing ?? 'on_event'}
                        onValueChange={(t) =>
                          updateTriggerConfig({
                            timing: t as 'on_event' | 'days_before' | 'days_after',
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WORKFLOW_TIMING_OPTIONS.filter((opt) =>
                            availableTiming.includes(opt.value)
                          ).map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {(formData.trigger_config.timing === 'days_before' ||
                      formData.trigger_config.timing === 'days_after') && (
                      <div className="space-y-2">
                        <Label>Days</Label>
                        <Input
                          type="number"
                          min={1}
                          max={90}
                          value={formData.trigger_config.days_offset ?? 1}
                          onChange={(e) =>
                            updateTriggerConfig({ days_offset: parseInt(e.target.value) || 1 })
                          }
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Time-based config */}
            {formData.trigger_type === 'time' && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={formData.trigger_config.frequency ?? ''}
                      onValueChange={(f) =>
                        updateTriggerConfig({
                          frequency: f as 'daily' | 'weekly' | 'monthly',
                          day_of_week: undefined,
                          day_of_month: undefined,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {WORKFLOW_FREQUENCIES.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Time (HH:MM)</Label>
                    <Input
                      type="time"
                      value={formData.trigger_config.time ?? '09:00'}
                      onChange={(e) => updateTriggerConfig({ time: e.target.value })}
                    />
                  </div>

                  {formData.trigger_config.frequency === 'weekly' && (
                    <div className="space-y-2">
                      <Label>Day of Week</Label>
                      <Select
                        value={String(formData.trigger_config.day_of_week ?? 1)}
                        onValueChange={(d) =>
                          updateTriggerConfig({ day_of_week: parseInt(d) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(
                            (day, i) => (
                              <SelectItem key={i} value={String(i)}>
                                {day}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.trigger_config.frequency === 'monthly' && (
                    <div className="space-y-2">
                      <Label>Day of Month</Label>
                      <Input
                        type="number"
                        min={1}
                        max={28}
                        value={formData.trigger_config.day_of_month ?? 1}
                        onChange={(e) =>
                          updateTriggerConfig({ day_of_month: parseInt(e.target.value) || 1 })
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Conditions ──────────────────────────────────────────── */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Conditions (optional)</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Define conditions to filter which employees this workflow applies to.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={addCondition}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Condition
              </Button>
            </div>

            {formData.conditions.length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No conditions set. This workflow will apply to all employees.
                </p>
              </div>
            )}

            {formData.conditions.map((condition, index) => {
              const fieldDef = WORKFLOW_CONDITION_FIELDS.find(
                (f) => f.value === condition.field
              )
              const fieldOptions = fieldDef?.options ?? []

              return (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <Select
                    value={condition.field}
                    onValueChange={(v) =>
                      updateCondition(index, { field: v, value: '' })
                    }
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WORKFLOW_CONDITION_FIELDS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={condition.operator}
                    onValueChange={(v) =>
                      updateCondition(index, { operator: v as 'is' | 'is_not' })
                    }
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WORKFLOW_CONDITION_OPERATORS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {fieldOptions.length > 0 ? (
                    <Select
                      value={condition.value}
                      onValueChange={(v) => updateCondition(index, { value: v })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select value" />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt.replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      className="flex-1"
                      placeholder="Enter value"
                      value={condition.value}
                      onChange={(e) =>
                        updateCondition(index, { value: e.target.value })
                      }
                    />
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                    onClick={() => removeCondition(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Step 3: Actions ─────────────────────────────────────────────── */}
        {currentStep === 3 && (
          <div className="space-y-4">
            {/* Placeholder badges */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Insert Placeholders
              </p>
              <div className="flex flex-wrap gap-1.5">
                {WORKFLOW_PLACEHOLDERS.map((ph) => (
                  <Badge
                    key={ph.key}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
                    onClick={() => insertPlaceholder(ph.key)}
                  >
                    {ph.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Actions</p>
              <Button variant="outline" size="sm" onClick={addAction}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Action
              </Button>
            </div>

            {formData.actions.map((action, index) => (
              <div key={index} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Action {index + 1}
                  </span>
                  {formData.actions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeAction(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={action.type}
                      onValueChange={(v) =>
                        updateAction(index, {
                          type: v as 'send_notification' | 'send_email',
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WORKFLOW_ACTION_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Recipients</Label>
                    <Select
                      value={action.config.recipients}
                      onValueChange={(v) =>
                        updateActionConfig(index, {
                          recipients: v as WorkflowActionConfig['recipients'],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WORKFLOW_RECIPIENTS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Title *</Label>
                  <Input
                    data-field-id={`action-${index}-title`}
                    placeholder="e.g. Happy Birthday, {{employee_name}}!"
                    value={action.config.title}
                    onChange={(e) =>
                      updateActionConfig(index, { title: e.target.value })
                    }
                    onFocus={() => {
                      activeFieldRef.current = { actionIndex: index, field: 'title' }
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Message *</Label>
                  <Textarea
                    data-field-id={`action-${index}-message`}
                    placeholder="Write the notification/email message..."
                    className="min-h-[80px]"
                    value={action.config.message}
                    onChange={(e) =>
                      updateActionConfig(index, { message: e.target.value })
                    }
                    onFocus={() => {
                      activeFieldRef.current = { actionIndex: index, field: 'message' }
                    }}
                  />
                </div>

                {/* Show email-specific option */}
                {action.type === 'send_email' && (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={action.config.include_notification ?? false}
                      onCheckedChange={(checked) =>
                        updateActionConfig(index, { include_notification: checked })
                      }
                    />
                    <Label className="text-xs text-muted-foreground">
                      Also send an in-app notification
                    </Label>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <div>
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep((s) => s - 1)}
                disabled={isSaving}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep < 3 && (
              <Button
                onClick={() => {
                  if (currentStep === 1 && !canProceedStep1()) {
                    toast.error(
                      'Please fill in the workflow name and configure the trigger.'
                    )
                    return
                  }
                  setCurrentStep((s) => s + 1)
                }}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {currentStep === 3 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                >
                  Save as Draft
                </Button>
                <Button
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save & Enable'}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

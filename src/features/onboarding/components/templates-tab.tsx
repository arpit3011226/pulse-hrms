import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, ClipboardList, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useDepartments } from '@/features/departments/hooks/use-departments'
import {
  useOnboardingTemplates, useCreateTemplate, useDeleteTemplate,
  useAddTemplateTasks, useDeleteTemplateTask,
} from '../hooks/use-onboarding'
import {
  CATEGORY_LABELS, CATEGORY_ORDER, OWNER_LABELS,
  type OnboardingCategory, type OnboardingOwnerRole, type OnboardingTemplate,
} from '../types'
import { toast } from 'sonner'

function offsetLabel(days: number): string {
  if (days === 0) return 'On joining day'
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} before joining`
  return `${days} day${days === 1 ? '' : 's'} after joining`
}

export function TemplatesTab({ canManage }: { canManage: boolean }) {
  const { data: templates, isLoading } = useOnboardingTemplates()
  const { data: departments } = useDepartments()
  const createTemplate = useCreateTemplate()
  const deleteTemplate = useDeleteTemplate()
  const addTasks = useAddTemplateTasks()
  const deleteTask = useDeleteTemplateTask()

  const [expanded, setExpanded] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [taskFor, setTaskFor] = useState<OnboardingTemplate | null>(null)

  // template form
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [saving, setSaving] = useState(false)

  // task form
  const [tTitle, setTTitle] = useState('')
  const [tDesc, setTDesc] = useState('')
  const [tCategory, setTCategory] = useState<OnboardingCategory>('day_1')
  const [tOwner, setTOwner] = useState<OnboardingOwnerRole>('hr')
  const [tOffset, setTOffset] = useState('0')
  const [tMandatory, setTMandatory] = useState(true)

  useEffect(() => {
    if (!formOpen) return
    setName(''); setDescription(''); setDepartmentId(''); setIsDefault(false)
  }, [formOpen])

  useEffect(() => {
    if (!taskFor) return
    setTTitle(''); setTDesc(''); setTCategory('day_1'); setTOwner('hr')
    setTOffset('0'); setTMandatory(true)
  }, [taskFor])

  async function handleCreateTemplate() {
    setSaving(true)
    try {
      await createTemplate.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        department_id: departmentId || null,
        is_default: isDefault,
        is_active: true,
      })
      toast.success('Template created')
      setFormOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the template')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddTask() {
    if (!taskFor) return
    setSaving(true)
    try {
      await addTasks.mutateAsync([
        {
          template_id: taskFor.id,
          title: tTitle.trim(),
          description: tDesc.trim() || null,
          category: tCategory,
          owner_role: tOwner,
          due_offset_days: Number(tOffset) || 0,
          is_mandatory: tMandatory,
          sort_order: (taskFor.onboarding_template_tasks?.length ?? 0) + 1,
        },
      ])
      toast.success('Task added')
      setTaskFor(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add the task')
    } finally {
      setSaving(false)
    }
  }

  const list = templates ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          A template is a reusable plan. Tasks are copied when onboarding starts, so editing a
          template never changes anyone already partway through.
        </p>
        {canManage && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New template
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 rounded-full bg-violet-50 p-3">
              <ClipboardList className="h-6 w-6 text-violet-600" />
            </div>
            <p className="font-medium">No templates yet</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Build one per kind of joiner — engineering, sales, contractor — with the tasks HR, IT,
              Admin, the manager and the joiner each need to do.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((t) => {
            const open = expanded === t.id
            const tasks = [...(t.onboarding_template_tasks ?? [])].sort(
              (a, b) => a.sort_order - b.sort_order
            )
            return (
              <Card key={t.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-start gap-2 text-left"
                      onClick={() => setExpanded(open ? null : t.id)}
                    >
                      {open ? (
                        <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{t.name}</p>
                          {t.is_default && <Badge variant="secondary">Default</Badge>}
                          {t.department && <Badge variant="outline">{t.department.name}</Badge>}
                          {!t.is_active && <Badge variant="secondary">Inactive</Badge>}
                        </div>
                        {t.description && (
                          <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {tasks.length} task{tasks.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </button>
                    {canManage && (
                      <div className="flex shrink-0 gap-1">
                        <Button variant="outline" size="sm" onClick={() => setTaskFor(t)}>
                          <Plus className="mr-1 h-3.5 w-3.5" /> Task
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => setDeleteId(t.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {open && tasks.length > 0 && (
                    <div className="mt-4 space-y-4 border-t pt-3">
                      {CATEGORY_ORDER.map((cat) => {
                        const inCat = tasks.filter((x) => x.category === cat)
                        if (inCat.length === 0) return null
                        return (
                          <div key={cat}>
                            <h5 className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
                              {CATEGORY_LABELS[cat]}
                            </h5>
                            {inCat.map((task) => (
                              <div
                                key={task.id}
                                className="flex items-start justify-between gap-3 border-b py-2 last:border-0"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm">{task.title}</p>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                    <Badge variant="secondary" className="text-[10px]">
                                      {OWNER_LABELS[task.owner_role]}
                                    </Badge>
                                    <span className="text-[11px] text-muted-foreground">
                                      {offsetLabel(task.due_offset_days)}
                                    </span>
                                    {!task.is_mandatory && (
                                      <Badge variant="outline" className="text-[10px]">Optional</Badge>
                                    )}
                                  </div>
                                </div>
                                {canManage && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0 text-destructive"
                                    onClick={async () => {
                                      try {
                                        await deleteTask.mutateAsync(task.id)
                                        toast.success('Task removed')
                                      } catch {
                                        toast.error('Could not remove the task')
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* New template */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New onboarding template</DialogTitle>
            <DialogDescription>Add tasks to it once it is created.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                placeholder="e.g. Engineering — full time"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger><SelectValue placeholder="Any department" /></SelectTrigger>
                <SelectContent>
                  {(departments ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Use as default</p>
                <p className="text-xs text-muted-foreground">
                  Picked when no department template matches
                </p>
              </div>
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTemplate} disabled={!name.trim() || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add task */}
      <Dialog open={!!taskFor} onOpenChange={(open) => !open && setTaskFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add task to {taskFor?.name}</DialogTitle>
            <DialogDescription>
              Dates are relative to the joining date, so one template works for everyone.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Task *</Label>
              <Input
                placeholder="e.g. Issue laptop and set up accounts"
                value={tTitle}
                onChange={(e) => setTTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Details</Label>
              <Textarea value={tDesc} onChange={(e) => setTDesc(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <Select value={tCategory} onValueChange={(v) => setTCategory(v as OnboardingCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_ORDER.map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Owner</Label>
                <Select value={tOwner} onValueChange={(v) => setTOwner(v as OnboardingOwnerRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(OWNER_LABELS) as OnboardingOwnerRole[]).map((r) => (
                      <SelectItem key={r} value={r}>{OWNER_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Due (days from joining)</Label>
              <Input
                type="number"
                value={tOffset}
                onChange={(e) => setTOffset(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {offsetLabel(Number(tOffset) || 0)}. Use a negative number for before they join.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
              <p className="text-sm font-medium">Mandatory</p>
              <Switch checked={tMandatory} onCheckedChange={setTMandatory} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskFor(null)}>Cancel</Button>
            <Button onClick={handleAddTask} disabled={!tTitle.trim() || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete template"
        description="The template and its tasks will be removed. Onboardings already started keep their own copy of the tasks and are unaffected."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          try {
            await deleteTemplate.mutateAsync(deleteId!)
            toast.success('Template deleted')
          } catch {
            toast.error('Could not delete the template')
          } finally {
            setDeleteId(null)
          }
        }}
      />
    </div>
  )
}

import { useState } from 'react'
import { Plus, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useDepartments } from '@/features/departments/hooks/use-departments'
import { EMPLOYMENT_TYPES } from '@/lib/constants'
import {
  useAssignmentRules, useAddAssignmentRule, useDeleteAssignmentRule,
} from '../hooks/use-agreements'

const ANY = '__any__'

/**
 * Who has to sign this one.
 *
 * A rule only narrows on the fields that are set — leave a field on
 * "Anyone" and it is not a condition. Several rules are OR'd together, so
 * "Engineering" plus "Contractors" means either.
 *
 * With no rules at all, everybody signs it. That is said plainly on screen,
 * because the alternative reading — no rules means nobody — would let a
 * document be written, switched on, and quietly reach no one.
 */
export function AgreementRulesEditor({ templateId }: { templateId: string }) {
  const { organization } = useAuth()
  const { data: departments } = useDepartments()
  const { data: rules } = useAssignmentRules(templateId)
  const add = useAddAssignmentRule()
  const remove = useDeleteAssignmentRule()

  const [dept, setDept] = useState(ANY)
  const [type, setType] = useState(ANY)

  const deptName = (id: string | null) =>
    departments?.find((d) => d.id === id)?.name ?? 'Unknown team'

  async function handleAdd() {
    if (!organization?.id) return
    try {
      await add.mutateAsync({
        organization_id: organization.id,
        template_id: templateId,
        department_id: dept === ANY ? null : dept,
        designation_id: null,
        employment_type: type === ANY ? null : type,
        is_mandatory: true,
      })
      setDept(ANY)
      setType(ANY)
      toast.success('Rule added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add it')
    }
  }

  const list = rules ?? []

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <Label>Who signs this</Label>
      </div>

      {list.length === 0 ? (
        <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900">
          No rules, so <strong>everybody</strong> signs this. Add a rule to narrow it.
        </p>
      ) : (
        <div className="space-y-1.5">
          {list.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded bg-muted/50 px-2.5 py-1.5"
            >
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {r.department_id ? (
                  <Badge variant="outline">{deptName(r.department_id)}</Badge>
                ) : null}
                {r.employment_type ? (
                  <Badge variant="outline" className="capitalize">
                    {r.employment_type.replace('_', ' ')}
                  </Badge>
                ) : null}
                {!r.department_id && !r.employment_type && (
                  <Badge variant="outline">Everybody</Badge>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-rose-700"
                onClick={async () => {
                  try {
                    await remove.mutateAsync(r.id)
                  } catch {
                    toast.error('Could not remove it')
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[140px] flex-1 space-y-1">
          <Label className="text-xs">Team</Label>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Anyone</SelectItem>
              {(departments ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[140px] flex-1 space-y-1">
          <Label className="text-xs">Kind of contract</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Anyone</SelectItem>
              {EMPLOYMENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" variant="outline" onClick={handleAdd} disabled={add.isPending}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add rule
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Rules are OR'd — somebody matching any one of them signs it. Note that POSH covers every
        worker at the workplace, contractors and interns included, so leave that one open to
        everybody.
      </p>
    </div>
  )
}

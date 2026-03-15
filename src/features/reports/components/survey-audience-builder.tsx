import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Users,
  Building2,
  Briefcase,
  FileText,
  Activity,
  Calendar,
  User,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import type { SurveyTargetRule, SurveyRuleOperator } from '@/types/database.types'

interface SurveyAudienceBuilderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (rule: SurveyTargetRule) => void
}

interface FieldDef {
  key: string
  label: string
  icon: React.ElementType
  type: 'select' | 'date'
}

const FIELDS: FieldDef[] = [
  { key: 'gender', label: 'Gender', icon: Users, type: 'select' },
  { key: 'department_id', label: 'Department', icon: Building2, type: 'select' },
  { key: 'designation_id', label: 'Designation', icon: Briefcase, type: 'select' },
  { key: 'employment_type', label: 'Employment type', icon: FileText, type: 'select' },
  { key: 'status', label: 'Status', icon: Activity, type: 'select' },
  { key: 'date_of_joining', label: 'Joining date', icon: Calendar, type: 'date' },
  { key: 'date_of_birth', label: 'Date of birth', icon: Calendar, type: 'date' },
]

const SELECT_OPERATORS: { value: SurveyRuleOperator; label: string }[] = [
  { value: 'is', label: 'is' },
  { value: 'is_not', label: 'is not' },
]

const DATE_OPERATORS: { value: SurveyRuleOperator; label: string }[] = [
  { value: 'before', label: 'before' },
  { value: 'after', label: 'after' },
  { value: 'less_than_days_ago', label: 'less than X days ago' },
  { value: 'more_than_days_ago', label: 'more than X days ago' },
]

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
]

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'on_notice', label: 'On Notice' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'absconding', label: 'Absconding' },
]

export function SurveyAudienceBuilder({ open, onOpenChange, onSave }: SurveyAudienceBuilderProps) {
  const { organization } = useAuth()
  const orgId = organization?.id

  const [search, setSearch] = useState('')
  const [selectedField, setSelectedField] = useState<FieldDef | null>(null)
  const [operator, setOperator] = useState<SurveyRuleOperator | ''>('')
  const [value, setValue] = useState<string>('')

  const { data: departments } = useQuery({
    queryKey: ['departments-list', orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from('departments')
        .select('id, name')
        .eq('organization_id', orgId!)
        .order('name')
      return data ?? []
    },
    enabled: !!orgId && open,
  })

  const { data: designations } = useQuery({
    queryKey: ['designations-list', orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from('designations')
        .select('id, title')
        .eq('organization_id', orgId!)
        .order('title')
      return data ?? []
    },
    enabled: !!orgId && open,
  })

  const filteredFields = useMemo(() => {
    if (!search.trim()) return FIELDS
    const q = search.toLowerCase()
    return FIELDS.filter((f) => f.label.toLowerCase().includes(q))
  }, [search])

  const operators = selectedField?.type === 'date' ? DATE_OPERATORS : SELECT_OPERATORS

  const isDaysOperator =
    operator === 'less_than_days_ago' || operator === 'more_than_days_ago'

  const isDateOperator = operator === 'before' || operator === 'after'

  function handleFieldSelect(field: FieldDef) {
    setSelectedField(field)
    setOperator('')
    setValue('')
  }

  function handleReset() {
    setSearch('')
    setSelectedField(null)
    setOperator('')
    setValue('')
  }

  function handleSave() {
    if (!selectedField || !operator || !value) return
    const rule: SurveyTargetRule = {
      field: selectedField.key,
      operator: operator as SurveyRuleOperator,
      value: isDaysOperator ? Number(value) : value,
    }
    onSave(rule)
    handleReset()
    onOpenChange(false)
  }

  function renderValueInput() {
    if (!selectedField || !operator) return null

    if (isDaysOperator) {
      return (
        <Input
          type="number"
          placeholder="Number of days"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          min={0}
        />
      )
    }

    if (isDateOperator) {
      return (
        <Input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      )
    }

    // Select-type fields
    switch (selectedField.key) {
      case 'gender':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              {GENDER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'department_id':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {(departments ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'designation_id':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue placeholder="Select designation" />
            </SelectTrigger>
            <SelectContent>
              {(designations ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'employment_type':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYMENT_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'status':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); onOpenChange(v) }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a condition</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Search fields..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4"
        />

        <div className="grid grid-cols-[140px_200px_1fr] gap-4 min-h-[320px]">
          {/* Left panel: Entity */}
          <div className="border rounded-md p-3">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-muted rounded text-sm font-medium">
              <User className="h-4 w-4" />
              Employee
            </div>
          </div>

          {/* Middle panel: Field list */}
          <ScrollArea className="border rounded-md">
            <div className="p-2 space-y-1">
              {filteredFields.map((field) => {
                const Icon = field.icon
                const isActive = selectedField?.key === field.key
                return (
                  <button
                    key={field.key}
                    onClick={() => handleFieldSelect(field)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors text-left ${
                      isActive ? 'bg-muted font-medium' : ''
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {field.label}
                  </button>
                )
              })}
            </div>
          </ScrollArea>

          {/* Right panel: Operator + Value */}
          <div className="border rounded-md p-3 space-y-4">
            {selectedField ? (
              <>
                <p className="text-sm font-medium">{selectedField.label}</p>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    Choose an operator <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={operator}
                    onValueChange={(v) => {
                      setOperator(v as SurveyRuleOperator)
                      setValue('')
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select operator" />
                    </SelectTrigger>
                    <SelectContent>
                      {operators.map((op) => (
                        <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {operator && (
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Value</label>
                    {renderValueInput()}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground pt-4 text-center">
                Select a field to configure
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { handleReset(); onOpenChange(false) }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedField || !operator || !value}
          >
            Save condition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

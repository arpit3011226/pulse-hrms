import { useState } from 'react'
import { Loader2, GitBranch } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import {
  useOrganizationGoals,
  useCreateGoalForEmployee,
  useCurrentEmployee,
} from '../hooks/use-performance'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import type { EmployeeGoal } from '@/types/database.types'

interface Employee {
  id: string
  first_name: string
  last_name: string
  employee_code: string
}

interface CascadeGoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cycleId: string
}

export function CascadeGoalDialog({ open, onOpenChange, cycleId }: CascadeGoalDialogProps) {
  const { profile } = useAuth()
  const { data: currentEmployee } = useCurrentEmployee()
  const { data: orgGoals } = useOrganizationGoals(cycleId)
  const createGoalForEmployee = useCreateGoalForEmployee()

  const [selectedGoalId, setSelectedGoalId] = useState<string>('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [goalTitle, setGoalTitle] = useState('')
  const [weightage, setWeightage] = useState(10)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const goalsList = (orgGoals || []) as EmployeeGoal[]
  const selectedParentGoal = goalsList.find((g) => g.id === selectedGoalId)

  const handleSelectGoal = (goalId: string) => {
    setSelectedGoalId(goalId)
    const goal = goalsList.find((g) => g.id === goalId)
    if (goal) {
      setGoalTitle(goal.goal_title)
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setEmployees([])
      return
    }
    setSearching(true)
    try {
      const orgId = profile?.organization_id
      const { data } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_code')
        .eq('organization_id', orgId)
        .eq('employment_status', 'active')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .limit(20)
      setEmployees((data || []) as Employee[])
    } catch {
      setEmployees([])
    }
    setSearching(false)
  }

  const toggleEmployee = (empId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    )
  }

  const handleCascade = async () => {
    if (!selectedGoalId || selectedEmployeeIds.length === 0) {
      toast.error('Select a goal and at least one employee')
      return
    }

    try {
      for (const empId of selectedEmployeeIds) {
        await createGoalForEmployee.mutateAsync({
          employee_id: empId,
          performance_cycle_id: cycleId,
          goal_title: goalTitle,
          category: 'individual',
          weightage,
          unit: selectedParentGoal?.unit || 'percentage',
          target_value: selectedParentGoal?.target_value ?? 100,
          status: 'not_started',
          current_value: 0,
          parent_goal_id: selectedGoalId,
          created_by: currentEmployee?.id || null,
        })
      }
      toast.success(`Goal cascaded to ${selectedEmployeeIds.length} employee(s)`)
      onOpenChange(false)
      setSelectedGoalId('')
      setSelectedEmployeeIds([])
      setGoalTitle('')
      setSearchQuery('')
      setEmployees([])
    } catch {
      toast.error('Failed to cascade goal')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-orange-600" />
            Cascade Organization Goal
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-5 pb-4">
            {/* Select parent goal */}
            <div className="space-y-2">
              <Label>Organization Goal</Label>
              <Select value={selectedGoalId} onValueChange={handleSelectGoal}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an organization goal" />
                </SelectTrigger>
                <SelectContent>
                  {goalsList.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.goal_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {goalsList.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No organization goals found for this cycle.
                </p>
              )}
            </div>

            {selectedParentGoal && (
              <Card className="bg-orange-50/50 border-orange-200">
                <CardContent className="p-3">
                  <p className="text-sm font-medium">{selectedParentGoal.goal_title}</p>
                  {selectedParentGoal.goal_description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedParentGoal.goal_description}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Customizable fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Goal Title (for cascaded goals)</Label>
                <Input
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="Goal title for employees"
                />
              </div>
              <div className="space-y-2">
                <Label>Weightage (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={weightage}
                  onChange={(e) => setWeightage(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Employee selection */}
            <div className="space-y-2">
              <Label>Select Employees</Label>
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {searching && (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {employees.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-md border p-2 space-y-1">
                  {employees.map((emp) => (
                    <label
                      key={emp.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedEmployeeIds.includes(emp.id)}
                        onCheckedChange={() => toggleEmployee(emp.id)}
                      />
                      <span className="text-sm">
                        {emp.first_name} {emp.last_name}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {emp.employee_code}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {selectedEmployeeIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedEmployeeIds.length} employee(s) selected
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCascade}
            disabled={
              !selectedGoalId ||
              selectedEmployeeIds.length === 0 ||
              createGoalForEmployee.isPending
            }
          >
            {createGoalForEmployee.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cascade to {selectedEmployeeIds.length} Employee(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

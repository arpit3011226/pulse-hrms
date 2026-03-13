import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useTrainingCourses, useBulkEnroll, useCourseEnrollments, useCurrentEmployee } from '../hooks/use-learning'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  preselectedCourseId?: string
}

export function EnrollDialog({ open, onOpenChange, preselectedCourseId }: Props) {
  const { organization } = useAuth()
  const { data: currentEmployee } = useCurrentEmployee()
  const { data: courses } = useTrainingCourses()
  const bulkEnroll = useBulkEnroll()

  const [courseId, setCourseId] = useState(preselectedCourseId || '')
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])

  const { data: employees } = useQuery({
    queryKey: ['employees-list', organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_code')
        .eq('organization_id', organization!.id)
        .eq('status', 'active')
        .order('first_name')
      if (error) throw error
      return data
    },
    enabled: !!organization?.id && open,
  })

  const { data: existingEnrollments } = useCourseEnrollments(courseId || undefined)

  const enrolledIds = new Set((existingEnrollments ?? []).map((e: any) => e.employee_id))
  const availableEmployees = (employees ?? []).filter((e) => !enrolledIds.has(e.id))

  const publishedCourses = (courses ?? []).filter((c: any) => c.status === 'published')

  const handleSubmit = async () => {
    if (!courseId || selectedEmployees.length === 0) {
      toast.error('Select a course and at least one employee')
      return
    }
    try {
      await bulkEnroll.mutateAsync(
        selectedEmployees.map((eid) => ({
          organization_id: organization!.id,
          course_id: courseId,
          employee_id: eid,
          enrolled_by: currentEmployee?.id,
        }))
      )
      toast.success(`${selectedEmployees.length} employee(s) enrolled`)
      setSelectedEmployees([])
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to enroll')
    }
  }

  const toggleEmployee = (id: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    if (selectedEmployees.length === availableEmployees.length) {
      setSelectedEmployees([])
    } else {
      setSelectedEmployees(availableEmployees.map((e) => e.id))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enroll Employees</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Course *</Label>
            <Select value={courseId} onValueChange={(v) => { setCourseId(v); setSelectedEmployees([]) }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a published course" />
              </SelectTrigger>
              <SelectContent>
                {publishedCourses.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.course_name} ({c.course_code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {courseId && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Employees ({selectedEmployees.length} selected)</Label>
                {availableEmployees.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={toggleAll}>
                    {selectedEmployees.length === availableEmployees.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>
              <ScrollArea className="h-60 rounded border p-2">
                {availableEmployees.length > 0 ? (
                  availableEmployees.map((emp) => (
                    <label
                      key={emp.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
                    >
                      <Checkbox
                        checked={selectedEmployees.includes(emp.id)}
                        onCheckedChange={() => toggleEmployee(emp.id)}
                      />
                      <span className="text-sm">
                        {emp.first_name} {emp.last_name}
                        <span className="ml-1 text-muted-foreground">({emp.employee_code})</span>
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    All employees are already enrolled in this course.
                  </p>
                )}
              </ScrollArea>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={bulkEnroll.isPending || selectedEmployees.length === 0}>
              {bulkEnroll.isPending ? 'Enrolling...' : `Enroll ${selectedEmployees.length} Employee(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

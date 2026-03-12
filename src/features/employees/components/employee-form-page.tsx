import { Loader2 } from 'lucide-react'
import { EmployeeForm } from './employee-form'
import { useEmployee, useEmployees } from '../hooks/use-employees'
import { useDepartments, useDesignations } from '@/features/departments/hooks/use-departments'

interface EmployeeFormPageProps {
  employeeId?: string
}

export function EmployeeFormPage({ employeeId }: EmployeeFormPageProps) {
  const { data: employee, isLoading: empLoading } = useEmployee(employeeId ?? '')
  const { data: departments, isLoading: deptLoading } = useDepartments()
  const { data: designations, isLoading: desLoading } = useDesignations()
  const { data: allEmployees, isLoading: mgrLoading } = useEmployees()

  const isLoading = deptLoading || desLoading || mgrLoading || (!!employeeId && empLoading)

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Build managers list (all employees except current one)
  const managers = (allEmployees ?? [])
    .filter((e) => !employeeId || e.id !== employeeId)
    .map((e) => ({ id: e.id, first_name: e.first_name, last_name: e.last_name }))

  return (
    <EmployeeForm
      employee={employeeId ? (employee ?? undefined) : undefined}
      departments={departments ?? []}
      designations={designations ?? []}
      managers={managers}
    />
  )
}

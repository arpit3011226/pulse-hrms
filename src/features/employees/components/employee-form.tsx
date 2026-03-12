import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/layout/page-header'
import { useCreateEmployee, useUpdateEmployee } from '../hooks/use-employees'
import { EMPLOYMENT_TYPES, GENDER_OPTIONS, MARITAL_STATUS_OPTIONS, BLOOD_GROUPS } from '@/lib/constants'
import type { Employee, Department, Designation } from '@/types/database.types'
import { toast } from 'sonner'

const employeeSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  personal_email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  employee_code: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  marital_status: z.string().optional(),
  blood_group: z.string().optional(),
  department_id: z.string().optional(),
  designation_id: z.string().optional(),
  employment_type: z.string().optional(),
  date_of_joining: z.string().optional(),
  reporting_manager_id: z.string().optional(),
})

type EmployeeFormData = z.infer<typeof employeeSchema>

interface EmployeeFormProps {
  employee?: Employee
  departments: Department[]
  designations: Designation[]
  managers: Pick<Employee, 'id' | 'first_name' | 'last_name'>[]
}

export function EmployeeForm({ employee, departments, designations, managers }: EmployeeFormProps) {
  const navigate = useNavigate()
  const createEmployee = useCreateEmployee()
  const updateEmployee = useUpdateEmployee()
  const isEditing = !!employee

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: employee ? {
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      personal_email: employee.personal_email || '',
      phone: employee.phone || '',
      employee_code: employee.employee_code || '',
      date_of_birth: employee.date_of_birth || '',
      gender: employee.gender || '',
      marital_status: employee.marital_status || '',
      blood_group: employee.blood_group || '',
      department_id: employee.department_id || '',
      designation_id: employee.designation_id || '',
      employment_type: employee.employment_type,
      date_of_joining: employee.date_of_joining || '',
      reporting_manager_id: employee.reporting_manager_id || '',
    } : {
      employment_type: 'full_time',
    },
  })

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      // Clean empty strings to null
      const cleaned = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
      )

      if (isEditing) {
        await updateEmployee.mutateAsync({ id: employee.id, ...cleaned })
        toast.success('Employee updated successfully')
      } else {
        await createEmployee.mutateAsync(cleaned)
        toast.success('Employee created successfully')
      }
      navigate({ to: '/employees' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <div>
      <PageHeader
        title={isEditing ? 'Edit Employee' : 'Add Employee'}
        description={isEditing ? 'Update employee information' : 'Add a new employee to your organization'}
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList>
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="other">Other Details</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input id="first_name" {...register('first_name')} />
                  {errors.first_name && <p className="text-sm text-destructive">{errors.first_name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input id="last_name" {...register('last_name')} />
                  {errors.last_name && <p className="text-sm text-destructive">{errors.last_name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Work Email *</Label>
                  <Input id="email" type="email" {...register('email')} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personal_email">Personal Email</Label>
                  <Input id="personal_email" type="email" {...register('personal_email')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...register('phone')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input id="date_of_birth" type="date" {...register('date_of_birth')} />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select onValueChange={(v) => setValue('gender', v)} defaultValue={employee?.gender || undefined}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Marital Status</Label>
                  <Select onValueChange={(v) => setValue('marital_status', v)} defaultValue={employee?.marital_status || undefined}>
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      {MARITAL_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Blood Group</Label>
                  <Select onValueChange={(v) => setValue('blood_group', v)} defaultValue={employee?.blood_group || undefined}>
                    <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
                    <SelectContent>
                      {BLOOD_GROUPS.map((bg) => (
                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employment">
            <Card>
              <CardHeader>
                <CardTitle>Employment Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="employee_code">Employee Code</Label>
                  <Input id="employee_code" placeholder="EMP001" {...register('employee_code')} />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select onValueChange={(v) => setValue('department_id', v)} defaultValue={employee?.department_id || undefined}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Designation</Label>
                  <Select onValueChange={(v) => setValue('designation_id', v)} defaultValue={employee?.designation_id || undefined}>
                    <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                    <SelectContent>
                      {designations.map((des) => (
                        <SelectItem key={des.id} value={des.id}>{des.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Employment Type</Label>
                  <Select onValueChange={(v) => setValue('employment_type', v)} defaultValue={employee?.employment_type || 'full_time'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_joining">Date of Joining</Label>
                  <Input id="date_of_joining" type="date" {...register('date_of_joining')} />
                </div>
                <div className="space-y-2">
                  <Label>Reporting Manager</Label>
                  <Select onValueChange={(v) => setValue('reporting_manager_id', v)} defaultValue={employee?.reporting_manager_id || undefined}>
                    <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                    <SelectContent>
                      {managers.map((mgr) => (
                        <SelectItem key={mgr.id} value={mgr.id}>
                          {mgr.first_name} {mgr.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="other">
            <Card>
              <CardHeader>
                <CardTitle>Additional Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Additional fields like bank details, documents, and address will be available in the employee detail view.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Update Employee' : 'Create Employee'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate({ to: '/employees' })}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

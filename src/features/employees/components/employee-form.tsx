import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, Check, ArrowRight, ArrowLeft, User, Briefcase, Shield, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/layout/page-header'
import { useCreateEmployee, useUpdateEmployee, useNextEmployeeCode } from '../hooks/use-employees'
import { upsertEmployeeStatutory, upsertEmployeePersonal } from '../api/employees.api'
import { useAuth } from '@/features/auth/hooks/use-auth'
import {
  EMPLOYMENT_TYPES, GENDER_OPTIONS, MARITAL_STATUS_OPTIONS, BLOOD_GROUPS,
  SALUTATION_OPTIONS, RELIGION_OPTIONS, NATIONALITY_OPTIONS,
} from '@/lib/constants'
import type { Employee, EmployeeWithRelations, Department, Designation } from '@/types/database.types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const employeeSchema = z.object({
  salutation: z.string().optional(),
  first_name: z.string().min(1, 'First name is required'),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  personal_email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  official_phone: z.string().optional(),
  employee_code: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  marital_status: z.string().optional(),
  blood_group: z.string().optional(),
  nationality: z.string().optional(),
  religion: z.string().optional(),
  father_name: z.string().optional(),
  mother_name: z.string().optional(),
  spouse_name: z.string().optional(),
  department_id: z.string().optional(),
  designation_id: z.string().optional(),
  employment_type: z.string().optional(),
  date_of_joining: z.string().optional(),
  probation_days: z.coerce.number().min(0).optional(),
  probation_end_date: z.string().optional(),
  confirmation_date: z.string().optional(),
  reporting_manager_id: z.string().optional(),
  pan_number: z.string().optional(),
  aadhar_number: z.string().optional(),
  uan_number: z.string().optional(),
})

type EmployeeFormData = z.infer<typeof employeeSchema>

// Fields required per wizard step (for validation gating)
const STEP_FIELDS: Record<number, (keyof EmployeeFormData)[]> = {
  0: ['salutation', 'first_name', 'middle_name', 'last_name', 'email', 'personal_email', 'phone', 'official_phone', 'date_of_birth', 'gender', 'marital_status', 'blood_group', 'nationality', 'religion'],
  1: ['employee_code', 'department_id', 'designation_id', 'employment_type', 'date_of_joining', 'probation_days', 'probation_end_date', 'confirmation_date', 'reporting_manager_id'],
  2: ['pan_number', 'aadhar_number', 'uan_number'],
  3: ['father_name', 'mother_name', 'spouse_name'],
}

const WIZARD_STEPS = [
  { title: 'Personal Info', description: 'Basic personal details', icon: User, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', activeBg: 'bg-blue-500' },
  { title: 'Employment', description: 'Role & department details', icon: Briefcase, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', activeBg: 'bg-amber-500' },
  { title: 'Compliance', description: 'Identity & statutory info', icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', activeBg: 'bg-emerald-500' },
  { title: 'Family Details', description: 'Family & emergency info', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200', activeBg: 'bg-rose-500' },
]

/**
 * Fields that live outside `employees` since 00045, because they are not part of
 * the staff directory everyone can read.
 */
const STATUTORY_FIELDS = ['pan_number', 'aadhar_number', 'passport_number', 'uan_number'] as const
const PERSONAL_FIELDS = ['date_of_birth', 'religion', 'father_name', 'mother_name', 'spouse_name'] as const

interface EmployeeFormProps {
  employee?: EmployeeWithRelations
  departments: Department[]
  designations: Designation[]
  managers: Pick<Employee, 'id' | 'first_name' | 'last_name'>[]
}

export function EmployeeForm({ employee, departments, designations, managers }: EmployeeFormProps) {
  const navigate = useNavigate()
  const { organization } = useAuth()
  const createEmployee = useCreateEmployee()
  const updateEmployee = useUpdateEmployee()
  const isEditing = !!employee
  const [currentStep, setCurrentStep] = useState(0)
  const { data: nextCode } = useNextEmployeeCode()

  const { register, handleSubmit, setValue, watch, trigger, formState: { errors, isSubmitting } } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema) as any,
    defaultValues: employee ? {
      salutation: employee.salutation || '',
      first_name: employee.first_name,
      middle_name: employee.middle_name || '',
      last_name: employee.last_name,
      email: employee.email,
      personal_email: employee.personal_email || '',
      phone: employee.phone || '',
      official_phone: employee.official_phone || '',
      employee_code: employee.employee_code || '',
      date_of_birth: employee.personal?.date_of_birth || '',
      gender: employee.gender || '',
      marital_status: employee.marital_status || '',
      blood_group: employee.blood_group || '',
      nationality: employee.nationality || '',
      religion: employee.personal?.religion || '',
      father_name: employee.personal?.father_name || '',
      mother_name: employee.personal?.mother_name || '',
      spouse_name: employee.personal?.spouse_name || '',
      department_id: employee.department_id || '',
      designation_id: employee.designation_id || '',
      employment_type: employee.employment_type,
      date_of_joining: employee.date_of_joining || '',
      probation_days: employee.date_of_joining && employee.probation_end_date
        ? Math.round((new Date(employee.probation_end_date).getTime() - new Date(employee.date_of_joining).getTime()) / (1000 * 60 * 60 * 24))
        : 180,
      probation_end_date: employee.probation_end_date || '',
      confirmation_date: employee.confirmation_date || '',
      reporting_manager_id: employee.reporting_manager_id || '',
      pan_number: employee.statutory?.pan_number || '',
      aadhar_number: employee.statutory?.aadhar_number || '',
      uan_number: employee.statutory?.uan_number || '',
    } : {
      employment_type: 'full_time',
      nationality: 'Indian',
      probation_days: 180,
    },
  })

  // Auto-fill employee code for new employees
  useEffect(() => {
    if (!isEditing && nextCode) {
      setValue('employee_code', nextCode)
    }
  }, [isEditing, nextCode, setValue])

  // Auto-calculate probation end date from joining date + probation days
  const joiningDate = watch('date_of_joining')
  const probationDays = watch('probation_days')
  useEffect(() => {
    const days = Number(probationDays)
    if (joiningDate && days > 0) {
      const d = new Date(joiningDate)
      d.setDate(d.getDate() + days)
      setValue('probation_end_date', d.toISOString().split('T')[0])
    }
  }, [joiningDate, probationDays, setValue])

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      // Remove probation_days (UI-only field, not a DB column)
      const { probation_days: _, ...dbData } = data
      const cleaned = Object.fromEntries(
        Object.entries(dbData).map(([k, v]) => [k, v === '' ? null : v])
      )

      // Split the form back out into the three tables it now writes to.
      const statutory: Record<string, unknown> = {}
      const personal: Record<string, unknown> = {}
      for (const f of STATUTORY_FIELDS) {
        if (f in cleaned) { statutory[f] = cleaned[f]; delete cleaned[f] }
      }
      for (const f of PERSONAL_FIELDS) {
        if (f in cleaned) { personal[f] = cleaned[f]; delete cleaned[f] }
      }

      let employeeId: string
      if (isEditing) {
        await updateEmployee.mutateAsync({ id: employee.id, ...cleaned })
        employeeId = employee.id
      } else {
        const created = await createEmployee.mutateAsync(cleaned)
        employeeId = (created as { id: string }).id
      }

      if (organization) {
        await upsertEmployeeStatutory(employeeId, organization.id, statutory)
        await upsertEmployeePersonal(employeeId, organization.id, personal)
      }

      toast.success(isEditing ? 'Employee updated successfully' : 'Employee created successfully')
      navigate({ to: '/employees' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const handleNext = async () => {
    const fields = STEP_FIELDS[currentStep]
    const valid = await trigger(fields)
    if (valid) setCurrentStep((s) => Math.min(s + 1, 3))
  }

  const handleBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 0))
  }

  // ── Shared field renderers ──────────────────────────────────────────

  const personalFields = (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-2">
        <Label>Salutation</Label>
        <Select onValueChange={(v) => setValue('salutation', v)} defaultValue={employee?.salutation || undefined}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {SALUTATION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="first_name">First Name *</Label>
        <Input id="first_name" {...register('first_name')} />
        {errors.first_name && <p className="text-sm text-destructive">{errors.first_name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="middle_name">Middle Name</Label>
        <Input id="middle_name" {...register('middle_name')} />
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
        <Label htmlFor="official_phone">Official Phone</Label>
        <Input id="official_phone" {...register('official_phone')} />
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
      <div className="space-y-2">
        <Label>Nationality</Label>
        <Select onValueChange={(v) => setValue('nationality', v)} defaultValue={employee?.nationality || 'Indian'}>
          <SelectTrigger><SelectValue placeholder="Select nationality" /></SelectTrigger>
          <SelectContent>
            {NATIONALITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Religion</Label>
        <Select onValueChange={(v) => setValue('religion', v)} defaultValue={employee?.personal?.religion || undefined}>
          <SelectTrigger><SelectValue placeholder="Select religion" /></SelectTrigger>
          <SelectContent>
            {RELIGION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  const employmentFields = (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="employee_code">Employee Code</Label>
        <Input
          id="employee_code"
          placeholder="Auto-generated"
          {...register('employee_code')}
          readOnly={!isEditing}
          className={!isEditing ? 'bg-muted cursor-not-allowed' : ''}
        />
        {!isEditing && (
          <p className="text-[11px] text-muted-foreground">Auto-generated — cannot be changed</p>
        )}
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
        <Label htmlFor="probation_days">Probation Period (days)</Label>
        <Input id="probation_days" type="number" {...register('probation_days')} placeholder="e.g., 180" />
        {watch('probation_end_date') && (
          <p className="text-xs text-muted-foreground">
            Ends on: {new Date(watch('probation_end_date')!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmation_date">Confirmation Date</Label>
        <Input id="confirmation_date" type="date" {...register('confirmation_date')} />
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
    </div>
  )

  const complianceFields = (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="pan_number">PAN Number</Label>
        <Input id="pan_number" placeholder="ABCDE1234F" {...register('pan_number')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="aadhar_number">Aadhar Number</Label>
        <Input id="aadhar_number" placeholder="1234 5678 9012" {...register('aadhar_number')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="uan_number">UAN (PF Number)</Label>
        <Input id="uan_number" placeholder="100123456789" {...register('uan_number')} />
      </div>
    </div>
  )

  const familyFields = (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="father_name">Father's Name</Label>
        <Input id="father_name" {...register('father_name')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mother_name">Mother's Name</Label>
        <Input id="mother_name" {...register('mother_name')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="spouse_name">Spouse's Name</Label>
        <Input id="spouse_name" {...register('spouse_name')} />
      </div>
    </div>
  )

  const stepContent = [personalFields, employmentFields, complianceFields, familyFields]

  // ── Edit mode: keep existing tabs layout ────────────────────────────

  if (isEditing) {
    return (
      <div>
        <PageHeader
          title="Edit Employee"
          description="Update employee information"
        />
        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs defaultValue="personal" className="space-y-6">
            <TabsList>
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="employment">Employment</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
              <TabsTrigger value="family">Family Details</TabsTrigger>
            </TabsList>
            <TabsContent value="personal">
              <Card>
                <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
                <CardContent>{personalFields}</CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="employment">
              <Card>
                <CardHeader><CardTitle>Employment Details</CardTitle></CardHeader>
                <CardContent>{employmentFields}</CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="compliance">
              <Card>
                <CardHeader><CardTitle>Compliance & Identity</CardTitle></CardHeader>
                <CardContent>{complianceFields}</CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="family">
              <Card>
                <CardHeader><CardTitle>Family Details</CardTitle></CardHeader>
                <CardContent>{familyFields}</CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          <div className="mt-6 flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Employee
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate({ to: '/employees' })}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    )
  }

  // ── Create mode: progressive wizard ─────────────────────────────────

  const step = WIZARD_STEPS[currentStep]
  const StepIcon = step.icon
  const isLastStep = currentStep === 3

  return (
    <div>
      <PageHeader
        title="Add Employee"
        description="Add a new employee to your organization"
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* ── Stepper ── */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {WIZARD_STEPS.map((s, i) => {
              const Icon = s.icon
              const isCompleted = i < currentStep
              const isActive = i === currentStep
              const isFuture = i > currentStep

              return (
                <div key={s.title} className="flex flex-1 items-center">
                  {/* Step circle + label */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300',
                        isCompleted && 'border-emerald-500 bg-emerald-500 text-white',
                        isActive && cn('border-transparent text-white shadow-lg', s.activeBg),
                        isFuture && 'border-muted-foreground/25 bg-muted/50 text-muted-foreground/50'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className={cn(
                        'text-xs font-semibold',
                        isActive && 'text-foreground',
                        isCompleted && 'text-emerald-600',
                        isFuture && 'text-muted-foreground/50'
                      )}>
                        {s.title}
                      </p>
                      <p className={cn(
                        'hidden text-[10px] sm:block',
                        isActive ? 'text-muted-foreground' : 'text-muted-foreground/40'
                      )}>
                        Step {i + 1} of 4
                      </p>
                    </div>
                  </div>

                  {/* Connector line */}
                  {i < WIZARD_STEPS.length - 1 && (
                    <div className="mx-2 mt-[-20px] flex-1">
                      <div className={cn(
                        'h-0.5 w-full rounded-full transition-all duration-500',
                        i < currentStep ? 'bg-emerald-500' : 'bg-muted-foreground/15'
                      )} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Step content ── */}
        <Card className={cn('border', step.border, 'transition-colors duration-300')}>
          <CardHeader className={cn(step.bg, 'rounded-t-lg transition-colors duration-300')}>
            <div className="flex items-center gap-3">
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg text-white', step.activeBg)}>
                <StepIcon className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-lg">{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div key={currentStep}>
              {stepContent[currentStep]}
            </div>
            {isLastStep && (
              <p className="mt-4 text-sm text-muted-foreground">
                Dependents, nominees, addresses, bank accounts, and documents can be managed from the employee detail view after creation.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Navigation buttons ── */}
        <div className="mt-6 flex items-center justify-between">
          <div>
            {currentStep > 0 && (
              <Button type="button" variant="outline" onClick={handleBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate({ to: '/employees' })}>
              Cancel
            </Button>
            {isLastStep ? (
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Employee
              </Button>
            ) : (
              <Button type="button" onClick={handleNext} className="gap-2">
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

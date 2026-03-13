import { Link } from '@tanstack/react-router'
import { ArrowLeft, Mail, Phone, Calendar, Building2, Briefcase, Pencil, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/shared/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useEmployee, useEmployees } from '../hooks/use-employees'
import { useDepartments, useDesignations } from '@/features/departments/hooks/use-departments'
import { usePermissions } from '@/hooks/use-permissions'
import { getInitials, formatDate } from '@/lib/utils'
import { EmployeePersonalTab } from './employee-personal-tab'
import { EmployeeDocumentsTab } from './employee-documents-tab'
import { EmployeeBankTab } from './employee-bank-tab'
import { EmployeeWorkHistoryTab } from './employee-work-history-tab'
import { EmployeeExitTab } from './employee-exit-tab'

interface EmployeeDetailProps {
  employeeId: string
}

export function EmployeeDetail({ employeeId }: EmployeeDetailProps) {
  const { data: employee, isLoading } = useEmployee(employeeId)
  const { data: departments } = useDepartments()
  const { data: designations } = useDesignations()
  const { data: allEmployees } = useEmployees()
  const permissions = usePermissions()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-6">
          <Skeleton className="h-64 w-80" />
          <Skeleton className="h-64 flex-1" />
        </div>
      </div>
    )
  }

  if (!employee) {
    return <div className="py-16 text-center text-muted-foreground">Employee not found</div>
  }

  const emp = employee as typeof employee & {
    department?: { id: string; name: string } | null
    designation?: { id: string; title: string } | null
  }

  const managers = (allEmployees ?? [])
    .filter(e => e.id !== employeeId)
    .map(e => ({ id: e.id, first_name: e.first_name, last_name: e.last_name }))

  const showExitTab = ['on_notice', 'resigned', 'terminated', 'absconding'].includes(emp.status) || permissions.canInitiateExit

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/employees"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={emp.avatar_url || undefined} />
              <AvatarFallback className="text-lg">
                {getInitials(emp.first_name, emp.last_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-semibold">
                {emp.salutation ? `${emp.salutation}. ` : ''}{emp.first_name} {emp.middle_name ? `${emp.middle_name} ` : ''}{emp.last_name}
              </h1>
              <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                {emp.designation?.title && <span>{emp.designation.title}</span>}
                {emp.department?.name && (
                  <>
                    <span>|</span>
                    <span>{emp.department.name}</span>
                  </>
                )}
                {emp.employee_code && (
                  <>
                    <span>|</span>
                    <span>{emp.employee_code}</span>
                  </>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={emp.status} />
                <StatusBadge status={emp.employment_type} />
              </div>
            </div>
          </div>
          {permissions.canManageEmployees && (
            <Button asChild>
              <Link to="/employees/$employeeId/edit" params={{ employeeId: emp.id }}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="documents">Documents & ID</TabsTrigger>
          <TabsTrigger value="bank">Bank & Finance</TabsTrigger>
          <TabsTrigger value="work-history">Work History</TabsTrigger>
          {showExitTab && <TabsTrigger value="exit">Exit</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow icon={Mail} label="Work Email" value={emp.email} />
                {emp.personal_email && <InfoRow icon={Mail} label="Personal Email" value={emp.personal_email} />}
                {emp.phone && <InfoRow icon={Phone} label="Phone" value={emp.phone} />}
                {emp.official_phone && <InfoRow icon={Phone} label="Official Phone" value={emp.official_phone} />}
                {emp.date_of_birth && <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(emp.date_of_birth)} />}
                {emp.gender && <InfoRow label="Gender" value={emp.gender} />}
                {emp.marital_status && <InfoRow label="Marital Status" value={emp.marital_status} />}
                {emp.blood_group && <InfoRow label="Blood Group" value={emp.blood_group} />}
                {emp.nationality && <InfoRow label="Nationality" value={emp.nationality} />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Employment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {emp.employee_code && <InfoRow icon={Briefcase} label="Employee Code" value={emp.employee_code} />}
                <InfoRow icon={Building2} label="Department" value={emp.department?.name || 'Not assigned'} />
                <InfoRow label="Designation" value={emp.designation?.title || 'Not assigned'} />
                <InfoRow label="Employment Type" value={emp.employment_type.replace('_', ' ')} />
                {emp.date_of_joining && <InfoRow icon={Calendar} label="Date of Joining" value={formatDate(emp.date_of_joining)} />}
                {emp.confirmation_date && <InfoRow icon={Calendar} label="Confirmation Date" value={formatDate(emp.confirmation_date)} />}
                {emp.probation_end_date && <InfoRow icon={Calendar} label="Probation End" value={formatDate(emp.probation_end_date)} />}
              </CardContent>
            </Card>

            {(emp.pan_number || emp.uan_number || emp.aadhar_number) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Compliance & Identity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {emp.pan_number && <InfoRow icon={ShieldCheck} label="PAN Number" value={emp.pan_number} />}
                  {emp.uan_number && <InfoRow icon={ShieldCheck} label="UAN (PF Number)" value={emp.uan_number} />}
                  {emp.aadhar_number && <InfoRow icon={ShieldCheck} label="Aadhar Number" value={emp.aadhar_number} />}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Personal Tab */}
        <TabsContent value="personal" className="mt-6">
          <EmployeePersonalTab employee={emp} />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6">
          <EmployeeDocumentsTab employee={emp} />
        </TabsContent>

        {/* Bank & Finance Tab */}
        <TabsContent value="bank" className="mt-6">
          <EmployeeBankTab employee={emp} />
        </TabsContent>

        {/* Work History Tab */}
        <TabsContent value="work-history" className="mt-6">
          <EmployeeWorkHistoryTab
            employee={emp}
            departments={(departments ?? []).map(d => ({ id: d.id, name: d.name }))}
            designations={(designations ?? []).map(d => ({ id: d.id, title: d.title }))}
            managers={managers}
          />
        </TabsContent>

        {/* Exit Tab */}
        {showExitTab && (
          <TabsContent value="exit" className="mt-6">
            <EmployeeExitTab employee={emp} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon?: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />}
      {!Icon && <div className="w-4" />}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium capitalize">{value}</p>
      </div>
    </div>
  )
}

import { Link } from '@tanstack/react-router'
import { ArrowLeft, Mail, Phone, Calendar, Building2, Briefcase, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/shared/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useEmployee } from '../hooks/use-employees'
import { usePermissions } from '@/hooks/use-permissions'
import { getInitials, formatDate } from '@/lib/utils'

interface EmployeeDetailProps {
  employeeId: string
}

export function EmployeeDetail({ employeeId }: EmployeeDetailProps) {
  const { data: employee, isLoading } = useEmployee(employeeId)
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
              <h1 className="text-2xl font-semibold">{emp.first_name} {emp.last_name}</h1>
              <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                {emp.designation?.title && <span>{emp.designation.title}</span>}
                {emp.department?.name && (
                  <>
                    <span>|</span>
                    <span>{emp.department.name}</span>
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
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Personal Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow icon={Mail} label="Work Email" value={emp.email} />
                {emp.personal_email && <InfoRow icon={Mail} label="Personal Email" value={emp.personal_email} />}
                {emp.phone && <InfoRow icon={Phone} label="Phone" value={emp.phone} />}
                {emp.date_of_birth && <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(emp.date_of_birth)} />}
                {emp.gender && <InfoRow label="Gender" value={emp.gender} />}
                {emp.marital_status && <InfoRow label="Marital Status" value={emp.marital_status} />}
                {emp.blood_group && <InfoRow label="Blood Group" value={emp.blood_group} />}
              </CardContent>
            </Card>

            {/* Employment Info */}
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              Document management will be available here.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave" className="mt-6">
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              Leave history will be available here.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              Attendance records will be available here.
            </CardContent>
          </Card>
        </TabsContent>
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

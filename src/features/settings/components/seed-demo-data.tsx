import { useState } from 'react'
import { Loader2, Users, CheckCircle2, AlertCircle, Database, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { toast } from 'sonner'
import { generateNextEmployeeCode } from '@/features/employees/api/employees.api'

// ── Demo Users ────────────────────────────────────────────────────────
const DEMO_USERS = [
  {
    email: 'admin@pulsehrms.demo',
    password: 'Demo@1234',
    first_name: 'Aarav',
    last_name: 'Sharma',
    role: 'super_admin' as const,
    employment_type: 'full_time',
    gender: 'male',
    department: 'Executive',
    designation: 'Chief Executive Officer',
  },
  {
    email: 'hr@pulsehrms.demo',
    password: 'Demo@1234',
    first_name: 'Priya',
    last_name: 'Patel',
    role: 'hr_admin' as const,
    employment_type: 'full_time',
    gender: 'female',
    department: 'Human Resources',
    designation: 'HR Manager',
  },
  {
    email: 'payroll@pulsehrms.demo',
    password: 'Demo@1234',
    first_name: 'Rohan',
    last_name: 'Gupta',
    role: 'payroll_admin' as const,
    employment_type: 'full_time',
    gender: 'male',
    department: 'Finance',
    designation: 'Payroll Manager',
  },
  {
    email: 'manager@pulsehrms.demo',
    password: 'Demo@1234',
    first_name: 'Ananya',
    last_name: 'Singh',
    role: 'manager' as const,
    employment_type: 'full_time',
    gender: 'female',
    department: 'Engineering',
    designation: 'Engineering Manager',
  },
  {
    email: 'lead@pulsehrms.demo',
    password: 'Demo@1234',
    first_name: 'Vikram',
    last_name: 'Mehta',
    role: 'leadership' as const,
    employment_type: 'full_time',
    gender: 'male',
    department: 'Executive',
    designation: 'VP of Operations',
  },
  {
    email: 'employee1@pulsehrms.demo',
    password: 'Demo@1234',
    first_name: 'Sneha',
    last_name: 'Reddy',
    role: 'employee' as const,
    employment_type: 'full_time',
    gender: 'female',
    department: 'Engineering',
    designation: 'Software Engineer',
  },
  {
    email: 'employee2@pulsehrms.demo',
    password: 'Demo@1234',
    first_name: 'Karan',
    last_name: 'Joshi',
    role: 'employee' as const,
    employment_type: 'full_time',
    gender: 'male',
    department: 'Sales',
    designation: 'Sales Executive',
  },
  {
    email: 'contractor@pulsehrms.demo',
    password: 'Demo@1234',
    first_name: 'Meera',
    last_name: 'Nair',
    role: 'employee' as const,
    employment_type: 'contract',
    gender: 'female',
    department: 'Design',
    designation: 'UI Designer',
  },
]

const DEMO_DEPARTMENTS = [
  'Executive', 'Human Resources', 'Finance', 'Engineering', 'Sales', 'Design', 'Marketing', 'Operations',
]

const DEMO_DESIGNATIONS = [
  'Chief Executive Officer', 'VP of Operations', 'HR Manager', 'Payroll Manager',
  'Engineering Manager', 'Software Engineer', 'Senior Software Engineer',
  'Sales Executive', 'Sales Manager', 'UI Designer', 'Product Manager',
  'Marketing Executive', 'Operations Lead',
]

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700',
  hr_admin: 'bg-blue-100 text-blue-700',
  payroll_admin: 'bg-amber-100 text-amber-700',
  manager: 'bg-purple-100 text-purple-700',
  leadership: 'bg-emerald-100 text-emerald-700',
  employee: 'bg-gray-100 text-gray-700',
}

interface LogEntry {
  message: string
  type: 'success' | 'error' | 'info'
}

export function SeedDemoData() {
  const { organization } = useAuth()
  const [isSeeding, setIsSeeding] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isDone, setIsDone] = useState(false)

  const log = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs((prev) => [...prev, { message, type }])
  }

  const ensureDepartments = async (orgId: string): Promise<Record<string, string>> => {
    const map: Record<string, string> = {}
    for (const name of DEMO_DEPARTMENTS) {
      const { data: existing } = await supabase
        .from('departments')
        .select('id')
        .eq('organization_id', orgId)
        .eq('name', name)
        .maybeSingle()

      if (existing) {
        map[name] = existing.id
      } else {
        const { data: created, error } = await supabase
          .from('departments')
          .insert({ organization_id: orgId, name, is_active: true })
          .select('id')
          .single()
        if (error) {
          log(`  Dept "${name}" skipped: ${error.message}`, 'error')
        } else {
          map[name] = created.id
          log(`  Created department: ${name}`, 'success')
        }
      }
    }
    return map
  }

  const ensureDesignations = async (orgId: string): Promise<Record<string, string>> => {
    const map: Record<string, string> = {}
    for (const title of DEMO_DESIGNATIONS) {
      const { data: existing } = await supabase
        .from('designations')
        .select('id')
        .eq('organization_id', orgId)
        .eq('title', title)
        .maybeSingle()

      if (existing) {
        map[title] = existing.id
      } else {
        const { data: created, error } = await supabase
          .from('designations')
          .insert({ organization_id: orgId, title, is_active: true })
          .select('id')
          .single()
        if (error) {
          log(`  Designation "${title}" skipped: ${error.message}`, 'error')
        } else {
          map[title] = created.id
          log(`  Created designation: ${title}`, 'success')
        }
      }
    }
    return map
  }

  const handleSeed = async () => {
    if (!organization) return
    setIsSeeding(true)
    setLogs([])
    setIsDone(false)

    try {
      log('Setting up departments...', 'info')
      const deptMap = await ensureDepartments(organization.id)

      log('Setting up designations...', 'info')
      const desigMap = await ensureDesignations(organization.id)

      log('Creating demo users...', 'info')
      let empCode = await generateNextEmployeeCode(organization.id)
      let successCount = 0

      for (const user of DEMO_USERS) {
        // Check if employee with this email already exists
        const { data: existingEmp } = await supabase
          .from('employees')
          .select('id')
          .eq('organization_id', organization.id)
          .eq('email', user.email)
          .maybeSingle()

        if (existingEmp) {
          log(`  ${user.first_name} ${user.last_name} (${user.email}) — already exists, skipped`, 'info')
          continue
        }

        // 1. Sign up the user (creates auth.users + profiles via trigger)
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: user.email,
          password: user.password,
          options: {
            data: {
              first_name: user.first_name,
              last_name: user.last_name,
            },
          },
        })

        if (authError || !authData.user) {
          log(`  ${user.email} — auth failed: ${authError?.message || 'Unknown'}`, 'error')
          continue
        }

        const userId = authData.user.id

        // 2. Update profile with org and role
        // Small delay for trigger to fire
        await new Promise((r) => setTimeout(r, 500))

        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            organization_id: organization.id,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
          })
          .eq('id', userId)

        if (profileError) {
          log(`  ${user.email} — profile update failed: ${profileError.message}`, 'error')
          continue
        }

        // 3. Create employee record
        const { error: empError } = await supabase
          .from('employees')
          .insert({
            organization_id: organization.id,
            profile_id: userId,
            employee_code: empCode,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            gender: user.gender,
            employment_type: user.employment_type,
            department_id: deptMap[user.department] || null,
            designation_id: desigMap[user.designation] || null,
            date_of_joining: '2024-01-15',
            status: 'active',
            nationality: 'Indian',
          })

        if (empError) {
          log(`  ${user.email} — employee create failed: ${empError.message}`, 'error')
          continue
        }

        // Increment emp code
        const num = parseInt(empCode.replace('EMP-', ''), 10)
        empCode = `EMP-${String(num + 1).padStart(4, '0')}`

        log(`  ${user.first_name} ${user.last_name} (${user.role}) — created`, 'success')
        successCount++
      }

      log(`Done! ${successCount} demo user(s) created.`, 'success')
      setIsDone(true)
      toast.success(`${successCount} demo users created successfully`)
    } catch (err) {
      log(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
      toast.error('Seed failed — check logs')
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/20">
              <Database className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>Seed Demo Data</CardTitle>
              <CardDescription>
                Create demo users for each role to test the application end-to-end
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Demo accounts table */}
          <div className="rounded-lg border">
            <div className="grid grid-cols-4 gap-2 border-b bg-muted/50 p-3 text-xs font-medium text-muted-foreground">
              <span>Name</span>
              <span>Email</span>
              <span>Role</span>
              <span>Password</span>
            </div>
            {DEMO_USERS.map((user) => (
              <div key={user.email} className="grid grid-cols-4 gap-2 border-b last:border-0 p-3 text-sm">
                <span className="font-medium">{user.first_name} {user.last_name}</span>
                <span className="text-muted-foreground text-xs">{user.email}</span>
                <span>
                  <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[user.role]}`}>
                    {user.role.replace('_', ' ')}
                  </Badge>
                </span>
                <span className="font-mono text-xs text-muted-foreground">{user.password}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <ShieldCheck className="h-4 w-4 flex-shrink-0" />
            <span>These are demo accounts with shared passwords. Do not use in production.</span>
          </div>

          <Button onClick={handleSeed} disabled={isSeeding || isDone} className="gap-2">
            {isSeeding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isDone ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Users className="h-4 w-4" />
            )}
            {isSeeding ? 'Creating users...' : isDone ? 'Demo data created' : 'Create Demo Users'}
          </Button>

          {/* Logs */}
          {logs.length > 0 && (
            <ScrollArea className="max-h-60 rounded-lg border bg-muted/30 p-3">
              <div className="space-y-1 font-mono text-xs">
                {logs.map((entry, i) => (
                  <div key={i} className="flex items-start gap-2">
                    {entry.type === 'success' && <CheckCircle2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-600" />}
                    {entry.type === 'error' && <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-red-600" />}
                    {entry.type === 'info' && <span className="mt-0.5 h-3 w-3 flex-shrink-0 text-blue-600">ℹ</span>}
                    <span className={
                      entry.type === 'error' ? 'text-red-600' :
                      entry.type === 'success' ? 'text-emerald-700' :
                      'text-muted-foreground'
                    }>
                      {entry.message}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

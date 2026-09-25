import { useState } from 'react'
import { Loader2, Users, CheckCircle2, AlertCircle, Database, ShieldCheck, Copy, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { toast } from 'sonner'
import { generateNextEmployeeCode } from '@/features/employees/api/employees.api'
import { useCreateLogin } from '@/features/auth/hooks/use-user-admin'
import { setLoginPassword } from '@/features/auth/api/user-admin.api'
import { humanizeLabel } from '@/lib/utils'

// ── Demo Users ────────────────────────────────────────────────────────
const DEMO_USERS = [
  {
    email: 'admin@pulsehrms.demo',
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

interface DemoCredential {
  email: string
  password: string
}

/**
 * A strong password for one demo login, shown once and not stored anywhere.
 *
 * These used to share a fixed password printed on the screen. That is fine on a
 * laptop and a bad idea on a deployed site — the set includes a super admin, so
 * anyone who found the URL could guess their way in. Each account now gets its
 * own, and the tester copies it when it is created.
 *
 * The alphabet leaves out characters that are easy to misread when copied by
 * hand, and the pattern satisfies the usual upper/lower/digit/symbol rule.
 */
function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const digits = '23456789'
  const symbols = '@#$%&*'

  const pick = (set: string, n: number) => {
    const bytes = new Uint32Array(n)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => set[b % set.length]).join('')
  }

  const chars = (
    pick(upper, 2) + pick(lower, 8) + pick(digits, 3) + pick(symbols, 2)
  ).split('')

  // Shuffle, so the shape of the password does not give away how it was built.
  const order = new Uint32Array(chars.length)
  crypto.getRandomValues(order)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = order[i] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

export function SeedDemoData() {
  const { organization } = useAuth()
  const [isSeeding, setIsSeeding] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isDone, setIsDone] = useState(false)
  const [credentials, setCredentials] = useState<DemoCredential[]>([])
  const [resetting, setResetting] = useState<string | null>(null)
  const createLogin = useCreateLogin()

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

  /**
   * Give one demo login a fresh password.
   *
   * These accounts use a made-up domain, so no email ever arrives and "Forgot
   * password" cannot rescue them. Without this, one mistyped character locks
   * the account away for good.
   */
  const handleReset = async (email: string) => {
    setResetting(email)
    try {
      const password = generatePassword()
      await setLoginPassword(email, password)
      setCredentials((prev) => {
        const rest = prev.filter((c) => c.email !== email)
        return [...rest, { email, password }]
      })
      toast.success('New password ready — copy it now')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reset the password')
    } finally {
      setResetting(null)
    }
  }

  const handleSeed = async () => {
    if (!organization) return
    setIsSeeding(true)
    setLogs([])
    setCredentials([])
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
          log(`  ${user.first_name} ${user.last_name} — already exists, skipped`, 'info')
          continue
        }

        // 1. The employee record comes first, so the login can be attached to it.
        const { data: employee, error: empError } = await supabase
          .from('employees')
          .insert({
            organization_id: organization.id,
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
          .select('id')
          .single()

        if (empError || !employee) {
          log(`  ${user.first_name} ${user.last_name} — could not create the employee record: ${empError?.message ?? 'unknown'}`, 'error')
          continue
        }

        // 2. Then the login, through the same edge function HR uses. It runs
        //    with the service role, so it neither needs self sign-up to be open
        //    nor disturbs the session of whoever pressed the button.
        const password = generatePassword()
        try {
          await createLogin.mutateAsync({
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            employee_id: employee.id,
            password,
          })
        } catch (err) {
          // Roll the employee row back rather than leaving one nobody can sign in as.
          await supabase.from('employees').delete().eq('id', employee.id)
          log(`  ${user.first_name} ${user.last_name} — login failed: ${err instanceof Error ? err.message : 'unknown'}`, 'error')
          continue
        }

        setCredentials((prev) => [...prev, { email: user.email, password }])

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
            <div className="grid grid-cols-[1fr_1.4fr_1fr_auto] gap-2 border-b bg-muted/50 p-3 text-xs font-medium text-muted-foreground">
              <span>Name</span>
              <span>Email</span>
              <span>Role</span>
              <span className="text-right">Password</span>
            </div>
            {DEMO_USERS.map((user) => (
              <div
                key={user.email}
                className="grid grid-cols-[1fr_1.4fr_1fr_auto] items-center gap-2 border-b p-3 text-sm last:border-0"
              >
                <span className="font-medium">{user.first_name} {user.last_name}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
                <span>
                  <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[user.role]}`}>
                    {humanizeLabel(user.role)}
                  </Badge>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={resetting === user.email}
                  onClick={() => handleReset(user.email)}
                >
                  {resetting === user.email ? (
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  ) : (
                    <KeyRound className="mr-1.5 h-3 w-3" />
                  )}
                  Reset
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              These are real logins on this database, one of them a super admin. Each gets its own
              password, shown once here and nowhere else — copy them before you leave the page.
              Remove the accounts when you are done testing.
            </span>
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

          {/* Shown once. Nothing stores these, so there is no way to get them back. */}
          {credentials.length > 0 && (
            <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-900/20">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                  Sign-in details — copy them now
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const text = credentials.map((c) => `${c.email}  ${c.password}`).join('\n')
                    navigator.clipboard.writeText(text)
                    toast.success('Copied all sign-in details')
                  }}
                >
                  <Copy className="mr-2 h-3.5 w-3.5" /> Copy all
                </Button>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                These are not saved anywhere, so they cannot be shown again once you leave this
                page. If you lose one, press Reset on that row for a fresh password — these
                accounts use a made-up email domain, so "Forgot password" will never reach them.
              </p>
              <div className="space-y-1">
                {credentials.map((c) => (
                  <div
                    key={c.email}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border bg-background px-2 py-1.5"
                  >
                    <span className="font-mono text-xs">{c.email}</span>
                    <span className="font-mono text-xs font-medium">{c.password}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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

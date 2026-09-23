import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Building2, CalendarDays, FileText, GraduationCap, LayoutDashboard, LogOut,
  Search, Settings as SettingsIcon, Target, UserRound, Users, Wallet, Workflow,
} from 'lucide-react'
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
  CommandSeparator, CommandShortcut,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import { useDepartments } from '@/features/departments/hooks/use-departments'
import { usePermissions } from '@/hooks/use-permissions'

/**
 * F45 — Global search.
 *
 * One box to reach any person or screen. Opens with Cmd+K on a Mac or Ctrl+K
 * elsewhere. With 14 modules and a growing employee list, hunting through the
 * sidebar is the slowest way to get anywhere.
 */

interface Page {
  title: string
  href: string
  icon: React.ElementType
  visible: boolean
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const permissions = usePermissions()

  const { data: employees } = useEmployees()
  const { data: departments } = useDepartments()

  // Cmd+K / Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const pages: Page[] = useMemo(
    () => [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, visible: true },
      { title: 'Employees', href: '/employees', icon: Users, visible: true },
      { title: 'Departments', href: '/departments', icon: Building2, visible: true },
      { title: 'Attendance', href: '/attendance', icon: CalendarDays, visible: true },
      { title: 'Leave', href: '/leave', icon: CalendarDays, visible: true },
      { title: 'Payroll', href: '/payroll', icon: Wallet, visible: permissions.canViewPayroll },
      { title: 'Performance', href: '/performance', icon: Target, visible: true },
      { title: 'Learning', href: '/learning', icon: GraduationCap, visible: true },
      { title: 'Recruitment', href: '/recruitment', icon: UserRound, visible: permissions.canManageRecruitment },
      { title: 'Self Service', href: '/self-service', icon: FileText, visible: true },
      { title: 'Separation', href: '/separation', icon: LogOut, visible: true },
      { title: 'Workflows', href: '/workflows', icon: Workflow, visible: permissions.canViewWorkflows },
      { title: 'Reports', href: '/reports', icon: FileText, visible: permissions.canViewReports },
      { title: 'Settings', href: '/settings', icon: SettingsIcon, visible: true },
    ],
    [permissions]
  )

  // Only search people once something is typed — showing all 50 on open is noise
  const matchedEmployees = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return (employees ?? [])
      .filter((e) => {
        const name = `${e.first_name} ${e.last_name}`.toLowerCase()
        return (
          name.includes(q) ||
          (e.employee_code ?? '').toLowerCase().includes(q) ||
          (e.email ?? '').toLowerCase().includes(q)
        )
      })
      .slice(0, 8)
  }, [employees, query])

  const matchedDepartments = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return (departments ?? []).filter((d) => d.name.toLowerCase().includes(q)).slice(0, 5)
  }, [departments, query])

  function go(fn: () => void) {
    setOpen(false)
    setQuery('')
    fn()
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-muted-foreground w-full justify-start gap-2 sm:w-56"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left text-sm">Search…</span>
        <kbd className="hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search people, departments or screens…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {query.trim().length < 2
              ? 'Type at least two letters to search people.'
              : 'Nothing found.'}
          </CommandEmpty>

          {matchedEmployees.length > 0 && (
            <CommandGroup heading="People">
              {matchedEmployees.map((e) => (
                <CommandItem
                  key={e.id}
                  value={`person-${e.first_name} ${e.last_name} ${e.employee_code ?? ''}`}
                  onSelect={() =>
                    go(() =>
                      navigate({ to: '/employees/$employeeId', params: { employeeId: e.id } })
                    )
                  }
                >
                  <UserRound className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">
                    {e.first_name} {e.last_name}
                  </span>
                  <span className="text-xs text-muted-foreground">{e.employee_code ?? ''}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {matchedDepartments.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Departments">
                {matchedDepartments.map((d) => (
                  <CommandItem
                    key={d.id}
                    value={`dept-${d.name}`}
                    onSelect={() => go(() => navigate({ to: '/departments' }))}
                  >
                    <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                    {d.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {(matchedEmployees.length > 0 || matchedDepartments.length > 0) && <CommandSeparator />}

          <CommandGroup heading="Go to">
            {pages
              .filter((p) => p.visible)
              .map((p) => (
                <CommandItem
                  key={p.href}
                  value={`page-${p.title}`}
                  onSelect={() => go(() => navigate({ to: p.href }))}
                >
                  <p.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {p.title}
                  {p.href === '/dashboard' && <CommandShortcut>Home</CommandShortcut>}
                </CommandItem>
              ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}

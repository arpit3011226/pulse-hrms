import { Link, useMatchRoute } from '@tanstack/react-router'
import {
  ChevronLeft,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PulseLogo, PulseLogoIcon } from '@/components/shared/pulse-logo'

// ── Colorful sidebar icons ──────────────────────────────────────────

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="2" fill="#818CF8" />
      <rect x="14" y="3" width="7" height="7" rx="2" fill="#34D399" />
      <rect x="3" y="14" width="7" height="7" rx="2" fill="#FBBF24" />
      <rect x="14" y="14" width="7" height="7" rx="2" fill="#F87171" />
    </svg>
  )
}

function EmployeesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="7" r="3.5" fill="#60A5FA" />
      <circle cx="16" cy="8" r="2.5" fill="#93C5FD" />
      <path d="M2 19c0-3.3 2.7-6 6-6h2c3.3 0 6 2.7 6 6v1H2v-1z" fill="#3B82F6" />
      <path d="M14 19c0-2.2 1.3-4.1 3.2-5 .3-.1.5-.1.8 0C19.7 14.9 21 16.8 21 19v1h-7v-1z" fill="#93C5FD" />
    </svg>
  )
}

function DepartmentsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="7" y="2" width="10" height="7" rx="1.5" fill="#A78BFA" />
      <rect x="1" y="15" width="8" height="7" rx="1.5" fill="#C4B5FD" />
      <rect x="15" y="15" width="8" height="7" rx="1.5" fill="#C4B5FD" />
      <path d="M12 9v3M12 12H5v3M12 12h7v3" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function LeaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="17" rx="2.5" fill="#FDE68A" />
      <rect x="3" y="4" width="18" height="5" rx="2.5" fill="#F59E0B" />
      <rect x="7" y="2" width="2" height="4" rx="1" fill="#D97706" />
      <rect x="15" y="2" width="2" height="4" rx="1" fill="#D97706" />
      <path d="M8.5 14.5l2 2 5-5" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AttendanceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" fill="#DBEAFE" />
      <circle cx="12" cy="12" r="9" stroke="#3B82F6" strokeWidth="1.5" />
      <path d="M12 7v5l3.5 3.5" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="1.5" fill="#2563EB" />
    </svg>
  )
}

function RecruitmentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="16" height="16" rx="2.5" fill="#FED7AA" />
      <rect x="8" y="2" width="8" height="4" rx="1.5" fill="#F97316" />
      <circle cx="12" cy="13" r="3" fill="#EA580C" />
      <path d="M12 10v6M9 13h6" stroke="#FFF" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function PayrollIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="2.5" fill="#D1FAE5" />
      <rect x="2" y="5" width="20" height="4" rx="2.5" fill="#10B981" />
      <circle cx="12" cy="15" r="3" fill="#059669" />
      <text x="12" y="17" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#FFF">$</text>
    </svg>
  )
}

function PerformanceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" fill="#FCE7F3" />
      <circle cx="12" cy="12" r="6" fill="#F9A8D4" />
      <circle cx="12" cy="12" r="3" fill="#EC4899" />
      <circle cx="12" cy="12" r="1" fill="#FFF" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" stroke="#DB2777" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function LearningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M12 3L2 8l10 5 10-5-10-5z" fill="#8B5CF6" />
      <path d="M4 10v6c0 1 3.6 4 8 4s8-3 8-4v-6" fill="#C4B5FD" />
      <path d="M4 10v6c0 1 3.6 4 8 4s8-3 8-4v-6" stroke="#7C3AED" strokeWidth="0.5" />
      <line x1="20" y1="8" x2="20" y2="16" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="20" cy="17" r="1" fill="#7C3AED" />
    </svg>
  )
}

function SelfServiceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2.5" fill="#DBEAFE" />
      <path d="M7 8h10M7 12h6" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="7" y="15" width="4" height="3" rx="0.5" fill="#2563EB" />
      <path d="M15 14l2 2 4-4" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SeparationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="2.5" fill="#FECDD3" />
      <path d="M9 20H5a2 2 0 01-2-2V6a2 2 0 012-2h4" stroke="#E11D48" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 8l4 4-4 4" stroke="#E11D48" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="19" y1="12" x2="10" y2="12" stroke="#E11D48" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ReportsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2.5" fill="#E0E7FF" />
      <rect x="6" y="13" width="3" height="5" rx="0.5" fill="#818CF8" />
      <rect x="10.5" y="9" width="3" height="9" rx="0.5" fill="#6366F1" />
      <rect x="15" y="6" width="3" height="12" rx="0.5" fill="#4F46E5" />
    </svg>
  )
}

function WorkflowsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2.5" fill="#FEF3C7" />
      <circle cx="8" cy="8" r="2" fill="#F59E0B" />
      <circle cx="16" cy="12" r="2" fill="#D97706" />
      <circle cx="8" cy="16" r="2" fill="#F59E0B" />
      <path d="M10 8h4l2 4-2 4H10" stroke="#B45309" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" fill="#6B7280" />
      <path d="M12 1.5l1.5 2.5h3l1 2.5-2 2 .5 3-2.5 1.5L12 15l-1.5-2-2.5-1.5.5-3-2-2 1-2.5h3L12 1.5z" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="0.5" />
      <circle cx="12" cy="12" r="3" fill="#6B7280" />
    </svg>
  )
}

function SignOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16,17 21,12 16,7" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="21" y1="12" x2="9" y2="12" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Component ────────────────────────────────────────────────────────

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  visible?: boolean
}

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { signOut } = useAuth()
  const permissions = usePermissions()
  const matchRoute = useMatchRoute()

  const { organization } = useAuth()
  const modules = (organization?.settings as Record<string, unknown> | undefined)?.modules as Record<string, boolean> | undefined
  const isModuleEnabled = (key: string) => modules?.[key] !== false

  const navItems: NavItem[] = [
    // Dashboard always first
    { title: 'Dashboard', href: '/dashboard', icon: DashboardIcon, visible: true },
    // Alphabetical order
    { title: 'Attendance', href: '/attendance', icon: AttendanceIcon, visible: isModuleEnabled('attendance') },
    { title: 'Departments', href: '/departments', icon: DepartmentsIcon, visible: true },
    { title: 'Employees', href: '/employees', icon: EmployeesIcon, visible: true },
    { title: 'Learning', href: '/learning', icon: LearningIcon, visible: isModuleEnabled('learning') },
    { title: 'Leave', href: '/leave', icon: LeaveIcon, visible: isModuleEnabled('leave') },
    { title: 'Payroll', href: '/payroll', icon: PayrollIcon, visible: permissions.canViewPayroll && isModuleEnabled('payroll') },
    { title: 'Performance', href: '/performance', icon: PerformanceIcon, visible: isModuleEnabled('performance') },
    { title: 'Recruitment', href: '/recruitment', icon: RecruitmentIcon, visible: permissions.canManageRecruitment && isModuleEnabled('recruitment') },
    { title: 'Self Service', href: '/self-service', icon: SelfServiceIcon, visible: true },
    { title: 'Separation', href: '/separation', icon: SeparationIcon, visible: true },
    { title: 'Workflows', href: '/workflows', icon: WorkflowsIcon, visible: permissions.canViewWorkflows },
    // Reports always last
    { title: 'Reports', href: '/reports', icon: ReportsIcon, visible: permissions.canViewReports },
  ]

  const bottomItems: NavItem[] = [
    { title: 'Settings', href: '/settings', icon: SettingsIcon, visible: true },
  ]

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = matchRoute({ to: item.href, fuzzy: true })

    const link = (
      <Link
        to={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary/10 text-primary font-semibold'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
          !sidebarOpen && 'justify-center px-2'
        )}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {sidebarOpen && <span>{item.title}</span>}
      </Link>
    )

    if (!sidebarOpen) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right">{item.title}</TooltipContent>
        </Tooltip>
      )
    }

    return link
  }

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r bg-sidebar transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Header */}
      <div className={cn('flex h-16 items-center border-b px-4', !sidebarOpen && 'justify-center px-2')}>
        {sidebarOpen ? (
          <PulseLogo size="sm" />
        ) : (
          <PulseLogoIcon className="h-7 w-7" />
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems
            .filter((item) => item.visible)
            .map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
        </nav>
      </ScrollArea>

      {/* Bottom */}
      <div className="border-t px-3 py-3">
        <nav className="space-y-1">
          {bottomItems
            .filter((item) => item.visible)
            .map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
        </nav>
        <Separator className="my-2" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn('w-full justify-start gap-3 text-muted-foreground hover:text-red-500', !sidebarOpen && 'justify-center px-2')}
              onClick={() => signOut()}
            >
              <SignOutIcon className="h-5 w-5" />
              {sidebarOpen && <span>Sign out</span>}
            </Button>
          </TooltipTrigger>
          {!sidebarOpen && <TooltipContent side="right">Sign out</TooltipContent>}
        </Tooltip>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-secondary"
      >
        <ChevronLeft className={cn('h-3 w-3 transition-transform', !sidebarOpen && 'rotate-180')} />
      </button>
    </aside>
  )
}

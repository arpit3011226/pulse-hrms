import { Link, useMatchRoute } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  Clock,
  Briefcase,
  DollarSign,
  Target,
  GraduationCap,
  BarChart3,
  Settings,
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
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, visible: true },
    { title: 'Employees', href: '/employees', icon: Users, visible: true },
    { title: 'Departments', href: '/departments', icon: Building2, visible: true },
    { title: 'Leave', href: '/leave', icon: CalendarDays, visible: isModuleEnabled('leave') },
    { title: 'Attendance', href: '/attendance', icon: Clock, visible: isModuleEnabled('attendance') },
    { title: 'Recruitment', href: '/recruitment', icon: Briefcase, visible: permissions.canManageRecruitment && isModuleEnabled('recruitment') },
    { title: 'Payroll', href: '/payroll', icon: DollarSign, visible: permissions.canViewPayroll && isModuleEnabled('payroll') },
    { title: 'Performance', href: '/performance', icon: Target, visible: isModuleEnabled('performance') },
    { title: 'Learning', href: '/learning', icon: GraduationCap, visible: isModuleEnabled('learning') },
    { title: 'Reports', href: '/reports', icon: BarChart3, visible: permissions.canViewReports },
  ]

  const bottomItems: NavItem[] = [
    { title: 'Settings', href: '/settings', icon: Settings, visible: true },
  ]

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = matchRoute({ to: item.href, fuzzy: true })

    const link = (
      <Link
        to={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary/15 text-primary'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
          !sidebarOpen && 'justify-center px-2'
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
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
              className={cn('w-full justify-start gap-3 text-muted-foreground', !sidebarOpen && 'justify-center px-2')}
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
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

import {
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
  Navigate,
  useLocation,
} from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { LoginForm } from '@/features/auth/components/login-form'
import { SignupForm } from '@/features/auth/components/signup-form'
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form'
import { OnboardingForm } from '@/features/auth/components/onboarding-form'
import { EmployeeList } from '@/features/employees/components/employee-list'
import { EmployeeUnifiedView } from '@/features/employees/components/employee-unified-view'
import { EmployeeFormPage } from '@/features/employees/components/employee-form-page'
import { DepartmentList } from '@/features/departments/components/department-list'
import { LeavePage } from '@/features/leave/components/leave-page'
import { AttendancePage } from '@/features/attendance/components/attendance-page'
import { PayrollPage } from '@/features/payroll/components/payroll-page'
import { PerformancePage } from '@/features/performance/components/performance-page'
import { RecruitmentPage } from '@/features/recruitment/components/recruitment-page'
import { LearningPage } from '@/features/learning/components/learning-page'
import { ReportsPage } from '@/features/reports/components/reports-page'
import { ResignationPage } from '@/features/resignation/components/resignation-page'
import { SettingsPage } from '@/features/settings/components/settings-page'
import { DashboardStats } from '@/features/dashboard/components/dashboard-stats'
import { RecentActivity } from '@/features/dashboard/components/recent-activity'
import { QuickActions } from '@/features/dashboard/components/quick-actions'
import { PageHeader } from '@/components/layout/page-header'
import { AuthBackground } from '@/components/shared/auth-background'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useDashboardStats, useRecentActivity } from '@/features/dashboard/hooks/use-dashboard'
import { Loader2 } from 'lucide-react'

// Root
const rootRoute = createRootRoute({ component: Outlet })

// Auth layout — redirects authenticated users to dashboard
function AuthLayout() {
  const { session, isLoading, profile } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // If logged in and has org, go to dashboard
  if (session && profile?.organization_id) {
    return <Navigate to="/dashboard" />
  }

  // If logged in but no org, redirect to onboarding (unless already there)
  if (session && profile && !profile.organization_id && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" />
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      <AuthBackground />
      <div className="relative z-10 flex flex-1 items-center justify-center p-4">
        <Outlet />
      </div>
      <footer className="relative z-10 flex items-center justify-between px-6 py-4 text-xs text-muted-foreground">
        <span>&copy; {new Date().getFullYear()} | Augustinnovate Pvt. Ltd.</span>
        <a
          href="https://madewithloveinindia.org"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-opacity hover:opacity-80"
        >
          Made with <span aria-label="Love" style={{ color: '#f43f5e' }}>&hearts;</span> in India
        </a>
      </footer>
    </div>
  )
}

const authRoute = createRoute({ getParentRoute: () => rootRoute, id: 'auth', component: AuthLayout })
const loginRoute = createRoute({ getParentRoute: () => authRoute, path: '/login', component: LoginForm })
const signupRoute = createRoute({ getParentRoute: () => authRoute, path: '/signup', component: SignupForm })
const forgotPasswordRoute = createRoute({ getParentRoute: () => authRoute, path: '/forgot-password', component: ForgotPasswordForm })
const onboardingRoute = createRoute({ getParentRoute: () => authRoute, path: '/onboarding', component: OnboardingForm })

// App layout (protected)
const appRoute = createRoute({ getParentRoute: () => rootRoute, id: 'app', component: AppLayout })

// Dashboard
function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: activities } = useRecentActivity()

  return (
    <div>
      <PageHeader title="Dashboard" description="Welcome back! Here's an overview of your organization." />
      <DashboardStats stats={stats} isLoading={statsLoading} />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <RecentActivity activities={activities ?? []} />
        <QuickActions />
      </div>
    </div>
  )
}

const dashboardRoute = createRoute({ getParentRoute: () => appRoute, path: '/dashboard', component: DashboardPage })
const employeesRoute = createRoute({ getParentRoute: () => appRoute, path: '/employees', component: EmployeeList })

const employeeNewRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/employees/new',
  component: function NewEmployeePage() {
    return <EmployeeFormPage />
  },
})

const employeeDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/employees/$employeeId',
  component: function EmployeeDetailPage() {
    const { employeeId } = employeeDetailRoute.useParams()
    return <EmployeeUnifiedView employeeId={employeeId} />
  },
})

const employeeEditRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/employees/$employeeId/edit',
  component: function EditEmployeePage() {
    const { employeeId } = employeeEditRoute.useParams()
    return <EmployeeFormPage employeeId={employeeId} />
  },
})

const departmentsRoute = createRoute({ getParentRoute: () => appRoute, path: '/departments', component: DepartmentList })


const leaveRoute = createRoute({ getParentRoute: () => appRoute, path: '/leave', component: LeavePage })
const attendanceRoute = createRoute({ getParentRoute: () => appRoute, path: '/attendance', component: AttendancePage })
const recruitmentRoute = createRoute({ getParentRoute: () => appRoute, path: '/recruitment', component: RecruitmentPage })
const payrollRoute = createRoute({ getParentRoute: () => appRoute, path: '/payroll', component: PayrollPage })
const performanceRoute = createRoute({ getParentRoute: () => appRoute, path: '/performance', component: PerformancePage })
const learningRoute = createRoute({ getParentRoute: () => appRoute, path: '/learning', component: LearningPage })
const separationRoute = createRoute({ getParentRoute: () => appRoute, path: '/separation', component: ResignationPage })
const reportsRoute = createRoute({ getParentRoute: () => appRoute, path: '/reports', component: ReportsPage })
const settingsRoute = createRoute({ getParentRoute: () => appRoute, path: '/settings', component: SettingsPage })

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <Navigate to="/login" />,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  authRoute.addChildren([loginRoute, signupRoute, forgotPasswordRoute, onboardingRoute]),
  appRoute.addChildren([
    dashboardRoute,
    employeesRoute,
    employeeNewRoute,
    employeeDetailRoute,
    employeeEditRoute,
    departmentsRoute,
    leaveRoute,
    attendanceRoute,
    recruitmentRoute,
    payrollRoute,
    performanceRoute,
    learningRoute,
    separationRoute,
    reportsRoute,
    settingsRoute,
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

import { useMemo } from 'react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/constants'
import type { PermissionKey } from '@/lib/constants'
import type { OrganizationSettings } from '@/types/database.types'

export function usePermissions() {
  const { profile, organization } = useAuth()
  const role = profile?.role

  const perms = useMemo(() => {
    if (!role) return [] as PermissionKey[]

    // Super admin always has all permissions
    if (role === 'super_admin') return DEFAULT_ROLE_PERMISSIONS.super_admin

    // Check org-level saved permissions first, fallback to defaults
    const saved = (organization?.settings as Partial<OrganizationSettings> | undefined)?.role_permissions
    if (saved && saved[role]) return saved[role] as PermissionKey[]

    return (DEFAULT_ROLE_PERMISSIONS[role] ?? []) as PermissionKey[]
  }, [role, organization?.settings])

  const has = useMemo(() => {
    const set = new Set<string>(perms)
    return (key: PermissionKey) => set.has(key)
  }, [perms])

  return {
    // Granular permission checks (read from DB)
    canViewEmployees: has('view_employees'),
    canManageEmployees: has('add_employees') || has('edit_employees'),
    canApproveLeave: has('approve_leave'),
    canManageLeaveTypes: has('manage_leave_types'),
    canViewLeaveReports: has('view_leave_reports'),
    canManageLeavePolicies: has('manage_leave_types'), // same permission covers policies
    canViewPayroll: has('view_payroll'),
    canManagePayroll: has('manage_payroll'),
    canManageRecruitment: has('manage_recruitment'),
    canViewCandidates: has('view_candidates') || has('manage_recruitment'),
    canManageSettings: role === 'super_admin' || has('manage_settings'),
    canManageDepartments: has('manage_departments'),
    canViewReports: has('view_reports') || has('export_reports'),
    canExportReports: has('export_reports'),
    canViewAttendance: has('view_attendance'),
    canManageAttendance: has('manage_attendance'),
    canManageShifts: has('manage_shifts'),
    canManageRoles: role === 'super_admin' || has('manage_roles'),
    canManageEmployeeDocuments: has('edit_employees'),
    canInitiateExit: role === 'super_admin' || role === 'hr_admin' || role === 'manager' || role === 'leadership',
    canManageWorkProfiles: role === 'super_admin' || role === 'hr_admin',
    canViewPerformance: has('view_performance'),
    canManagePerformance: has('manage_performance'),
    canViewLearning: has('view_learning') || has('manage_learning'),
    canManageLearning: has('manage_learning'),

    // Resignation / Separation
    canSubmitResignation: role === 'employee' || role === 'manager' || role === 'leadership',
    canApproveResignationAsManager: role === 'manager' || role === 'leadership' || role === 'super_admin' || role === 'hr_admin',
    canApproveResignationAsHR: role === 'hr_admin' || role === 'super_admin',
    canManageClearances: role === 'hr_admin' || role === 'super_admin',

    // Self Service / Letters
    canManageLetterTemplates: role === 'super_admin' || role === 'hr_admin',
    canGenerateHRLetters: role === 'super_admin' || role === 'hr_admin',
    canApproveLettersAsManager: role === 'manager' || role === 'leadership' || role === 'super_admin' || role === 'hr_admin',
    canApproveLettersAsHR: role === 'hr_admin' || role === 'super_admin',

    // Reimbursements
    canApproveReimbursementsAsManager: role === 'manager' || role === 'leadership' || role === 'super_admin' || role === 'hr_admin',
    canApproveReimbursementsAsFinance: role === 'payroll_admin' || role === 'super_admin',

    // General Requests
    canApproveGeneralRequestsAsManager: role === 'manager' || role === 'leadership' || role === 'super_admin' || role === 'hr_admin',
    canApproveGeneralRequestsAsHR: role === 'hr_admin' || role === 'super_admin',

    // Role shortcuts
    isAdmin: role === 'super_admin',
    isHR: role === 'hr_admin',
    isPayrollAdmin: role === 'payroll_admin',
    isManager: role === 'manager',
    isLeadership: role === 'leadership',
    isEmployee: role === 'employee',
    role,

    // Generic permission checker
    hasPermission: has,
  }
}

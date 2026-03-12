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
    canViewPayroll: has('view_payroll'),
    canManagePayroll: has('manage_payroll'),
    canManageRecruitment: has('manage_recruitment'),
    canManageSettings: role === 'super_admin' || has('manage_settings'),
    canManageDepartments: has('manage_departments'),
    canViewReports: has('view_reports'),
    canManageRoles: role === 'super_admin' || has('manage_roles'),

    // Role shortcuts
    isAdmin: role === 'super_admin',
    isHR: role === 'hr_admin',
    isPayrollAdmin: role === 'payroll_admin',
    isManager: role === 'manager',
    isEmployee: role === 'employee',
    role,

    // Generic permission checker
    hasPermission: has,
  }
}

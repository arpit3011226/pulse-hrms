import { useMemo } from 'react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { DEFAULT_ROLE_PERMISSIONS, DEFAULT_ROLE_PERMISSION_LEVELS } from '@/lib/constants'
import type { PermissionKey } from '@/lib/constants'
import type { OrganizationSettings, PermissionLevel, RolePermissionLevels } from '@/types/database.types'

/**
 * Get the 3-level permission map for a given role.
 * Priority: org-saved levels → default levels
 */
function getRoleLevels(
  role: string,
  orgSettings: Partial<OrganizationSettings> | undefined
): RolePermissionLevels {
  // Super admin always gets everything
  if (role === 'super_admin') return DEFAULT_ROLE_PERMISSION_LEVELS.super_admin

  // Try new 3-level format first
  const savedLevels = orgSettings?.role_permission_levels
  if (savedLevels && savedLevels[role] && Object.keys(savedLevels[role]).length > 0) {
    return savedLevels[role] as RolePermissionLevels
  }

  // Fall back to default 3-level permissions
  return (DEFAULT_ROLE_PERMISSION_LEVELS[role] ?? {}) as RolePermissionLevels
}

/** Check if a feature key has at least 'read' access */
function canRead(levels: RolePermissionLevels, key: string): boolean {
  const l = levels[key]
  return l === 'read' || l === 'manage'
}

/** Check if a feature key has 'manage' access */
function canManage(levels: RolePermissionLevels, key: string): boolean {
  return levels[key] === 'manage'
}

export function usePermissions() {
  const { profile, organization } = useAuth()
  const role = profile?.role

  // Legacy boolean perms (backward compat for old format)
  const legacyPerms = useMemo(() => {
    if (!role) return [] as PermissionKey[]
    if (role === 'super_admin') return DEFAULT_ROLE_PERMISSIONS.super_admin
    const saved = (organization?.settings as Partial<OrganizationSettings> | undefined)?.role_permissions
    if (saved && saved[role]) return saved[role] as PermissionKey[]
    return (DEFAULT_ROLE_PERMISSIONS[role] ?? []) as PermissionKey[]
  }, [role, organization?.settings])

  // New 3-level permission levels
  const levels = useMemo(() => {
    if (!role) return {} as RolePermissionLevels
    return getRoleLevels(role, organization?.settings as Partial<OrganizationSettings> | undefined)
  }, [role, organization?.settings])

  // Check if org has the new 3-level format saved
  const hasNewFormat = useMemo(() => {
    const saved = (organization?.settings as Partial<OrganizationSettings> | undefined)?.role_permission_levels
    return saved && Object.keys(saved).length > 0
  }, [organization?.settings])

  const legacyHas = useMemo(() => {
    const set = new Set<string>(legacyPerms)
    return (key: PermissionKey) => set.has(key)
  }, [legacyPerms])

  return useMemo(() => {
    // If new format exists, derive permissions from 3-level system
    // Otherwise fall back to legacy boolean system
    const useNew = hasNewFormat

    return {
      // ── Employee Management ──
      canViewEmployees: useNew ? canRead(levels, 'employees_directory') : legacyHas('view_employees'),
      canManageEmployees: useNew
        ? canManage(levels, 'employees_directory')
        : legacyHas('add_employees') || legacyHas('edit_employees'),

      // ── Leave ──
      canApproveLeave: useNew ? canManage(levels, 'leave_requests') : legacyHas('approve_leave'),
      canManageLeaveTypes: useNew ? canManage(levels, 'leave_types') : legacyHas('manage_leave_types'),
      canViewLeaveReports: useNew ? canRead(levels, 'leave_reports') : legacyHas('view_leave_reports'),
      canManageLeavePolicies: useNew ? canManage(levels, 'leave_types') : legacyHas('manage_leave_types'),

      // ── Payroll ──
      canViewPayroll: useNew ? canRead(levels, 'payroll_processing') : legacyHas('view_payroll'),
      canManagePayroll: useNew ? canManage(levels, 'payroll_processing') : legacyHas('manage_payroll'),

      // ── Recruitment ──
      canManageRecruitment: useNew ? canManage(levels, 'recruitment_jobs') : legacyHas('manage_recruitment'),
      canViewCandidates: useNew
        ? canRead(levels, 'recruitment_applications')
        : legacyHas('view_candidates') || legacyHas('manage_recruitment'),

      // ── Settings ──
      canManageSettings: role === 'super_admin' || (useNew ? canManage(levels, 'org_settings') : legacyHas('manage_settings')),
      canManageDepartments: useNew ? canManage(levels, 'org_departments') : legacyHas('manage_departments'),

      // ── Reports ──
      canViewReports: useNew
        ? canRead(levels, 'payroll_reports') || canRead(levels, 'leave_reports')
        : legacyHas('view_reports') || legacyHas('export_reports'),
      canExportReports: useNew
        ? canManage(levels, 'payroll_reports')
        : legacyHas('export_reports'),

      // ── Attendance ──
      canViewAttendance: useNew ? canRead(levels, 'attendance_records') : legacyHas('view_attendance'),
      canManageAttendance: useNew ? canManage(levels, 'attendance_records') : legacyHas('manage_attendance'),
      canManageShifts: useNew ? canManage(levels, 'attendance_shifts') : legacyHas('manage_shifts'),

      // ── Roles ──
      canManageRoles: role === 'super_admin' || (useNew ? canManage(levels, 'org_roles') : legacyHas('manage_roles')),

      // ── Documents ──
      canManageEmployeeDocuments: useNew ? canManage(levels, 'employees_documents') : legacyHas('edit_employees'),

      // ── Work Profiles ──
      canInitiateExit: role === 'super_admin' || role === 'hr_admin' || role === 'manager' || role === 'leadership',
      canManageWorkProfiles: role === 'super_admin' || role === 'hr_admin',

      // ── Performance ──
      canViewPerformance: useNew ? canRead(levels, 'performance_reviews') : legacyHas('view_performance'),
      canManagePerformance: useNew ? canManage(levels, 'performance_reviews') : legacyHas('manage_performance'),


      // ── Resignation / Separation ──
      canSubmitResignation: role === 'employee' || role === 'manager' || role === 'leadership',
      canApproveResignationAsManager: role === 'manager' || role === 'leadership' || role === 'super_admin' || role === 'hr_admin',
      canApproveResignationAsHR: role === 'hr_admin' || role === 'super_admin',
      canManageClearances: useNew ? canManage(levels, 'separation_clearances') : role === 'hr_admin' || role === 'super_admin',

      // ── Self Service / Letters ──
      canManageLetterTemplates: useNew
        ? canManage(levels, 'self_service_letters')
        : role === 'super_admin' || role === 'hr_admin',
      canGenerateHRLetters: useNew
        ? canManage(levels, 'self_service_letters')
        : role === 'super_admin' || role === 'hr_admin',
      canApproveLettersAsManager: role === 'manager' || role === 'leadership' || role === 'super_admin' || role === 'hr_admin',
      canApproveLettersAsHR: role === 'hr_admin' || role === 'super_admin',

      // ── Reimbursements ──
      canApproveReimbursementsAsManager: role === 'manager' || role === 'leadership' || role === 'super_admin' || role === 'hr_admin',
      canApproveReimbursementsAsFinance: role === 'payroll_admin' || role === 'super_admin',

      // ── General Requests ──
      canApproveGeneralRequestsAsManager: role === 'manager' || role === 'leadership' || role === 'super_admin' || role === 'hr_admin',
      canApproveGeneralRequestsAsHR: role === 'hr_admin' || role === 'super_admin',

      // ── Workflows ──
      canViewWorkflows: useNew ? canRead(levels, 'workflows_management') : role === 'super_admin' || role === 'hr_admin' || role === 'leadership',
      canManageWorkflows: useNew ? canManage(levels, 'workflows_management') : role === 'super_admin' || role === 'hr_admin',

      // ── Role shortcuts ──
      isAdmin: role === 'super_admin',
      isHR: role === 'hr_admin',
      isPayrollAdmin: role === 'payroll_admin',
      isManager: role === 'manager',
      isLeadership: role === 'leadership',
      isEmployee: role === 'employee',
      // Neither of these is a member of staff. They sign in to see their own
      // records and nothing else, so the navigation is built for them separately.
      isCandidate: role === 'candidate',
      isAlumni: role === 'alumni',
      role,

      // ── Generic permission checkers ──
      hasPermission: legacyHas,

      /** Get the 3-level access for a feature key */
      getFeatureLevel: (key: string): PermissionLevel => levels[key] ?? 'no_access',

      /** Check if a feature has at least read access */
      canReadFeature: (key: string) => canRead(levels, key),

      /** Check if a feature has manage access */
      canManageFeature: (key: string) => canManage(levels, key),
    }
  }, [role, levels, hasNewFormat, legacyHas])
}

import type { OrganizationSettings } from '@/types/database.types'

export const APP_NAME = 'Pulse'

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  HR_ADMIN: 'hr_admin',
  PAYROLL_ADMIN: 'payroll_admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
} as const

export type AppRole = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  hr_admin: 'HR Admin',
  payroll_admin: 'Payroll Admin',
  manager: 'Manager',
  employee: 'Employee',
}

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin: 'Full system access. Can configure organization settings, manage all modules, and assign roles.',
  hr_admin: 'Manages employees, departments, leave, attendance, recruitment, and reporting.',
  payroll_admin: 'Dedicated access to payroll processing, employee compensation data, and payroll reports.',
  manager: 'Approves leave requests and views reports for their team.',
  employee: 'Self-service access to own profile, leave applications, and attendance.',
}

export const DEFAULT_ORG_SETTINGS: OrganizationSettings = {
  modules: {
    leave: true,
    attendance: true,
    payroll: true,
    recruitment: true,
    performance: true,
    learning: true,
  },
  working_days: [1, 2, 3, 4, 5],
  date_format: 'DD/MM/YYYY',
  default_probation_months: 6,
  default_notice_days: 30,
  week_start_day: 1,
}

export const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
] as const

export const EMPLOYEE_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'on_notice', label: 'On Notice' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'resigned', label: 'Resigned' },
  { value: 'on_leave', label: 'On Leave' },
] as const

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
] as const

export const MARITAL_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
] as const

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

export const LEAVE_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

export const ATTENDANCE_STATUSES = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'weekend', label: 'Weekend' },
] as const

export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'America/New_York', label: 'America/New York (EST)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST)' },
  { value: 'America/Denver', label: 'America/Denver (MST)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (PST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST)' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (NZST)' },
] as const

export const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'AED', label: 'AED - UAE Dirham' },
  { value: 'SGD', label: 'SGD - Singapore Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
] as const

// Permission categories and their individual permissions
export const PERMISSION_CATEGORIES = [
  {
    key: 'employees',
    label: 'Employee Management',
    permissions: [
      { key: 'view_employees', label: 'View employee directory and profiles' },
      { key: 'add_employees', label: 'Add new employees' },
      { key: 'edit_employees', label: 'Edit employee details' },
      { key: 'delete_employees', label: 'Delete / archive employees' },
    ],
  },
  {
    key: 'leave',
    label: 'Leave Management',
    permissions: [
      { key: 'approve_leave', label: 'Approve or reject leave requests' },
      { key: 'view_leave_reports', label: 'View leave reports and balances' },
      { key: 'manage_leave_types', label: 'Create and edit leave types' },
    ],
  },
  {
    key: 'payroll',
    label: 'Payroll & Compensation',
    permissions: [
      { key: 'view_payroll', label: 'View payroll data and payslips' },
      { key: 'manage_payroll', label: 'Process salary and manage compensation' },
      { key: 'export_payroll', label: 'Export payroll reports' },
    ],
  },
  {
    key: 'attendance',
    label: 'Attendance',
    permissions: [
      { key: 'view_attendance', label: 'View attendance records' },
      { key: 'manage_attendance', label: 'Edit attendance and regularize entries' },
      { key: 'manage_shifts', label: 'Create and manage shifts' },
    ],
  },
  {
    key: 'recruitment',
    label: 'Recruitment',
    permissions: [
      { key: 'manage_recruitment', label: 'Manage job postings and hiring pipeline' },
      { key: 'view_candidates', label: 'View candidate applications' },
    ],
  },
  {
    key: 'departments',
    label: 'Departments & Designations',
    permissions: [
      { key: 'manage_departments', label: 'Create and edit departments' },
      { key: 'manage_designations', label: 'Create and edit designations' },
    ],
  },
  {
    key: 'reports',
    label: 'Reports & Analytics',
    permissions: [
      { key: 'view_reports', label: 'View organization reports' },
      { key: 'export_reports', label: 'Export reports to CSV / PDF' },
    ],
  },
  {
    key: 'settings',
    label: 'System Settings',
    permissions: [
      { key: 'manage_settings', label: 'Manage organization settings' },
      { key: 'manage_roles', label: 'Edit roles and permissions' },
    ],
  },
] as const

export type PermissionKey = (typeof PERMISSION_CATEGORIES)[number]['permissions'][number]['key']

// Default permissions for each role
export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  super_admin: PERMISSION_CATEGORIES.flatMap((c) => c.permissions.map((p) => p.key)) as unknown as PermissionKey[],
  hr_admin: [
    'view_employees', 'add_employees', 'edit_employees',
    'approve_leave', 'view_leave_reports', 'manage_leave_types',
    'view_payroll',
    'view_attendance', 'manage_attendance', 'manage_shifts',
    'manage_recruitment', 'view_candidates',
    'manage_departments', 'manage_designations',
    'view_reports', 'export_reports',
  ],
  payroll_admin: [
    'view_employees',
    'view_payroll', 'manage_payroll', 'export_payroll',
    'view_reports',
  ],
  manager: [
    'view_employees',
    'approve_leave', 'view_leave_reports',
    'view_attendance',
    'view_candidates',
    'view_reports',
  ],
  employee: [],
}

export const DATE_FORMAT_OPTIONS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
] as const

export const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
] as const

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
] as const

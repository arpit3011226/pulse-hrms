import type { OrganizationSettings } from '@/types/database.types'

export const APP_NAME = 'Pulse'

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  HR_ADMIN: 'hr_admin',
  PAYROLL_ADMIN: 'payroll_admin',
  MANAGER: 'manager',
  LEADERSHIP: 'leadership',
  EMPLOYEE: 'employee',
} as const

export type AppRole = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  hr_admin: 'HR Admin',
  payroll_admin: 'Payroll Admin',
  manager: 'Manager',
  leadership: 'Leadership',
  employee: 'Employee',
}

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin: 'Full system access. Can configure organization settings, manage all modules, and assign roles.',
  hr_admin: 'Manages employees, departments, leave, attendance, recruitment, and reporting.',
  payroll_admin: 'Dedicated access to payroll processing, employee compensation data, and payroll reports.',
  manager: 'Approves leave requests and views reports for their team.',
  leadership: 'Executive-level access to view employees, performance, reports, and organizational analytics.',
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
    key: 'performance',
    label: 'Performance Management',
    permissions: [
      { key: 'view_performance', label: 'View performance reviews and goals' },
      { key: 'manage_performance', label: 'Manage performance cycles and reviews' },
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
    key: 'learning',
    label: 'Learning & Development',
    permissions: [
      { key: 'manage_learning', label: 'Manage courses, enrollments, and assessments' },
      { key: 'view_learning', label: 'View training catalog and enrollments' },
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
    'view_performance', 'manage_performance',
    'manage_recruitment', 'view_candidates',
    'manage_learning', 'view_learning',
    'manage_departments', 'manage_designations',
    'view_reports', 'export_reports',
  ],
  payroll_admin: [
    'view_employees',
    'view_payroll', 'manage_payroll', 'export_payroll',
    'view_performance',
    'view_reports',
  ],
  manager: [
    'view_employees',
    'approve_leave', 'view_leave_reports',
    'view_attendance',
    'view_performance',
    'view_candidates',
    'view_learning',
    'view_reports',
  ],
  leadership: [
    'view_employees',
    'view_leave_reports',
    'view_payroll',
    'view_attendance',
    'view_performance',
    'view_candidates',
    'view_learning',
    'view_reports', 'export_reports',
  ],
  employee: [],
}

export const HALF_DAY_OPTIONS = [
  { value: 'first_half', label: 'First Half' },
  { value: 'second_half', label: 'Second Half' },
] as const

export const HOLIDAY_TYPES = [
  { value: 'public', label: 'Public Holiday' },
  { value: 'restricted', label: 'Restricted Holiday' },
  { value: 'company', label: 'Company Holiday' },
] as const

export const ACCRUAL_TYPES = [
  { value: 'yearly', label: 'Yearly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
] as const

export const DAY_TYPES = [
  { value: 'full', label: 'Full Day' },
  { value: 'first_half', label: 'First Half' },
  { value: 'second_half', label: 'Second Half' },
] as const

export const ENCASHMENT_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'processed', label: 'Processed' },
] as const

export const REGULARIZATION_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
] as const

// Employee Lifecycle constants
export const EMPLOYEE_STATUSES_EXTENDED = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'on_notice', label: 'On Notice' },
  { value: 'resigned', label: 'Resigned' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'absconding', label: 'Absconding' },
  { value: 'retired', label: 'Retired' },
  { value: 'inactive', label: 'Inactive' },
] as const

export const EXIT_TYPES = [
  { value: 'resignation', label: 'Resignation' },
  { value: 'termination', label: 'Termination' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'absconding', label: 'Absconding' },
  { value: 'contract_end', label: 'Contract End' },
  { value: 'mutual_separation', label: 'Mutual Separation' },
] as const

export const EXIT_STATUSES = [
  { value: 'initiated', label: 'Initiated' },
  { value: 'notice_period', label: 'Notice Period' },
  { value: 'clearance_pending', label: 'Clearance Pending' },
  { value: 'clearance_completed', label: 'Clearance Completed' },
  { value: 'completed', label: 'Completed' },
  { value: 'withdrawn', label: 'Withdrawn' },
] as const

export const ADDRESS_TYPES = [
  { value: 'permanent', label: 'Permanent Address' },
  { value: 'current', label: 'Current Address' },
  { value: 'emergency', label: 'Emergency Address' },
] as const

export const IDENTITY_DOCUMENT_TYPES = [
  { value: 'pan', label: 'PAN Card' },
  { value: 'aadhar', label: 'Aadhar Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'voter_id', label: 'Voter ID' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'other', label: 'Other' },
] as const

export const RELATIONSHIP_TYPES = [
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'son', label: 'Son' },
  { value: 'daughter', label: 'Daughter' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'other', label: 'Other' },
] as const

export const BANK_ACCOUNT_TYPES = [
  { value: 'savings', label: 'Savings' },
  { value: 'current', label: 'Current' },
] as const

export const VERIFICATION_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
] as const

export const NOMINEE_APPLICABLE_FOR = [
  { value: 'pf', label: 'Provident Fund' },
  { value: 'gratuity', label: 'Gratuity' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'pension', label: 'Pension' },
  { value: 'all', label: 'All' },
] as const

export const ORG_CHANGE_TYPES = [
  { value: 'promotion', label: 'Promotion' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'redesignation', label: 'Redesignation' },
  { value: 'manager_change', label: 'Manager Change' },
] as const

export const DOCUMENT_CATEGORIES = [
  { value: 'offer_letter', label: 'Offer Letter' },
  { value: 'appointment_letter', label: 'Appointment Letter' },
  { value: 'experience_letter', label: 'Experience Letter' },
  { value: 'payslip', label: 'Payslip' },
  { value: 'tax_document', label: 'Tax Document' },
  { value: 'policy_acknowledgement', label: 'Policy Acknowledgement' },
  { value: 'training_certificate', label: 'Training Certificate' },
  { value: 'performance_review', label: 'Performance Review' },
  { value: 'other', label: 'Other' },
] as const

export const SALUTATION_OPTIONS = [
  { value: 'Mr', label: 'Mr.' },
  { value: 'Mrs', label: 'Mrs.' },
  { value: 'Ms', label: 'Ms.' },
  { value: 'Dr', label: 'Dr.' },
] as const

export const CLEARANCE_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
] as const

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

// ============================================================================
// Payroll & Compensation Constants
// ============================================================================

export const SALARY_COMPONENT_TYPES = [
  { value: 'earning', label: 'Earning' },
  { value: 'deduction', label: 'Deduction' },
  { value: 'employer_contribution', label: 'Employer Contribution' },
] as const

export const SALARY_COMPONENT_CATEGORIES = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'variable', label: 'Variable' },
  { value: 'statutory', label: 'Statutory' },
  { value: 'reimbursement', label: 'Reimbursement' },
] as const

export const STATUTORY_TYPES = [
  { value: 'pf_employee', label: 'PF (Employee)' },
  { value: 'pf_employer', label: 'PF (Employer)' },
  { value: 'esi_employee', label: 'ESI (Employee)' },
  { value: 'esi_employer', label: 'ESI (Employer)' },
  { value: 'pt', label: 'Professional Tax' },
  { value: 'tds', label: 'TDS / Income Tax' },
] as const

export const CALCULATION_TYPES = [
  { value: 'flat', label: 'Flat Amount' },
  { value: 'percentage_of_basic', label: '% of Basic' },
  { value: 'percentage_of_gross', label: '% of Gross' },
] as const

export const PAYROLL_CYCLE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'processing', label: 'Processing' },
  { value: 'computed', label: 'Computed' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

export const PAYROLL_RUN_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'approved', label: 'Approved' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

export const PAYROLL_EMPLOYEE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'computed', label: 'Computed' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'on_hold', label: 'On Hold' },
] as const

export const ADJUSTMENT_TYPES = [
  { value: 'addition', label: 'Addition' },
  { value: 'deduction', label: 'Deduction' },
] as const

export const INDIA_PF_RATE = 12
export const INDIA_ESI_EMPLOYEE_RATE = 0.75
export const INDIA_ESI_EMPLOYER_RATE = 3.25
export const INDIA_ESI_GROSS_LIMIT = 21000
export const INDIA_PF_BASIC_LIMIT = 15000

export const DEFAULT_INDIA_SALARY_COMPONENTS = [
  { component_name: 'Basic Salary', component_code: 'BASIC', component_type: 'earning' as const, category: 'fixed' as const, calculation_type: 'percentage_of_gross' as const, default_value: 40, is_taxable: true, is_statutory: false, statutory_type: null, display_order: 1 },
  { component_name: 'House Rent Allowance', component_code: 'HRA', component_type: 'earning' as const, category: 'fixed' as const, calculation_type: 'percentage_of_basic' as const, default_value: 50, is_taxable: true, is_statutory: false, statutory_type: null, display_order: 2 },
  { component_name: 'Special Allowance', component_code: 'SA', component_type: 'earning' as const, category: 'fixed' as const, calculation_type: 'flat' as const, default_value: 0, is_taxable: true, is_statutory: false, statutory_type: null, display_order: 3 },
  { component_name: 'Conveyance Allowance', component_code: 'CA', component_type: 'earning' as const, category: 'fixed' as const, calculation_type: 'flat' as const, default_value: 1600, is_taxable: true, is_statutory: false, statutory_type: null, display_order: 4 },
  { component_name: 'PF (Employee)', component_code: 'PF_EE', component_type: 'deduction' as const, category: 'statutory' as const, calculation_type: 'percentage_of_basic' as const, default_value: 12, is_taxable: false, is_statutory: true, statutory_type: 'pf_employee' as const, display_order: 10 },
  { component_name: 'ESI (Employee)', component_code: 'ESI_EE', component_type: 'deduction' as const, category: 'statutory' as const, calculation_type: 'percentage_of_gross' as const, default_value: 0.75, is_taxable: false, is_statutory: true, statutory_type: 'esi_employee' as const, display_order: 11 },
  { component_name: 'Professional Tax', component_code: 'PT', component_type: 'deduction' as const, category: 'statutory' as const, calculation_type: 'flat' as const, default_value: 200, is_taxable: false, is_statutory: true, statutory_type: 'pt' as const, display_order: 12 },
  { component_name: 'TDS', component_code: 'TDS', component_type: 'deduction' as const, category: 'statutory' as const, calculation_type: 'flat' as const, default_value: 0, is_taxable: false, is_statutory: true, statutory_type: 'tds' as const, display_order: 13 },
  { component_name: 'PF (Employer)', component_code: 'PF_ER', component_type: 'employer_contribution' as const, category: 'statutory' as const, calculation_type: 'percentage_of_basic' as const, default_value: 12, is_taxable: false, is_statutory: true, statutory_type: 'pf_employer' as const, display_order: 20 },
  { component_name: 'ESI (Employer)', component_code: 'ESI_ER', component_type: 'employer_contribution' as const, category: 'statutory' as const, calculation_type: 'percentage_of_gross' as const, default_value: 3.25, is_taxable: false, is_statutory: true, statutory_type: 'esi_employer' as const, display_order: 21 },
]

// ============================================================================
// Performance Management Constants
// ============================================================================

export const PERFORMANCE_CYCLE_TYPES = [
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half Yearly' },
  { value: 'annual', label: 'Annual' },
  { value: 'custom', label: 'Custom' },
] as const

export const PERFORMANCE_CYCLE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'goal_setting', label: 'Goal Setting' },
  { value: 'self_review', label: 'Self Review' },
  { value: 'manager_review', label: 'Manager Review' },
  { value: 'calibration', label: 'Calibration' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

export const GOAL_CATEGORIES = [
  { value: 'individual', label: 'Individual' },
  { value: 'team', label: 'Team' },
  { value: 'organizational', label: 'Organizational' },
] as const

export const GOAL_UNITS = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'boolean', label: 'Yes/No' },
] as const

export const GOAL_STATUSES = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_track', label: 'On Track' },
  { value: 'at_risk', label: 'At Risk' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

export const KEY_RESULT_STATUSES = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
] as const

export const REVIEW_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'self_review_pending', label: 'Self Review Pending' },
  { value: 'self_review_done', label: 'Self Review Done' },
  { value: 'manager_review_pending', label: 'Manager Review Pending' },
  { value: 'manager_review_done', label: 'Manager Review Done' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'finalized', label: 'Finalized' },
] as const

export const RATING_LABELS = [
  { value: 'exceeds_expectations', label: 'Exceeds Expectations', min: 4.5, max: 5.0 },
  { value: 'meets_expectations', label: 'Meets Expectations', min: 3.0, max: 4.4 },
  { value: 'needs_improvement', label: 'Needs Improvement', min: 2.0, max: 2.9 },
  { value: 'below_expectations', label: 'Below Expectations', min: 1.0, max: 1.9 },
] as const

export const COMPETENCY_CATEGORIES = [
  { value: 'core', label: 'Core' },
  { value: 'functional', label: 'Functional' },
  { value: 'leadership', label: 'Leadership' },
] as const

export const PIP_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'extended', label: 'Extended' },
  { value: 'completed_successful', label: 'Completed (Successful)' },
  { value: 'completed_unsuccessful', label: 'Completed (Unsuccessful)' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

export const RATING_SCALE = { MIN: 1.0, MAX: 5.0, STEP: 0.5 } as const

// ============================================================================
// Recruitment Constants
// ============================================================================

export const REQUISITION_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'closed', label: 'Closed' },
  { value: 'filled', label: 'Filled' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

export const APPLICATION_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'screening', label: 'Screening' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'offer', label: 'Offer' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'on_hold', label: 'On Hold' },
] as const

export const CANDIDATE_SOURCES = [
  { value: 'job_portal', label: 'Job Portal' },
  { value: 'referral', label: 'Referral' },
  { value: 'direct', label: 'Direct' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'agency', label: 'Agency' },
  { value: 'campus', label: 'Campus' },
  { value: 'other', label: 'Other' },
] as const

export const INTERVIEW_MODES = [
  { value: 'phone', label: 'Phone' },
  { value: 'video', label: 'Video' },
  { value: 'in_person', label: 'In Person' },
] as const

export const INTERVIEW_STATUSES = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rescheduled', label: 'Rescheduled' },
  { value: 'no_show', label: 'No Show' },
] as const

export const INTERVIEW_RECOMMENDATIONS = [
  { value: 'strong_hire', label: 'Strong Hire' },
  { value: 'hire', label: 'Hire' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no_hire', label: 'No Hire' },
  { value: 'strong_no_hire', label: 'Strong No Hire' },
] as const

export const OFFER_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
  { value: 'withdrawn', label: 'Withdrawn' },
] as const

// ── Learning & Development ──────────────────────────────────────────

export const COURSE_MODES = [
  { value: 'online', label: 'Online' },
  { value: 'classroom', label: 'Classroom' },
  { value: 'blended', label: 'Blended' },
  { value: 'self_paced', label: 'Self-Paced' },
] as const

export const COURSE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
] as const

export const ENROLLMENT_STATUSES = [
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'dropped', label: 'Dropped' },
  { value: 'failed', label: 'Failed' },
] as const

export const ASSESSMENT_TYPES = [
  { value: 'quiz', label: 'Quiz' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'practical', label: 'Practical' },
  { value: 'certification_exam', label: 'Certification Exam' },
] as const

export const ATTEMPT_STATUSES = [
  { value: 'in_progress', label: 'In Progress' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
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

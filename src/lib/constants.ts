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
  { value: 'freelance', label: 'Freelance' },
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

export const RELIGION_OPTIONS = [
  { value: 'Hinduism', label: 'Hinduism' },
  { value: 'Islam', label: 'Islam' },
  { value: 'Christianity', label: 'Christianity' },
  { value: 'Sikhism', label: 'Sikhism' },
  { value: 'Buddhism', label: 'Buddhism' },
  { value: 'Jainism', label: 'Jainism' },
  { value: 'Other', label: 'Other' },
  { value: 'Prefer not to say', label: 'Prefer not to say' },
] as const

export const NATIONALITY_OPTIONS = [
  { value: 'Indian', label: 'Indian' },
] as const

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
    'view_reports',
  ],
  leadership: [
    'view_employees',
    'view_leave_reports',
    'view_payroll',
    'view_attendance',
    'view_performance',
    'view_candidates',
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

// ============================================================================
// Self-Service: Letter Management
// ============================================================================

export const LETTER_CATEGORIES = [
  { value: 'experience_letter', label: 'Experience Letter', approvalType: 'auto' },
  { value: 'salary_certificate', label: 'Salary Certificate', approvalType: 'auto' },
  { value: 'address_proof', label: 'Address Proof Letter', approvalType: 'auto' },
  { value: 'bonafide_certificate', label: 'Bonafide Certificate', approvalType: 'auto' },
  { value: 'relieving_letter', label: 'Relieving Letter', approvalType: 'approval_required' },
  { value: 'noc', label: 'No Objection Certificate', approvalType: 'approval_required' },
  { value: 'reference_letter', label: 'Reference Letter', approvalType: 'approval_required' },
  { value: 'offer_letter', label: 'Offer Letter', approvalType: 'hr_only' },
  { value: 'appointment_letter', label: 'Appointment Letter', approvalType: 'hr_only' },
  { value: 'confirmation_letter', label: 'Confirmation Letter', approvalType: 'hr_only' },
  { value: 'warning_letter', label: 'Warning Letter', approvalType: 'hr_only' },
  { value: 'termination_letter', label: 'Termination Letter', approvalType: 'hr_only' },
  { value: 'salary_revision_letter', label: 'Salary Revision Letter', approvalType: 'hr_only' },
] as const

export const LETTER_REQUEST_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_manager', label: 'Pending Manager' },
  { value: 'manager_approved', label: 'Manager Approved' },
  { value: 'manager_rejected', label: 'Manager Rejected' },
  { value: 'pending_hr', label: 'Pending HR' },
  { value: 'hr_approved', label: 'HR Approved' },
  { value: 'hr_rejected', label: 'HR Rejected' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

export const TEMPLATE_PLACEHOLDERS = [
  { key: '{{employee_name}}', label: 'Employee Full Name' },
  { key: '{{employee_code}}', label: 'Employee Code' },
  { key: '{{designation}}', label: 'Designation' },
  { key: '{{department}}', label: 'Department' },
  { key: '{{date_of_joining}}', label: 'Date of Joining' },
  { key: '{{date_of_leaving}}', label: 'Last Working Date' },
  { key: '{{company_name}}', label: 'Company Name' },
  { key: '{{company_address}}', label: 'Company Address' },
  { key: '{{current_date}}', label: 'Current Date' },
  { key: '{{salary}}', label: 'Current CTC/Salary' },
  { key: '{{pan_number}}', label: 'PAN Number' },
  { key: '{{current_address}}', label: 'Current Address' },
] as const

// ── Reimbursement constants ──────────────────────────────────

export const REIMBURSEMENT_CATEGORIES = [
  { value: 'travel', label: 'Travel / Conveyance' },
  { value: 'medical', label: 'Medical' },
  { value: 'mobile_internet', label: 'Mobile / Internet' },
  { value: 'relocation', label: 'Relocation Expenses' },
  { value: 'training', label: 'Training / Certification' },
  { value: 'meal_food', label: 'Meal / Food Allowance' },
] as const

export const REIMBURSEMENT_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_manager', label: 'Pending Manager' },
  { value: 'manager_approved', label: 'Manager Approved' },
  { value: 'manager_rejected', label: 'Manager Rejected' },
  { value: 'pending_finance', label: 'Pending Finance' },
  { value: 'finance_approved', label: 'Finance Approved' },
  { value: 'finance_rejected', label: 'Finance Rejected' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

// ── General Request constants ────────────────────────────────

export const GENERAL_REQUEST_TYPES = [
  { value: 'id_card_request', label: 'ID Card Request' },
  { value: 'asset_request', label: 'Asset Request' },
  { value: 'wfh_request', label: 'Work From Home' },
  { value: 'shift_change_request', label: 'Shift Change' },
  { value: 'overtime_request', label: 'Overtime Approval' },
] as const

export const GENERAL_REQUEST_STATUSES = [
  { value: 'pending_manager', label: 'Pending Manager' },
  { value: 'manager_approved', label: 'Manager Approved' },
  { value: 'manager_rejected', label: 'Manager Rejected' },
  { value: 'pending_hr', label: 'Pending HR' },
  { value: 'hr_approved', label: 'HR Approved' },
  { value: 'hr_rejected', label: 'HR Rejected' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
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

// ============================================================================
// Workflows
// ============================================================================

export const WORKFLOW_EVENT_MODULES = [
  {
    module: 'Employee',
    icon: 'Users',
    events: [
      { value: 'employee_birthday', label: 'Employee Birthday', description: 'Date of birth matches today', timingOptions: ['on_event', 'days_before'] },
      { value: 'employee_work_anniversary', label: 'Work Anniversary', description: 'Anniversary of joining date', timingOptions: ['on_event', 'days_before'] },
      { value: 'employee_joined', label: 'Employee Joined', description: 'New employee is onboarded', timingOptions: ['on_event'] },
      { value: 'employee_probation_completed', label: 'Probation Completed', description: 'Probation period ends', timingOptions: ['on_event', 'days_before'] },
      { value: 'employee_department_changed', label: 'Department Changed', description: 'Employee moves to a new department', timingOptions: ['on_event'] },
      { value: 'employee_designation_changed', label: 'Designation Changed', description: 'Employee title/role changed', timingOptions: ['on_event'] },
      { value: 'employee_compensation_revised', label: 'Compensation Revised', description: 'Salary or CTC revision', timingOptions: ['on_event'] },
      { value: 'employee_status_changed', label: 'Status Changed', description: 'Employment status changed (active, on notice, etc.)', timingOptions: ['on_event'] },
    ],
  },
  {
    module: 'Leave',
    icon: 'CalendarDays',
    events: [
      { value: 'leave_request_submitted', label: 'Leave Requested', description: 'Employee submits a leave request', timingOptions: ['on_event'] },
      { value: 'leave_request_approved', label: 'Leave Approved', description: 'Manager/HR approves a leave request', timingOptions: ['on_event'] },
      { value: 'leave_request_rejected', label: 'Leave Rejected', description: 'Leave request is rejected', timingOptions: ['on_event'] },
      { value: 'leave_balance_low', label: 'Leave Balance Low', description: 'Employee leave balance falls below threshold', timingOptions: ['on_event'] },
    ],
  },
  {
    module: 'Attendance',
    icon: 'Clock',
    events: [
      { value: 'attendance_clock_in', label: 'Clock In', description: 'Employee clocks in for the day', timingOptions: ['on_event'] },
      { value: 'attendance_clock_out', label: 'Clock Out', description: 'Employee clocks out', timingOptions: ['on_event'] },
      { value: 'attendance_absent', label: 'Absent Marked', description: 'Employee marked absent', timingOptions: ['on_event'] },
      { value: 'attendance_regularization_requested', label: 'Regularization Requested', description: 'Employee requests attendance regularization', timingOptions: ['on_event'] },
    ],
  },
  {
    module: 'Payroll',
    icon: 'Wallet',
    events: [
      { value: 'payroll_cycle_created', label: 'Payroll Cycle Created', description: 'New payroll cycle is initiated', timingOptions: ['on_event'] },
      { value: 'payroll_processed', label: 'Payroll Processed', description: 'Payroll run is computed', timingOptions: ['on_event'] },
      { value: 'payroll_approved', label: 'Payroll Approved', description: 'Payroll cycle is approved', timingOptions: ['on_event'] },
      { value: 'payslip_available', label: 'Payslip Available', description: 'Payslips are generated and available', timingOptions: ['on_event'] },
      { value: 'payroll_paid', label: 'Payroll Paid', description: 'Salaries are disbursed', timingOptions: ['on_event'] },
    ],
  },
  {
    module: 'Performance',
    icon: 'TrendingUp',
    events: [
      { value: 'performance_cycle_started', label: 'Review Cycle Started', description: 'Performance review cycle begins', timingOptions: ['on_event'] },
      { value: 'performance_self_review_due', label: 'Self Review Due', description: 'Self review submission deadline approaching', timingOptions: ['on_event', 'days_before'] },
      { value: 'performance_manager_review_due', label: 'Manager Review Due', description: 'Manager review deadline approaching', timingOptions: ['on_event', 'days_before'] },
      { value: 'performance_review_completed', label: 'Review Completed', description: 'Performance review is finalized', timingOptions: ['on_event'] },
      { value: 'goal_deadline_approaching', label: 'Goal Deadline Approaching', description: 'Goal target date is near', timingOptions: ['days_before'] },
    ],
  },
  {
    module: 'Recruitment',
    icon: 'UserPlus',
    events: [
      { value: 'job_posted', label: 'Job Posted', description: 'New job requisition is published', timingOptions: ['on_event'] },
      { value: 'application_received', label: 'Application Received', description: 'New candidate applies', timingOptions: ['on_event'] },
      { value: 'interview_scheduled', label: 'Interview Scheduled', description: 'Interview is scheduled', timingOptions: ['on_event'] },
      { value: 'offer_sent', label: 'Offer Sent', description: 'Offer letter is sent to candidate', timingOptions: ['on_event'] },
      { value: 'offer_accepted', label: 'Offer Accepted', description: 'Candidate accepts the offer', timingOptions: ['on_event'] },
      { value: 'candidate_hired', label: 'Candidate Hired', description: 'Candidate completes hiring process', timingOptions: ['on_event'] },
    ],
  },
  {
    module: 'Separation',
    icon: 'UserMinus',
    events: [
      { value: 'resignation_submitted', label: 'Resignation Submitted', description: 'Employee submits resignation', timingOptions: ['on_event'] },
      { value: 'resignation_approved', label: 'Resignation Approved', description: 'Resignation is approved', timingOptions: ['on_event'] },
      { value: 'notice_period_started', label: 'Notice Period Started', description: 'Employee enters notice period', timingOptions: ['on_event'] },
      { value: 'last_working_day_approaching', label: 'Last Working Day Approaching', description: 'Employee\'s last day is near', timingOptions: ['on_event', 'days_before'] },
      { value: 'clearance_completed', label: 'Clearance Completed', description: 'Exit clearance is completed', timingOptions: ['on_event'] },
      { value: 'employee_terminated', label: 'Employee Terminated', description: 'Termination date reached', timingOptions: ['on_event', 'days_before'] },
    ],
  },
  {
    module: 'Self Service',
    icon: 'FileText',
    events: [
      { value: 'letter_requested', label: 'Letter Requested', description: 'Employee requests a letter', timingOptions: ['on_event'] },
      { value: 'letter_approved', label: 'Letter Approved', description: 'Letter request is approved', timingOptions: ['on_event'] },
      { value: 'reimbursement_submitted', label: 'Reimbursement Submitted', description: 'Employee submits reimbursement', timingOptions: ['on_event'] },
      { value: 'reimbursement_approved', label: 'Reimbursement Approved', description: 'Reimbursement is fully approved', timingOptions: ['on_event'] },
      { value: 'general_request_submitted', label: 'General Request Submitted', description: 'Employee submits a general request', timingOptions: ['on_event'] },
    ],
  },
] as const

/** Flat list of all events for lookups */
export const WORKFLOW_EVENTS = WORKFLOW_EVENT_MODULES.flatMap((m) => [...m.events])

export const WORKFLOW_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
] as const

export const WORKFLOW_TIMING_OPTIONS = [
  { value: 'on_event', label: 'When it happens' },
  { value: 'days_before', label: 'Days before' },
  { value: 'days_after', label: 'Days after' },
] as const

export const WORKFLOW_CONDITION_FIELDS = [
  { value: 'employment_status', label: 'Employment Status', options: ['active', 'on_notice', 'terminated', 'resigned'] },
  { value: 'department', label: 'Department', options: [] }, // dynamic
  { value: 'designation', label: 'Designation', options: [] }, // dynamic
  { value: 'employment_type', label: 'Employment Type', options: ['full_time', 'part_time', 'contract', 'intern', 'freelance'] },
  { value: 'gender', label: 'Gender', options: ['male', 'female', 'other'] },
] as const

export const WORKFLOW_CONDITION_OPERATORS = [
  { value: 'is', label: 'is' },
  { value: 'is_not', label: 'is not' },
] as const

export const WORKFLOW_ACTION_TYPES = [
  { value: 'send_notification', label: 'Send Notification', description: 'Send an in-app notification', icon: 'Bell' },
  { value: 'send_email', label: 'Send Email', description: 'Send an email via Resend', icon: 'Mail' },
] as const

export const WORKFLOW_RECIPIENTS = [
  { value: 'employee', label: 'Employee', description: 'The employee this workflow is about' },
  { value: 'manager', label: 'Manager', description: 'The employee\'s reporting manager' },
  { value: 'hr_admins', label: 'HR Admins', description: 'All HR administrators' },
  { value: 'all_org', label: 'Everyone', description: 'All active members of the organization' },
  { value: 'specific_roles', label: 'Specific Roles', description: 'Choose specific roles' },
] as const

export const WORKFLOW_PLACEHOLDERS = [
  { key: '{{employee_name}}', label: 'Employee Name' },
  { key: '{{employee_code}}', label: 'Employee Code' },
  { key: '{{department}}', label: 'Department' },
  { key: '{{designation}}', label: 'Designation' },
  { key: '{{date_of_joining}}', label: 'Date of Joining' },
  { key: '{{manager_name}}', label: 'Manager Name' },
  { key: '{{company_name}}', label: 'Company Name' },
] as const

// ============================================================================
// Granular Roles & Permissions (3-Level Access Control)
// ============================================================================

import type { PermissionLevel } from '@/types/database.types'

export const PERMISSION_LEVELS = [
  { value: 'no_access' as const, label: 'No access' },
  { value: 'read' as const, label: 'Can read' },
  { value: 'manage' as const, label: 'Can manage' },
]

export interface PermissionFeature {
  key: string
  label: string
  description: string
}

export interface PermissionModule {
  key: string
  label: string
  icon: string // lucide icon name
  features: PermissionFeature[]
}

// Section 1: App Permissions (grouped by module)
export const APP_PERMISSION_MODULES: PermissionModule[] = [
  {
    key: 'employees',
    label: 'Employees',
    icon: 'Users',
    features: [
      { key: 'employees_directory', label: 'Employee Directory', description: 'View and manage employee profiles' },
      { key: 'employees_onboarding', label: 'Onboarding', description: 'Manage employee onboarding' },
      { key: 'employees_documents', label: 'Documents', description: 'Access employee documents' },
    ],
  },
  {
    key: 'leave',
    label: 'Leave',
    icon: 'CalendarDays',
    features: [
      { key: 'leave_requests', label: 'Leave Requests', description: 'View and approve leave requests' },
      { key: 'leave_types', label: 'Leave Types & Policies', description: 'Configure leave types and policies' },
      { key: 'leave_reports', label: 'Leave Reports', description: 'Access leave balance reports' },
    ],
  },
  {
    key: 'attendance',
    label: 'Attendance',
    icon: 'Clock',
    features: [
      { key: 'attendance_records', label: 'Attendance Records', description: 'View and manage attendance' },
      { key: 'attendance_shifts', label: 'Shifts', description: 'Create and manage shifts' },
    ],
  },
  {
    key: 'payroll',
    label: 'Payroll',
    icon: 'Wallet',
    features: [
      { key: 'payroll_processing', label: 'Payroll Processing', description: 'Run and manage payroll cycles' },
      { key: 'payroll_compensation', label: 'Compensation', description: 'Manage salary structures' },
      { key: 'payroll_reports', label: 'Payroll Reports', description: 'Export payroll data' },
    ],
  },
  {
    key: 'performance',
    label: 'Performance',
    icon: 'TrendingUp',
    features: [
      { key: 'performance_reviews', label: 'Reviews & Goals', description: 'View and manage performance cycles' },
      { key: 'performance_competencies', label: 'Competencies', description: 'Manage competency frameworks' },
    ],
  },
  {
    key: 'recruitment',
    label: 'Recruitment',
    icon: 'UserPlus',
    features: [
      { key: 'recruitment_jobs', label: 'Job Postings', description: 'Manage recruiting jobs' },
      { key: 'recruitment_applications', label: 'Applications', description: 'Manage candidate pipeline' },
    ],
  },
  {
    key: 'self_service',
    label: 'Self Service',
    icon: 'FileText',
    features: [
      { key: 'self_service_letters', label: 'Letter Templates', description: 'Manage letter templates' },
      { key: 'self_service_reimbursements', label: 'Reimbursements', description: 'Approve reimbursement requests' },
      { key: 'self_service_requests', label: 'General Requests', description: 'Approve general requests' },
    ],
  },
  {
    key: 'separation',
    label: 'Separation',
    icon: 'UserMinus',
    features: [
      { key: 'separation_resignations', label: 'Resignations', description: 'Manage resignation workflow' },
      { key: 'separation_clearances', label: 'Clearances', description: 'Manage exit clearances' },
    ],
  },
  {
    key: 'workflows',
    label: 'Workflows',
    icon: 'Workflow',
    features: [
      { key: 'workflows_management', label: 'Workflow Management', description: 'Create, edit, and manage automation workflows' },
      { key: 'workflows_templates', label: 'Workflow Templates', description: 'Access and use pre-built workflow templates' },
    ],
  },
]

// Section 2: Organization Permissions
export const ORG_PERMISSIONS: PermissionFeature[] = [
  { key: 'org_settings', label: 'Organization Settings', description: 'Manage org config, modules, working days' },
  { key: 'org_departments', label: 'Departments', description: 'Manage department structure' },
  { key: 'org_designations', label: 'Designations', description: 'Manage designation hierarchy' },
  { key: 'org_holidays', label: 'Holidays', description: 'Manage holiday calendar' },
  { key: 'org_announcements', label: 'Announcements', description: 'Create and manage announcements' },
  { key: 'org_roles', label: 'Roles & Permissions', description: 'Edit permission profiles' },
]

// Section 3: User Data Permissions
export const USER_DATA_PERMISSIONS: PermissionFeature[] = [
  { key: 'data_basic_employment', label: 'Basic Employment', description: 'Employee ID, Work Email, Joining Date, Reporting To, Title, Department' },
  { key: 'data_nonsensitive_employment', label: 'Non-sensitive Employment', description: 'Entity, Legal Name, Employment Type, Work Location, Level, Team' },
  { key: 'data_sensitive_employment', label: 'Sensitive Employment', description: 'Status, Probation Status, Notice Status, Termination Date' },
  { key: 'data_basic_personal', label: 'Basic Personal', description: 'First Name, Last Name, Display Name, Email, Profile Picture' },
  { key: 'data_nonsensitive_personal', label: 'Non-sensitive Personal', description: 'Gender, Date of Birth, Phone Number, Address' },
  { key: 'data_sensitive_personal', label: 'Sensitive Personal', description: 'PAN, Aadhaar, Passport' },
  { key: 'data_compensation', label: 'Compensation', description: 'Salary, CTC, Bank Details' },
]

/** All feature keys (used for iteration & defaults) */
export const ALL_PERMISSION_FEATURE_KEYS = [
  ...APP_PERMISSION_MODULES.flatMap((m) => m.features.map((f) => f.key)),
  ...ORG_PERMISSIONS.map((f) => f.key),
  ...USER_DATA_PERMISSIONS.map((f) => f.key),
]

/** Default 3-level permission map per role */
export const DEFAULT_ROLE_PERMISSION_LEVELS: Record<string, Record<string, PermissionLevel>> = {
  super_admin: Object.fromEntries(ALL_PERMISSION_FEATURE_KEYS.map((k) => [k, 'manage'])) as Record<string, PermissionLevel>,
  hr_admin: {
    // App
    employees_directory: 'manage', employees_onboarding: 'manage', employees_documents: 'manage',
    leave_requests: 'manage', leave_types: 'manage', leave_reports: 'manage',
    attendance_records: 'manage', attendance_shifts: 'manage',
    payroll_processing: 'read', payroll_compensation: 'read', payroll_reports: 'read',
    performance_reviews: 'manage', performance_competencies: 'manage',
    recruitment_jobs: 'manage', recruitment_applications: 'manage',
    self_service_letters: 'manage', self_service_reimbursements: 'manage', self_service_requests: 'manage',
    separation_resignations: 'manage', separation_clearances: 'manage',
    workflows_management: 'manage', workflows_templates: 'manage',
    // Org
    org_settings: 'read', org_departments: 'manage', org_designations: 'manage',
    org_holidays: 'manage', org_announcements: 'manage', org_roles: 'no_access',
    // Data
    data_basic_employment: 'manage', data_nonsensitive_employment: 'manage',
    data_sensitive_employment: 'manage', data_basic_personal: 'manage',
    data_nonsensitive_personal: 'manage', data_sensitive_personal: 'read',
    data_compensation: 'read',
  },
  payroll_admin: {
    // App
    employees_directory: 'read', employees_onboarding: 'no_access', employees_documents: 'no_access',
    leave_requests: 'no_access', leave_types: 'no_access', leave_reports: 'no_access',
    attendance_records: 'read', attendance_shifts: 'no_access',
    payroll_processing: 'manage', payroll_compensation: 'manage', payroll_reports: 'manage',
    performance_reviews: 'read', performance_competencies: 'no_access',
    recruitment_jobs: 'no_access', recruitment_applications: 'no_access',
    self_service_letters: 'no_access', self_service_reimbursements: 'manage', self_service_requests: 'no_access',
    separation_resignations: 'no_access', separation_clearances: 'no_access',
    workflows_management: 'no_access', workflows_templates: 'no_access',
    // Org
    org_settings: 'no_access', org_departments: 'read', org_designations: 'read',
    org_holidays: 'no_access', org_announcements: 'no_access', org_roles: 'no_access',
    // Data
    data_basic_employment: 'read', data_nonsensitive_employment: 'read',
    data_sensitive_employment: 'no_access', data_basic_personal: 'read',
    data_nonsensitive_personal: 'no_access', data_sensitive_personal: 'no_access',
    data_compensation: 'manage',
  },
  manager: {
    // App
    employees_directory: 'read', employees_onboarding: 'no_access', employees_documents: 'read',
    leave_requests: 'manage', leave_types: 'no_access', leave_reports: 'read',
    attendance_records: 'read', attendance_shifts: 'no_access',
    payroll_processing: 'no_access', payroll_compensation: 'no_access', payroll_reports: 'no_access',
    performance_reviews: 'manage', performance_competencies: 'read',
    recruitment_jobs: 'read', recruitment_applications: 'read',
    self_service_letters: 'no_access', self_service_reimbursements: 'manage', self_service_requests: 'manage',
    separation_resignations: 'manage', separation_clearances: 'no_access',
    workflows_management: 'no_access', workflows_templates: 'no_access',
    // Org
    org_settings: 'no_access', org_departments: 'read', org_designations: 'read',
    org_holidays: 'read', org_announcements: 'read', org_roles: 'no_access',
    // Data
    data_basic_employment: 'read', data_nonsensitive_employment: 'read',
    data_sensitive_employment: 'no_access', data_basic_personal: 'read',
    data_nonsensitive_personal: 'read', data_sensitive_personal: 'no_access',
    data_compensation: 'no_access',
  },
  leadership: {
    // App
    employees_directory: 'read', employees_onboarding: 'no_access', employees_documents: 'read',
    leave_requests: 'read', leave_types: 'no_access', leave_reports: 'read',
    attendance_records: 'read', attendance_shifts: 'no_access',
    payroll_processing: 'read', payroll_compensation: 'read', payroll_reports: 'read',
    performance_reviews: 'read', performance_competencies: 'read',
    recruitment_jobs: 'read', recruitment_applications: 'read',
    self_service_letters: 'no_access', self_service_reimbursements: 'read', self_service_requests: 'read',
    separation_resignations: 'read', separation_clearances: 'no_access',
    workflows_management: 'read', workflows_templates: 'read',
    // Org
    org_settings: 'read', org_departments: 'read', org_designations: 'read',
    org_holidays: 'read', org_announcements: 'read', org_roles: 'no_access',
    // Data
    data_basic_employment: 'read', data_nonsensitive_employment: 'read',
    data_sensitive_employment: 'read', data_basic_personal: 'read',
    data_nonsensitive_personal: 'read', data_sensitive_personal: 'no_access',
    data_compensation: 'read',
  },
  employee: {
    // App — employees only see self-service features
    employees_directory: 'read', employees_onboarding: 'no_access', employees_documents: 'no_access',
    leave_requests: 'no_access', leave_types: 'no_access', leave_reports: 'no_access',
    attendance_records: 'no_access', attendance_shifts: 'no_access',
    payroll_processing: 'no_access', payroll_compensation: 'no_access', payroll_reports: 'no_access',
    performance_reviews: 'no_access', performance_competencies: 'no_access',
    recruitment_jobs: 'no_access', recruitment_applications: 'no_access',
    self_service_letters: 'no_access', self_service_reimbursements: 'no_access', self_service_requests: 'no_access',
    separation_resignations: 'no_access', separation_clearances: 'no_access',
    workflows_management: 'no_access', workflows_templates: 'no_access',
    // Org
    org_settings: 'no_access', org_departments: 'read', org_designations: 'read',
    org_holidays: 'read', org_announcements: 'read', org_roles: 'no_access',
    // Data — own data only
    data_basic_employment: 'read', data_nonsensitive_employment: 'read',
    data_sensitive_employment: 'no_access', data_basic_personal: 'read',
    data_nonsensitive_personal: 'read', data_sensitive_personal: 'no_access',
    data_compensation: 'no_access',
  },
}

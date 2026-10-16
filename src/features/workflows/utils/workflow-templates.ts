import type {
  WorkflowTriggerConfig,
  WorkflowCondition,
  WorkflowAction,
} from '@/types/database.types'

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  icon: string
  module: string
  trigger_type: 'event' | 'time'
  trigger_config: WorkflowTriggerConfig
  conditions: WorkflowCondition[]
  actions: WorkflowAction[]
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  // ── 1. Employee Birthday Notification ──────────────────────────────────
  {
    id: 'birthday-notification',
    name: 'Employee Birthday Notification',
    description: 'Automatically wish employees on their birthday and notify the organization.',
    icon: '\uD83C\uDF82',
    module: 'employees',
    trigger_type: 'event',
    trigger_config: {
      event: 'employee_birthday',
      timing: 'on_event',
    },
    conditions: [],
    actions: [
      {
        type: 'send_notification',
        config: {
          recipients: 'employee',
          title: 'Happy Birthday, {{employee_name}}!',
          message: 'Wishing you a wonderful birthday! Hope you have an amazing day.',
        },
      },
      {
        type: 'send_notification',
        config: {
          recipients: 'all_org',
          title: "It's {{employee_name}}'s Birthday!",
          message:
            "Today is {{employee_name}}'s birthday from {{department}}. Let's wish them well!",
        },
      },
    ],
  },

  // ── 2. Work Anniversary Celebration ────────────────────────────────────
  {
    id: 'work-anniversary',
    name: 'Work Anniversary Celebration',
    description: 'Celebrate employee work anniversaries with automatic notifications.',
    icon: '\uD83C\uDF89',
    module: 'employees',
    trigger_type: 'event',
    trigger_config: {
      event: 'employee_work_anniversary',
      timing: 'on_event',
    },
    conditions: [],
    actions: [
      {
        type: 'send_notification',
        config: {
          recipients: 'employee',
          title: 'Happy Work Anniversary, {{employee_name}}!',
          message:
            'Congratulations on completing another wonderful year at {{organization_name}}!',
        },
      },
      {
        type: 'send_notification',
        config: {
          recipients: 'manager',
          title: "{{employee_name}}'s Work Anniversary",
          message:
            "Today is {{employee_name}}'s work anniversary. Take a moment to appreciate their contributions.",
        },
      },
      {
        type: 'send_notification',
        config: {
          recipients: 'all_org',
          title: "{{employee_name}} celebrates a Work Anniversary!",
          message:
            "{{employee_name}} from {{department}} is celebrating their work anniversary today. Congratulations!",
        },
      },
    ],
  },

  // ── 3. Welcome New Joiner ──────────────────────────────────────────────
  {
    id: 'welcome-new-joiner',
    name: 'Welcome New Joiner',
    description: 'Automatically welcome new employees who join the organization.',
    icon: '\uD83D\uDC4B',
    module: 'employees',
    trigger_type: 'event',
    trigger_config: {
      event: 'employee_joined',
      timing: 'on_event',
    },
    conditions: [],
    actions: [
      {
        type: 'send_notification',
        config: {
          recipients: 'all_org',
          title: 'Welcome {{employee_name}} to the team!',
          message:
            '{{employee_name}} has joined {{department}} as {{designation}}. Please give them a warm welcome!',
        },
      },
    ],
  },

  // ── 4. Probation Completion Alert ──────────────────────────────────────
  {
    id: 'probation-completion',
    name: 'Probation Completion Alert',
    description:
      'Alert HR and manager 7 days before an employee completes their probation period.',
    icon: '\u2705',
    module: 'employees',
    trigger_type: 'event',
    trigger_config: {
      event: 'employee_probation_completed',
      timing: 'days_before',
      days_offset: 7,
    },
    conditions: [],
    actions: [
      {
        type: 'send_notification',
        config: {
          recipients: 'employee',
          title: 'Probation Period Ending Soon',
          message:
            'Your probation period is ending in 7 days. Please connect with your manager for a review.',
        },
      },
      {
        type: 'send_notification',
        config: {
          recipients: 'manager',
          title: "{{employee_name}}'s Probation Ending Soon",
          message:
            "{{employee_name}}'s probation period ends in 7 days. Please schedule a probation review.",
        },
      },
      {
        type: 'send_notification',
        config: {
          recipients: 'hr_admins',
          title: 'Probation Completion: {{employee_name}}',
          message:
            "{{employee_name}} from {{department}} will complete their probation in 7 days. Ensure the review process is initiated.",
        },
      },
    ],
  },

  // ── 5. Department Change Notification ──────────────────────────────────
  {
    id: 'department-change',
    name: 'Department Change Notification',
    description: 'Notify employee and their manager when a department change occurs.',
    icon: '\uD83D\uDD04',
    module: 'employees',
    trigger_type: 'event',
    trigger_config: {
      event: 'employee_department_changed',
      timing: 'on_event',
    },
    conditions: [],
    actions: [
      {
        type: 'send_notification',
        config: {
          recipients: 'employee',
          title: 'Department Transfer',
          message:
            'You have been transferred to the {{department}} department. Please connect with your new team.',
        },
      },
      {
        type: 'send_notification',
        config: {
          recipients: 'manager',
          title: 'Team Member Department Change',
          message:
            '{{employee_name}} has been transferred to {{department}}.',
        },
      },
    ],
  },

  // ── 6. Designation Change Notification ─────────────────────────────────
  {
    id: 'designation-change',
    name: 'Designation Change Notification',
    description: 'Notify relevant parties when an employee gets a new designation.',
    icon: '\uD83D\uDCC8',
    module: 'employees',
    trigger_type: 'event',
    trigger_config: {
      event: 'employee_designation_changed',
      timing: 'on_event',
    },
    conditions: [],
    actions: [
      {
        type: 'send_notification',
        config: {
          recipients: 'employee',
          title: 'Designation Updated',
          message:
            'Your designation has been updated to {{designation}}. Congratulations!',
        },
      },
      {
        type: 'send_notification',
        config: {
          recipients: 'manager',
          title: "{{employee_name}}'s Designation Change",
          message:
            "{{employee_name}}'s designation has been updated to {{designation}}.",
        },
      },
      {
        type: 'send_notification',
        config: {
          recipients: 'hr_admins',
          title: 'Designation Update: {{employee_name}}',
          message:
            "{{employee_name}}'s designation has been changed to {{designation}} in {{department}}.",
        },
      },
    ],
  },

  // ── 7. Notice Period Reminder ──────────────────────────────────────────
  {
    id: 'notice-period-reminder',
    name: 'Notice Period Reminder',
    description: 'Remind HR admins when an employee starts their notice period.',
    icon: '\uD83D\uDCC5',
    module: 'resignation',
    trigger_type: 'event',
    trigger_config: {
      event: 'notice_period_started',
      timing: 'on_event',
    },
    conditions: [],
    actions: [
      {
        type: 'send_notification',
        config: {
          recipients: 'hr_admins',
          title: 'Notice Period Started: {{employee_name}}',
          message:
            '{{employee_name}} from {{department}} has started their notice period. Please ensure exit formalities are initiated.',
        },
      },
    ],
  },

  // ── 8. Compensation Revision Notification ──────────────────────────────
  {
    id: 'compensation-revision',
    name: 'Compensation Revision Notification',
    description: 'Notify an employee when their compensation has been revised.',
    icon: '\uD83D\uDCB0',
    module: 'payroll',
    trigger_type: 'event',
    trigger_config: {
      event: 'employee_compensation_revised',
      timing: 'on_event',
    },
    conditions: [],
    actions: [
      {
        type: 'send_notification',
        config: {
          recipients: 'employee',
          title: 'Compensation Updated',
          message:
            'Your compensation has been revised. Please check your payroll details for more information.',
        },
      },
    ],
  },

  // ── 9. Monthly Payroll Reminder ────────────────────────────────────────
  {
    id: 'monthly-payroll-reminder',
    name: 'Monthly Payroll Reminder',
    description: 'Remind payroll admins to process payroll on the 25th of every month.',
    icon: '\uD83D\uDCCA',
    module: 'payroll',
    trigger_type: 'time',
    trigger_config: {
      frequency: 'monthly',
      day_of_month: 25,
      time: '09:00',
    },
    conditions: [],
    actions: [
      {
        type: 'send_notification',
        config: {
          recipients: 'specific_roles',
          specific_roles: ['payroll_admin'],
          title: 'Monthly Payroll Reminder',
          message:
            'This is a reminder to process payroll for the current month. Please ensure all attendance and leave data is up to date.',
        },
      },
    ],
  },

  // ── 10. Leave Requested ────────────────────────────────────────────────
  // The most frequent event in the system. A manager who is not told has to
  // remember to go and look.
  {
    id: 'leave-requested',
    name: 'Leave Request Raised',
    description: 'Tell the manager as soon as somebody in their team applies for leave.',
    icon: '\uD83D\uDCDD',
    module: 'leave',
    trigger_type: 'event',
    trigger_config: { event: 'leave_request_submitted', timing: 'on_event' },
    conditions: [],
    actions: [
      {
        type: 'send_notification',
        config: {
          recipients: 'manager',
          title: 'Leave request from {{employee_name}}',
          message:
            '{{employee_name}} ({{employee_code}}) from {{department}} has applied for leave. Please approve or decline it.',
        },
      },
    ],
  },

  // ── 11. Leave Approved ─────────────────────────────────────────────────
  {
    id: 'leave-approved',
    name: 'Leave Approved',
    description: 'Let the employee know their leave has been approved.',
    icon: '\u2705',
    module: 'leave',
    trigger_type: 'event',
    trigger_config: { event: 'leave_request_approved', timing: 'on_event' },
    conditions: [],
    actions: [
      {
        type: 'send_notification',
        config: {
          recipients: 'employee',
          title: 'Your leave has been approved',
          message: 'Your leave request has been approved. Do hand over your work before you go.',
        },
      },
    ],
  },

  // ── 12. Leave Rejected ─────────────────────────────────────────────────
  {
    id: 'leave-rejected',
    name: 'Leave Declined',
    description: 'Let the employee know their leave was not approved, so they can re-plan.',
    icon: '\u274C',
    module: 'leave',
    trigger_type: 'event',
    trigger_config: { event: 'leave_request_rejected', timing: 'on_event' },
    conditions: [],
    actions: [
      {
        type: 'send_notification',
        config: {
          recipients: 'employee',
          title: 'Your leave request was not approved',
          message:
            'Your leave request has not been approved. Please speak to {{manager_name}} if you need to discuss it.',
        },
      },
    ],
  },

  // ── 13. Payslip Available ──────────────────────────────────────────────
  // Fires for every employee, every month.
  {
    id: 'payslip-available',
    name: 'Payslip Published',
    description: 'Tell everyone their payslip is ready as soon as payroll publishes it.',
    icon: '\uD83D\uDCC4',
    module: 'payroll',
    trigger_type: 'event',
    trigger_config: { event: 'payslip_available', timing: 'on_event' },
    conditions: [],
    actions: [
      {
        type: 'send_notification',
        config: {
          recipients: 'employee',
          title: 'Your payslip is ready',
          message:
            'Your payslip for this month is now available under Payroll, My Payslips.',
        },
      },
    ],
  },

  // ── 14. Reimbursement Submitted ────────────────────────────────────────
  {
    id: 'reimbursement-submitted',
    name: 'Reimbursement Claim Raised',
    description: 'Tell the manager and finance when somebody claims an expense.',
    icon: '\uD83E\uDDFE',
    module: 'self_service',
    trigger_type: 'event',
    trigger_config: { event: 'reimbursement_submitted', timing: 'on_event' },
    conditions: [],
    actions: [
      {
        type: 'send_notification',
        config: {
          recipients: 'manager',
          title: 'Reimbursement claim from {{employee_name}}',
          message: '{{employee_name}} ({{employee_code}}) has raised a reimbursement claim for your approval.',
        },
      },
      {
        type: 'send_notification',
        config: {
          recipients: 'specific_roles',
          specific_roles: ['payroll_admin'],
          title: 'New reimbursement claim',
          message: '{{employee_name}} from {{department}} has raised a reimbursement claim.',
        },
      },
    ],
  },

  // ── 15. Reimbursement Approved ─────────────────────────────────────────
  {
    id: 'reimbursement-approved',
    name: 'Reimbursement Approved',
    description: 'Tell the employee their claim has gone through and will be paid.',
    icon: '\uD83D\uDCB8',
    module: 'self_service',
    trigger_type: 'event',
    trigger_config: { event: 'reimbursement_approved', timing: 'on_event' },
    conditions: [],
    actions: [
      {
        type: 'send_notification',
        config: {
          recipients: 'employee',
          title: 'Your reimbursement has been approved',
          message:
            'Your reimbursement claim has been approved and will be paid with your next salary.',
        },
      },
    ],
  },

  // ── 16. Letter Requested ───────────────────────────────────────────────
  {
    id: 'letter-requested',
    name: 'Letter Request Raised',
    description: 'Tell HR when somebody asks for a salary certificate or other letter.',
    icon: '\u2709\uFE0F',
    module: 'self_service',
    trigger_type: 'event',
    trigger_config: { event: 'letter_requested', timing: 'on_event' },
    conditions: [],
    actions: [
      {
        type: 'send_notification',
        config: {
          recipients: 'hr_admins',
          title: 'Letter request from {{employee_name}}',
          message:
            '{{employee_name}} ({{employee_code}}) has asked for a letter. Please issue it from Self Service.',
        },
      },
    ],
  },

  // ── 17. Resignation Submitted ──────────────────────────────────────────
  {
    id: 'resignation-submitted',
    name: 'Resignation Received',
    description: 'Tell the manager and HR the moment somebody resigns.',
    icon: '\uD83D\uDEAA',
    module: 'separation',
    trigger_type: 'event',
    trigger_config: { event: 'resignation_submitted', timing: 'on_event' },
    conditions: [],
    actions: [
      {
        type: 'send_notification',
        config: {
          recipients: 'manager',
          title: '{{employee_name}} has resigned',
          message:
            '{{employee_name}} ({{employee_code}}) from {{department}} has submitted a resignation. Please review it.',
        },
      },
      {
        type: 'send_notification',
        config: {
          recipients: 'hr_admins',
          title: 'Resignation received — {{employee_name}}',
          message:
            '{{employee_name}} ({{employee_code}}) from {{department}} has submitted a resignation.',
        },
      },
    ],
  },

  // ── 18. Last Working Day Approaching ───────────────────────────────────
  // Seven days is enough to get the laptop back and close the accounts.
  {
    id: 'last-working-day-approaching',
    name: 'Last Working Day in 7 Days',
    description: 'Warn HR, IT and the manager a week before somebody leaves, so clearance starts in time.',
    icon: '\u23F3',
    module: 'separation',
    trigger_type: 'event',
    trigger_config: {
      event: 'last_working_day_approaching',
      timing: 'days_before',
      days_offset: 7,
    },
    conditions: [],
    actions: [
      {
        type: 'send_notification',
        config: {
          recipients: 'hr_admins',
          title: '{{employee_name}} leaves in 7 days',
          message:
            "{{employee_name}} ({{employee_code}}) has their last working day in a week. Please start exit clearance and the full and final settlement.",
        },
      },
      {
        type: 'send_notification',
        config: {
          recipients: 'manager',
          title: '{{employee_name}} leaves in 7 days',
          message:
            'Please make sure handover is complete and any company assets are returned.',
        },
      },
    ],
  },

  // ── 19. Self Review Due ────────────────────────────────────────────────
  {
    id: 'self-review-due',
    name: 'Self Review Reminder',
    description: 'Remind employees three days before their self review is due.',
    icon: '\uD83D\uDCDD',
    module: 'performance',
    trigger_type: 'event',
    trigger_config: {
      event: 'performance_self_review_due',
      timing: 'days_before',
      days_offset: 3,
    },
    conditions: [],
    actions: [
      {
        type: 'send_notification',
        config: {
          recipients: 'employee',
          title: 'Your self review is due in 3 days',
          message:
            'Please complete your self review under Performance, My Reviews before the deadline.',
        },
      },
    ],
  },

  // ── 20. Manager Review Due ─────────────────────────────────────────────
  {
    id: 'manager-review-due',
    name: 'Manager Review Reminder',
    description: 'Remind managers three days before their team reviews are due.',
    icon: '\uD83D\uDC65',
    module: 'performance',
    trigger_type: 'event',
    trigger_config: {
      event: 'performance_manager_review_due',
      timing: 'days_before',
      days_offset: 3,
    },
    conditions: [],
    actions: [
      {
        type: 'send_notification',
        config: {
          recipients: 'manager',
          title: 'Team reviews due in 3 days',
          message:
            'Please complete the reviews for your team under Performance, Team Reviews.',
        },
      },
    ],
  },

  // ── 21. Interview Scheduled ────────────────────────────────────────────
  {
    id: 'interview-scheduled',
    name: 'Interview Scheduled',
    description: 'Tell the interview panel when an interview is put in the diary.',
    icon: '\uD83D\uDCC5',
    module: 'recruitment',
    trigger_type: 'event',
    trigger_config: { event: 'interview_scheduled', timing: 'on_event' },
    conditions: [],
    actions: [
      {
        type: 'send_notification',
        config: {
          recipients: 'hr_admins',
          title: 'Interview scheduled',
          message:
            'An interview has been scheduled. Please check the recruitment pipeline for the candidate and the panel.',
        },
      },
    ],
  },

  // ── 22. Attendance Regularization Raised ───────────────────────────────
  {
    id: 'regularization-requested',
    name: 'Attendance Correction Raised',
    description: 'Tell the manager when somebody asks to correct their attendance.',
    icon: '\uD83D\uDD58',
    module: 'attendance',
    trigger_type: 'event',
    trigger_config: { event: 'attendance_regularization_requested', timing: 'on_event' },
    conditions: [],
    actions: [
      {
        type: 'send_notification',
        config: {
          recipients: 'manager',
          title: 'Attendance correction from {{employee_name}}',
          message:
            '{{employee_name}} ({{employee_code}}) has asked to correct an attendance entry. Please review it.',
        },
      },
    ],
  },
]

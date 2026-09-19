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
]

# Pulse HRMS — Development Conversation Export

> Exported on: 2026-05-08
> Project: Pulse HRMS (Augustinnovate Pvt. Ltd.)
> Repo: https://github.com/arpit3011226/pulse-hrms (private)
> Production: https://pulse-hrms.vercel.app
> Stack: React 19 + TypeScript + Vite + Supabase + TanStack React Query

---

## Table of Contents

1. [Supabase Ambiguous FK Resolution](#1-supabase-ambiguous-fk-resolution)
2. [Payroll Compute Fix](#2-payroll-compute-fix)
3. [Payroll Details Fix](#3-payroll-details-fix)
4. [Payroll Approve Fix](#4-payroll-approve-fix)
5. [Cycle Status Sync Fix](#5-cycle-status-sync-fix)
6. [Payroll Workflow Redesign](#6-payroll-workflow-redesign)
7. [Execute Payroll & CSV Export](#7-execute-payroll--csv-export)
8. [Payslip PDF Redesign](#8-payslip-pdf-redesign)
9. [GitHub & Vercel Deployment](#9-github--vercel-deployment)
10. [Key Files Reference](#10-key-files-reference)
11. [Recurring Patterns & Gotchas](#11-recurring-patterns--gotchas)

---

## 1. Supabase Ambiguous FK Resolution

### The Problem
Supabase PostgREST returns HTTP 300 when a table has multiple foreign key relationships to the same target table, because it can't determine which FK to use for the join.

### The Pattern
Use `!foreign_key_name` hint syntax to disambiguate:

```typescript
// BAD — ambiguous, causes HTTP 300
const { data } = await supabase
  .from('employee_compensation')
  .select('*, employee:employees(*)')

// GOOD — specify which FK to use
const { data } = await supabase
  .from('employee_compensation')
  .select('*, employee:employees!employee_id(*)')
```

### Specific Ambiguities Found

| Table | FK 1 | FK 2 | Fix |
|-------|------|------|-----|
| `employee_compensation` | `employee_id -> employees.id` | `created_by -> employees.id` | Use `!employee_id` |
| `employees` -> `departments` | `employees.department_id -> departments.id` | `departments.head_employee_id -> employees.id` | Use `!department_id` |
| `payroll_run_employees` | `employee_id -> employees.id` | (nested departments ambiguity) | Use `!employee_id` + `!department_id` |
| `payroll_adjustments` | `employee_id -> employees.id` | (nested) | Use `!employee_id` |

### Files Fixed (6 files, ~15 occurrences)
- `src/features/payroll/api/payroll.api.ts` (4 places)
- `src/features/payroll/api/tax.api.ts` (1 place)
- `src/features/attendance/api/attendance.api.ts` (2 places)
- `src/features/performance/api/performance.api.ts` (3 places)
- `src/features/reports/api/reports.api.ts` (3 places — NOT `job_requisitions` which has only 1 FK)

### How to Diagnose
Capture the actual Supabase error in the browser console:
```javascript
// Run in Chrome DevTools to see PostgREST error details
fetch('/rest/v1/your_table?select=*,employee:employees(*)', {
  headers: { apikey: 'your-key', Authorization: 'Bearer token' }
}).then(r => r.json()).then(console.log)
```
The error will say something like: "Could not embed because more than one relationship was found..."

---

## 2. Payroll Compute Fix

### Problem
Clicking "Compute" button on payroll runs returned "Failed to compute payroll" (HTTP 300).

### Root Cause
`employee_compensation` table has two FKs to `employees`: `employee_id` and `created_by`.

### Fix in `payroll.api.ts`
```typescript
// Before (broken)
.select('*, employee:employees(first_name, last_name, ...)')

// After (fixed)
.select('*, employee:employees!employee_id(first_name, last_name, ...)')
```

Also added cycle status update after compute:
```typescript
// Update parent cycle status to 'computed'
await supabase
  .from('payroll_cycles')
  .update({ processing_status: 'computed' })
  .eq('id', cycleId)
```

---

## 3. Payroll Details Fix

### Problem
"Employee Payroll Details" showed "No results found" when clicking Details button.

### Root Causes
1. Invalid PostgREST order syntax: `.order('employee(first_name)')` is not valid
2. Nested `department:departments()` was ambiguous because `departments.head_employee_id` creates a second relationship to employees

### Fixes
```typescript
// Fix 1: Remove invalid nested order, use simple order
.order('created_at', { ascending: true })

// Fix 2: Add !department_id hint on all nested department joins
.select(`
  *,
  employee:employees!employee_id(
    *,
    department:departments!department_id(name),
    designation:designations(title)
  )
`)
```

---

## 4. Payroll Approve Fix

### Problem
Clicking "Approve" gave "Failed to approve payroll run" error.

### Root Cause
`approved_by` column references `employees(id)` but code was passing `profile?.id` which is the auth profile UUID, not the employee ID.

### Fix
```typescript
// Before (broken — profile UUID)
approved_by: profile?.id

// After (fixed — employee ID)
approved_by: currentEmployee.id
```

---

## 5. Cycle Status Sync Fix

### Problem
Payroll cycle status stayed "Draft" even after runs were computed/approved.

### Fix
Added cycle status updates in compute and approve functions, plus cache invalidation:
```typescript
// In useComputePayroll hook
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['payroll-cycles'] })
  queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
}
```

---

## 6. Payroll Workflow Redesign

### New Flow
```
Draft -> Compute -> Validated -> Publish Payslips -> Submit for Approval (L1/L2) -> Execute Payroll -> Mark as Paid
```

### Changes
- **Removed**: Run-level approval (was individual per run)
- **Added**: Cycle-level approval flow
- **New stepper UI**: `payroll-run-workflow.tsx` with 6 stages
- **New components**:
  - `payroll-workflow/payroll-run-workflow.tsx` — stepper UI
  - `payroll-workflow/payroll-payslip-view.tsx` — payslip generation (gate changed to allow `completed` OR `approved`)
  - `payroll-workflow/payroll-processing-view.tsx` — improved error handling
  - `payroll-workflow/payroll-summary-cards.tsx` — summary cards

### Key Decision
Payslip generation gate was changed from `runStatus === 'approved'` to `(runStatus === 'completed' || runStatus === 'approved')` so payslips can be generated right after compute, before approval.

---

## 7. Execute Payroll & CSV Export

### New Function: `executePayrollForCycle()`
Located in `src/features/payroll/api/payroll.api.ts`:

```typescript
export async function executePayrollForCycle(cycleId: string, orgId: string) {
  // 1. Get cycle for month/year
  // 2. Get all runs for cycle
  // 3. Get payroll_run_employees with employee details
  // 4. Get bank accounts where is_salary_account = true
  // 5. Build CSV rows (name, code, net_pay, bank_name, account_number, ifsc_code)
  // 6. Generate and download CSV
  // 7. Update cycle status to 'paid'
}
```

### CSV Format
```
Employee Name, Employee Code, Net Pay (INR), Bank Name, Account Number, IFSC Code
```

### Utilities Added (`payroll-utils.ts`)
```typescript
export interface PayrollCSVRow {
  employeeName: string
  employeeCode: string
  netPay: number
  bankName: string
  accountNumber: string
  ifscCode: string
}
export function generatePayrollCSV(rows: PayrollCSVRow[], month: number, year: number): string
export function downloadCSV(csvContent: string, filename: string)
```

### Hook: `useExecutePayroll`
```typescript
export function useExecutePayroll() {
  // Uses executePayrollForCycle, invalidates payroll-cycles and payroll-runs caches
}
```

### UI Integration
"Execute Payroll" button appears in `payroll-runs-tab.tsx` when:
```typescript
approvalStatus === 'approved' && processing_status !== 'paid'
```

---

## 8. Payslip PDF Redesign

### File: `src/features/payroll/utils/generate-payslip-pdf.ts`

### Before (Old Design)
- Dark charcoal header bar
- Concentric circles Pulse logo
- White text on dark background
- Dark NET PAY box

### After (New Design)
- **Complete white background**
- **August concentric circles logo** (magenta/crimson brand color `[190, 30, 90]`)
- Thin magenta accent line at top
- "PAYSLIP" badge in light pink pill
- Employee details in light gray rounded card
- Attendance summary strip (Present Days, LOP Days, Pay Period)
- Earnings/Deductions table with magenta headers
- Total earnings in magenta, deductions in red
- **Green-tinted NET PAY box** with INR amount and words
- Magenta accent line above footer
- No "Pulse HRMS" branding

### August Logo Drawing (jsPDF)
```typescript
function drawAugustLogo(doc: jsPDF, x: number, y: number, size: number) {
  const cx = x + size / 2, cy = y + size / 2, r = size / 2
  // Outer circle (magenta)
  doc.setFillColor(190, 30, 90); doc.circle(cx, cy, r, 'F')
  // White ring
  doc.setFillColor(255, 255, 255); doc.circle(cx, cy, r * 0.75, 'F')
  // Middle circle (magenta)
  doc.setFillColor(190, 30, 90); doc.circle(cx, cy, r * 0.55, 'F')
  // Inner white ring
  doc.setFillColor(255, 255, 255); doc.circle(cx, cy, r * 0.35, 'F')
  // Center dot (magenta)
  doc.setFillColor(190, 30, 90); doc.circle(cx, cy, r * 0.18, 'F')
}
```

### Color Palette
```typescript
const C = {
  august: [190, 30, 90],      // Brand magenta
  augustLight: [252, 235, 243], // Light pink background
  accent: [190, 30, 90],       // Same as august
  accentBg: [252, 235, 243],   // Pill/badge background
  greenBg: [236, 253, 245],    // Net pay box background
  green: [16, 185, 129],       // Net pay box border
  // ... standard grays for text, borders, etc.
}
```

---

## 9. GitHub & Vercel Deployment

### Vercel
- **Project**: arpit-saxenas-projects-3f03ed5e/pulse-hrms
- **Production URL**: https://pulse-hrms.vercel.app
- **Deploy command**: `vercel --prod` (Vercel CLI installed globally)

### GitHub
- **Repo**: https://github.com/arpit3011226/pulse-hrms (private)
- **Push command**: `git push origin main`

### Deployment Steps
```bash
# Option 1: Vercel (what we use)
cd "/Users/arpish/Desktop/HRMS - August"
vercel --prod

# Option 2: Push to GitHub
git add <files>
git commit -m "message"
git push origin main
```

---

## 10. Key Files Reference

| File | Purpose |
|------|---------|
| `src/features/payroll/api/payroll.api.ts` | Core payroll API — compute, approve, execute, FK fixes |
| `src/features/payroll/hooks/use-payroll.ts` | React Query hooks — useComputePayroll, useExecutePayroll, etc. |
| `src/features/payroll/components/payroll-runs-tab.tsx` | Payroll runs UI with cycle-level actions |
| `src/features/payroll/components/payroll-workflow/payroll-run-workflow.tsx` | Workflow stepper component |
| `src/features/payroll/components/payroll-workflow/payroll-payslip-view.tsx` | Payslip generation view |
| `src/features/payroll/components/payroll-workflow/payroll-processing-view.tsx` | Processing/compute view |
| `src/features/payroll/utils/generate-payslip-pdf.ts` | jsPDF payslip template (August branded) |
| `src/features/payroll/utils/payroll-utils.ts` | CSV export utilities |
| `src/features/payroll/utils/number-to-words.ts` | Number to Indian English words |
| `src/features/payroll/api/tax.api.ts` | Tax API with FK fix |
| `src/features/attendance/api/attendance.api.ts` | Attendance API with FK fixes |
| `src/features/performance/api/performance.api.ts` | Performance API with FK fixes |
| `src/features/reports/api/reports.api.ts` | Reports API with FK fixes |

---

## 11. Recurring Patterns & Gotchas

### 1. Always use FK hints with Supabase
Any time you join `employees` or `departments`, check if the table has multiple FKs to that target. If yes, add `!fk_column_name`.

### 2. PostgREST doesn't support nested ordering
`.order('employee(first_name)')` will silently fail or error. Order by a direct column instead.

### 3. Payroll cycle vs run status
- **Cycle**: top-level (draft -> computed -> approved -> paid)
- **Run**: per-department (draft -> completed -> approved)
- Always update the parent cycle when a run changes status

### 4. Approval uses employee ID, not profile ID
`approved_by` FK points to `employees.id`, not `auth.users.id`. Use `currentEmployee.id`.

### 5. Payslip generation gate
Payslips can be generated when run status is `completed` OR `approved` (not just approved).

### 6. Bank accounts for CSV export
Use `employee_bank_accounts` table with `is_salary_account = true` to get salary bank details.

### 7. Cache invalidation
After any mutation (compute, approve, execute), invalidate both `payroll-cycles` and `payroll-runs` query caches.

### 8. Payroll config
Two-level approval (L1/L2) configured via `payroll_config` table settings.

---

## Database Tables Referenced

- `payroll_cycles` — monthly payroll cycles
- `payroll_runs` — per-department runs within a cycle
- `payroll_run_employees` — individual employee payroll records
- `payroll_adjustments` — manual adjustments
- `employee_compensation` — salary components (has `employee_id` + `created_by` FKs)
- `employees` — employee records (has `department_id` FK)
- `departments` — departments (has `head_employee_id` FK back to employees)
- `employee_bank_accounts` — bank details with `is_salary_account` flag
- `payroll_config` — approval workflow settings
- `salary_components` — component definitions (Basic, HRA, etc.)

---

## Tech Stack Summary

- **Frontend**: React 19 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + PostgREST + Auth)
- **State**: TanStack React Query v5
- **PDF**: jsPDF
- **Deployment**: Vercel (`vercel --prod`)
- **Repo**: GitHub (private) — https://github.com/arpit3011226/pulse-hrms

---

*This document was exported from a Claude Code conversation on 2026-05-08.*

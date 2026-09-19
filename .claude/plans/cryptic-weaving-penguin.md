# Employee Lifecycle Management - Implementation Plan

## Context
The HRMS app currently has a basic employee CRUD with a flat `employees` table. Key data like addresses, bank details, and emergency contacts are stored as JSONB blobs. The PRD (Section 8) defines 19 normalized employee sub-tables for a proper enterprise HRMS. The user wants: onboarding, offboarding, performance, promotions, payroll details — the full employee lifecycle. This plan covers normalizing the employee data model and building rich UI for managing employee lifecycle events.

## Scope (Prioritized for Rollout)

### Must-Have Tables (12 new tables)
1. `employee_personal_details` — religion, nationality, father/mother/spouse name
2. `employee_addresses` — multiple typed addresses (permanent, current, emergency)
3. `employee_emergency_contacts` — multiple contacts with priority
4. `employee_identity_documents` — PAN, Aadhar, passport, etc. with metadata
5. `employee_bank_accounts` — multiple accounts, salary account flag
6. `employee_dependents` — spouse, children, parents
7. `employee_nominees` — insurance/statutory nominees
8. `employee_work_profiles` — effective-dated org assignments (promotion/transfer history)
9. `employee_exit_records` — resignation, termination, offboarding
10. `employee_status_history` — lifecycle status audit trail
11. `employee_org_history` — department/designation/manager change log
12. `employee_documents` — employee-specific document management

### Deferred Tables (not in this implementation)
- employee_probation_details, employee_confirmation_records, employee_rehire_records
- employee_tags, employee_tag_mappings
- employee_custom_field_definitions, employee_custom_field_values

---

## Implementation Steps

### Step 1: Database Migration (`supabase/migrations/00005_employee_lifecycle.sql`)

**Extend `employees` table:**
- Add: `salutation`, `middle_name`, `full_name` (generated), `official_phone`, `confirmation_date`, `employment_status` (richer enum: draft/active/on_notice/resigned/terminated/absconding/retired/inactive)
- Add: `company_id` (nullable, for multi-company support later)

**Create 12 new tables** (all with `organization_id` FK, `created_at`, `updated_at`):

| Table | Key Columns |
|-------|-------------|
| employee_personal_details | employee_id (1:1), marital_status, nationality, blood_group, religion, father_name, mother_name, spouse_name, personal_email, personal_phone |
| employee_addresses | employee_id, address_type (permanent/current/emergency), line1, line2, city, state, country, pincode, is_primary |
| employee_emergency_contacts | employee_id, contact_name, relationship, phone, email, priority_order |
| employee_identity_documents | employee_id, document_type (pan/aadhar/passport/voter_id/driving_license), document_number, name_on_document, issue_date, expiry_date, file_url, verification_status |
| employee_bank_accounts | employee_id, bank_name, branch_name, account_number, ifsc_code, account_type, is_salary_account |
| employee_dependents | employee_id, dependent_name, relationship, dob, gender, is_nominee |
| employee_nominees | employee_id, nominee_name, relationship, allocation_percent, applicable_for |
| employee_work_profiles | employee_id, department_id, designation_id, location_id, reporting_manager_id, dotted_line_manager_id, employment_type, effective_from, effective_to, change_reason |
| employee_exit_records | employee_id, resignation_date, last_working_date, exit_type (resignation/termination/retirement/absconding/contract_end), exit_reason, regretted_attrition, status, exit_interview_notes, clearance_status |
| employee_status_history | employee_id, previous_status, new_status, changed_on, reason, changed_by |
| employee_org_history | employee_id, change_type (promotion/transfer/redesignation/manager_change), old_department_id, new_department_id, old_designation_id, new_designation_id, old_manager_id, new_manager_id, effective_from, remarks |
| employee_documents | employee_id, document_category, document_name, file_url, file_size, expiry_date, verification_status, uploaded_by |

**RLS policies** for all new tables + **indexes** on FKs.

### Step 2: TypeScript Types (`src/types/database.types.ts`)
- Add interfaces for all 12 new tables
- Add joined types: `EmployeeWithFullProfile`, `EmployeeWorkProfileWithRelations`
- Update `Database` type to include new tables

### Step 3: Constants (`src/lib/constants.ts`)
- `EMPLOYMENT_STATUSES_EXTENDED` (draft/active/on_notice/resigned/terminated/absconding/retired/inactive)
- `EXIT_TYPES` (resignation/termination/retirement/absconding/contract_end)
- `ADDRESS_TYPES` (permanent/current/emergency)
- `DOCUMENT_TYPES` (pan/aadhar/passport/voter_id/driving_license/other)
- `RELATIONSHIP_TYPES` (father/mother/spouse/son/daughter/sibling/other)
- `BANK_ACCOUNT_TYPES` (savings/current)
- `VERIFICATION_STATUSES` (pending/verified/rejected)
- `CLEARANCE_STATUSES` (pending/in_progress/completed)
- `ORG_CHANGE_TYPES` (promotion/transfer/redesignation/manager_change)

### Step 4: Permissions (`src/hooks/use-permissions.ts`)
- Add: `canManageEmployeeDocuments`, `canInitiateExit`, `canManageWorkProfiles`

### Step 5: API Layer (`src/features/employees/api/employee-lifecycle.api.ts`)
Following the same pattern as `leave.api.ts`:
- Personal Details: get/upsert (1:1 with employee)
- Addresses: getAll/create/update/delete
- Emergency Contacts: getAll/create/update/delete
- Identity Documents: getAll/create/update/delete
- Bank Accounts: getAll/create/update/delete/setSalaryAccount
- Dependents: getAll/create/update/delete
- Nominees: getAll/create/update/delete
- Work Profiles: getAll/create (with auto org_history logging)
- Exit Records: get/create/update
- Status History: getAll (read-only, auto-logged)
- Org History: getAll (read-only, auto-logged)
- Documents: getAll/upload/delete

### Step 6: Hooks Layer (`src/features/employees/hooks/use-employee-lifecycle.ts`)
React Query hooks wrapping each API function, following `use-leave.ts` pattern.

### Step 7: Enhance Employee Detail View
Transform `employee-detail.tsx` from 4 placeholder tabs to a rich profile view:

**Tabs:**
1. **Overview** — summary cards (personal info, employment, current assignment)
2. **Personal** — personal details + addresses + emergency contacts (inline edit)
3. **Documents & ID** — identity documents + employee documents (upload/manage)
4. **Bank & Finance** — bank accounts + nominees + dependents
5. **Work History** — timeline of promotions/transfers/designation changes
6. **Leave** — leave balances + recent requests (link to leave module)
7. **Exit** — exit record (only visible if employee is on_notice/resigned/terminated)

**New Components:**
| Component | Purpose |
|-----------|---------|
| `employee-personal-tab.tsx` | Personal details form + addresses + emergency contacts |
| `employee-documents-tab.tsx` | Identity documents + employee documents management |
| `employee-bank-tab.tsx` | Bank accounts + dependents + nominees |
| `employee-work-history-tab.tsx` | Work profile timeline + org history |
| `employee-exit-tab.tsx` | Exit record management |
| `employee-address-form.tsx` | Address add/edit dialog |
| `employee-contact-form.tsx` | Emergency contact add/edit dialog |
| `employee-document-form.tsx` | Document upload dialog |
| `employee-bank-form.tsx` | Bank account add/edit dialog |
| `employee-dependent-form.tsx` | Dependent/nominee add/edit dialog |
| `employee-promotion-dialog.tsx` | Promote/transfer/redesignate dialog (creates work_profile + org_history) |
| `employee-exit-dialog.tsx` | Initiate exit dialog |

### Step 8: Enhance Employee Form
Update `employee-form.tsx` to include more fields in the creation flow:
- Add salutation, middle_name fields to personal tab
- Add probation_end_date, confirmation_date to employment tab
- Replace "Other Details" placeholder with actual address/bank/emergency forms

### Step 9: Update Employee List
- Add "Employment Status" column with richer status badges
- Add bulk actions: Bulk status change
- Add quick actions: Promote, Transfer, Initiate Exit in row dropdown

### Step 10: Update Existing Files
- `src/router.tsx` — no new routes needed (employee detail is already routed)
- `src/components/layout/sidebar.tsx` — no changes needed (employees already in nav)
- `src/lib/constants.ts` — add new constants
- `src/hooks/use-permissions.ts` — add new permissions

---

## File Summary

| File | Action |
|------|--------|
| `supabase/migrations/00005_employee_lifecycle.sql` | CREATE |
| `src/types/database.types.ts` | EDIT — add 12 interfaces + joined types |
| `src/lib/constants.ts` | EDIT — add lifecycle constants |
| `src/hooks/use-permissions.ts` | EDIT — add employee lifecycle permissions |
| `src/features/employees/api/employee-lifecycle.api.ts` | CREATE |
| `src/features/employees/hooks/use-employee-lifecycle.ts` | CREATE |
| `src/features/employees/components/employee-detail.tsx` | EDIT — complete rewrite with tabs |
| `src/features/employees/components/employee-form.tsx` | EDIT — add more fields |
| `src/features/employees/components/employee-list.tsx` | EDIT — add status column + actions |
| `src/features/employees/components/employee-personal-tab.tsx` | CREATE |
| `src/features/employees/components/employee-documents-tab.tsx` | CREATE |
| `src/features/employees/components/employee-bank-tab.tsx` | CREATE |
| `src/features/employees/components/employee-work-history-tab.tsx` | CREATE |
| `src/features/employees/components/employee-exit-tab.tsx` | CREATE |
| `src/features/employees/components/employee-address-form.tsx` | CREATE |
| `src/features/employees/components/employee-contact-form.tsx` | CREATE |
| `src/features/employees/components/employee-document-form.tsx` | CREATE |
| `src/features/employees/components/employee-bank-form.tsx` | CREATE |
| `src/features/employees/components/employee-dependent-form.tsx` | CREATE |
| `src/features/employees/components/employee-promotion-dialog.tsx` | CREATE |
| `src/features/employees/components/employee-exit-dialog.tsx` | CREATE |

## Verification
1. Run migration against Supabase
2. Start dev server and navigate to `/employees`
3. Verify employee list loads with new status column
4. Click into an employee — verify all tabs render
5. Test adding address, emergency contact, bank account, document
6. Test promotion flow — verify work history timeline updates
7. Test exit flow — verify status change and exit record creation
8. Check TypeScript compilation passes (`npx tsc --noEmit`)

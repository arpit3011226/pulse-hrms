# Pulse HRMS - Feedback & Bug Tracker

Track feedback, bugs, and improvements for regular build releases.

---

## Pending

<!-- Add items here as they come up. Move to Done when shipped. -->

| # | Type | Module | Description | Priority | Reported |
|---|------|--------|-------------|----------|----------|
| 9 | enhancement | payroll | Payroll date should be configurable by admin/HR as last working Friday of each month (skip holidays). Two-level approval flow for payroll finalisation and execution. Email + in-app notification reminders 5 days before payroll date to finalise | high | 2026-03-14 |
| 12 | enhancement | auth | Create dummy/seed users for each role (Admin, HR, Manager, Employee, etc.) to enable end-to-end testing of the full application | high | 2026-03-14 |
| 13 | enhancement | payroll | Indian Income Tax provisioning — Full-time employees: TDS u/s 192 (monthly deduction based on projected annual income, old/new regime slabs, 80C/80D/HRA exemptions, Form 16). Contractors: TDS u/s 194C (1%/2%) or 194J (10% for professional services), flat rate, no slab benefits, Form 16A. Build tax declaration workflow, proof submission, and regime selection for employees | critical | 2026-03-15 |

## In Progress

| # | Type | Module | Description | Priority | Started |
|---|------|--------|-------------|----------|---------|

## Done

| # | Type | Module | Description | Shipped |
|---|------|--------|-------------|---------|
| 1 | ui-fix | performance | Cycle form dialog not responsive — footer overlaps skip criteria content on smaller screens | 2026-03-15 |
| 2 | enhancement | reports | Add People Analytics tab — headcount, attrition rate, avg tenure, open positions with department filter, trend charts, department breakdown bars | 2026-03-15 |
| 3 | enhancement | reports | Add Sentiment Analytics tab — engagement drivers with progress bars, deltas, and department heatmap | 2026-03-15 |
| 4 | enhancement | employees | Employee codes auto-generated (EMP-0001 format), never repeat, read-only in create form | 2026-03-15 |
| 5 | enhancement | employees | Bulk employee upload via CSV with downloadable template and validation | 2026-03-15 |
| 6 | enhancement | payroll | Payslips viewable in-app with both "View" and "Download" buttons | 2026-03-15 |
| 7 | ui-fix | global | Pointer/hand cursor on all clickable elements (buttons, links, tabs, checkboxes, etc.) | 2026-03-15 |
| 8 | ui-fix | dashboard | Dashboard stat cards and quick actions now use multi-colored icons per category | 2026-03-15 |
| 10 | bug | global | Fixed create actions — payroll cycle missing cycle_name, performance cycle sending unmigrated columns | 2026-03-15 |
| 11 | ui-fix | payroll | Fixed payroll cycle create dialog — responsive layout + centered positioning | 2026-03-15 |

---

**Type**: `bug` | `enhancement` | `ui-fix` | `perf` | `refactor`
**Priority**: `critical` | `high` | `medium` | `low`
**Module**: e.g. `performance`, `payroll`, `employees`, `leave`, `attendance`, `auth`, `settings`, `dashboard`

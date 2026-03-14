# Pulse HRMS - Feedback & Bug Tracker

Track feedback, bugs, and improvements for regular build releases.

---

## Pending

<!-- Add items here as they come up. Move to Done when shipped. -->

| # | Type | Module | Description | Priority | Reported |
|---|------|--------|-------------|----------|----------|
| 20 | bug | performance | Add competency not working | high | 2026-03-15 |
| 21 | enhancement | employees | Simplify employee details — combine all sections (bank, docs, family, compliance, etc.) into one unified screen with expandable sections, permission-gated editing | high | 2026-03-15 |

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
| 9 | enhancement | payroll | Payroll date configurable (last working Friday), two-level approval flow, reminder settings | 2026-03-15 |
| 12 | enhancement | auth | Seed/demo users for all roles (Admin, HR, Manager, Employee, Contractor) with departments & designations | 2026-03-15 |
| 13 | enhancement | payroll | Indian Income Tax — TDS u/s 192 (Old/New regime, 80C/80D/HRA/NPS), employee declaration form, admin verification, contractor TDS 194C/194J | 2026-03-15 |
| 14 | bug | payroll | Failed to create payroll cycle — RLS policy missing hr_admin role, fixed | 2026-03-15 |
| 15 | bug | payroll | Failed to create payroll structure — salary_structure_id missing from component inserts, fixed | 2026-03-15 |
| 16 | bug | payroll | Failed to create salary components — improved error surfacing for RLS failures | 2026-03-15 |
| 17 | bug | attendance | Clock-in not working — RLS broadened for attendance insert, error logging added | 2026-03-15 |
| 18 | bug | performance | Assign Goal button not refreshing — added team-goals cache invalidation | 2026-03-15 |
| 19 | ui-fix | performance | Cycle form dialog still overlapping — rebuilt with calc-based ScrollArea + border-separated footer | 2026-03-15 |

---

**Type**: `bug` | `enhancement` | `ui-fix` | `perf` | `refactor`
**Priority**: `critical` | `high` | `medium` | `low`
**Module**: e.g. `performance`, `payroll`, `employees`, `leave`, `attendance`, `auth`, `settings`, `dashboard`

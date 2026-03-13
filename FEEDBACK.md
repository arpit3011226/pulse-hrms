# Pulse HRMS - Feedback & Bug Tracker

Track feedback, bugs, and improvements for regular build releases.

---

## Pending

<!-- Add items here as they come up. Move to Done when shipped. -->

| # | Type | Module | Description | Priority | Reported |
|---|------|--------|-------------|----------|----------|
| 1 | ui-fix | performance | Cycle form dialog not responsive — footer overlaps skip criteria content on smaller screens | high | 2026-03-14 |
| 2 | enhancement | reports | Add People Analytics tab — headcount, attrition rate, avg tenure, open positions with department filter, trend charts, department breakdown bars | high | 2026-03-14 |
| 3 | enhancement | reports | Add Sentiment Analytics tab — engagement drivers (Work-Life Balance, Career Growth, Manager Support, Compensation, Team Culture) with progress bars, deltas, and department heatmap | high | 2026-03-14 |
| 4 | enhancement | employees | Employee codes should be auto-generated following a sequence/format (e.g. EMP-0001) and never repeat — remove manual entry | high | 2026-03-14 |
| 5 | enhancement | employees | Bulk employee upload via CSV — provide downloadable template within the app and upload option to create employees | high | 2026-03-14 |
| 6 | enhancement | payroll | Payslips should be viewable in-app (modal/page) with both "View" and "Download" buttons instead of download-only | medium | 2026-03-14 |
| 7 | ui-fix | global | All hyperlinks and clickable elements should show pointer/hand cursor — currently many show default mouse cursor | medium | 2026-03-14 |
| 8 | ui-fix | dashboard | Make dashboard colorful and lively for all roles — use multi-colored icons instead of single-tone, vibrant cards and charts | high | 2026-03-14 |
| 9 | enhancement | payroll | Payroll date should be configurable by admin/HR as last working Friday of each month (skip holidays). Two-level approval flow for payroll finalisation and execution. Email + in-app notification reminders 5 days before payroll date to finalise | high | 2026-03-14 |
| 10 | bug | global | Create actions failing across multiple modules (payroll cycle, performance cycle, etc.) — likely payload includes columns that don't exist in DB yet. Audit and fix all create mutations | critical | 2026-03-14 |
| 11 | ui-fix | payroll | Payroll cycle create dialog mispositioned (pushed to left edge of screen, same issue as performance cycle dialog) | medium | 2026-03-14 |
| 12 | enhancement | auth | Create dummy/seed users for each role (Admin, HR, Manager, Employee, etc.) to enable end-to-end testing of the full application | high | 2026-03-14 |

## In Progress

| # | Type | Module | Description | Priority | Started |
|---|------|--------|-------------|----------|---------|

## Done

| # | Type | Module | Description | Shipped |
|---|------|--------|-------------|---------|

---

**Type**: `bug` | `enhancement` | `ui-fix` | `perf` | `refactor`
**Priority**: `critical` | `high` | `medium` | `low`
**Module**: e.g. `performance`, `payroll`, `employees`, `leave`, `attendance`, `auth`, `settings`, `dashboard`

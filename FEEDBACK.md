# Pulse HRMS - Feedback & Bug Tracker

Track feedback, bugs, and improvements for regular build releases.

---

## Pending

<!-- Add items here as they come up. Move to Done when shipped. -->

| # | Type | Module | Description | Priority | Reported |
|---|------|--------|-------------|----------|----------|
| 20 | bug | performance | Add competency not working | high | 2026-03-15 |
| 21 | enhancement | employees | Simplify employee details — unified screen (**now tracked as F1 in roadmap below**) | high | 2026-03-15 |
| 22 | enhancement | workflows | Add file/attachment support in workflow actions — allow attaching documents (e.g. offer letters, policy docs) to notification and email actions | medium | 2026-03-15 |

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

# Feature Roadmap — 4 Journeys

Agreed 23 Sep 2026. Build in sequence, respecting dependencies.
Status: `todo` | `wip` | `done`

**Out of scope**: Form 16, PF ECR, ESI returns — outsourced to agency (F41 exports data to them).

## Phase 1 — Switch on what already exists (2 weeks)

Working code that no screen reaches today. Highest return per day.

| ID | Feature | Module | Effort | Status |
|----|---------|--------|--------|--------|
| F1 | Employee 360 hub — profile, attendance, time-off, reviews, goals, documents, payroll, offboarding in one screen (was #21) | employees | S | **done** |
| F2 | Employee survey response — staff can answer surveys | reports | S | **done** |
| F3 | Candidate to employee conversion | recruitment | S | todo |
| F4 | Leave encashment request and approval | leave | S | todo |
| F5 | Leave policy assignment to employees (single + bulk) | leave | S | todo |
| F6 | Leave blackout periods and carry-forward processing | leave | S | todo |
| F7 | Attendance regularisation approval screen | attendance | S | todo |
| F8 | Shift roster assignment (single + bulk) | attendance | S | todo |
| F9 | Payroll adjustments, payslip detail, run approval | payroll | M | todo |
| F10 | TDS record storage and view | payroll | M | todo |
| F11 | Skip-level reviews and goal hierarchy view | performance | M | todo |

## Phase 2 — Foundation (3 days)

F43 blocks F17 and all of Phase 5.

| ID | Feature | Module | Effort | Status |
|----|---------|--------|--------|--------|
| F43 | Unified identity — candidate to employee to alumnus on personal email | auth | M | todo |
| F44 | Approval delegation when approver is away | global | S | todo |
| F45 | Global search | global | S | todo |

## Phase 3 — Onboard (2 weeks)

| ID | Feature | Module | Effort | Status |
|----|---------|--------|--------|--------|
| F22 | Onboarding task engine — tasks, owners, due dates, dependencies | onboarding | L | todo |
| F23 | Pre-joining — document collection, joining formalities | onboarding | M | todo |
| F24 | Day 1 checklist — assets, accounts, seating, induction | onboarding | M | todo |
| F25 | 30/60/90/180/365 day journeys with auto-triggered surveys | onboarding | L | todo |
| F26 | Probation tracking to confirmation letter | onboarding | M | todo |
| F27 | Buddy/mentor assignment and check-ins | onboarding | S | todo |
| F28 | Onboarding dashboard — progress, overdue tasks | onboarding | M | todo |
| F29 | Asset management — issue, return, recovery (needed by onboard + exit) | assets | M | todo |

## Phase 4 — Hire (1.5 weeks)

| ID | Feature | Module | Effort | Status |
|----|---------|--------|--------|--------|
| F12 | Requisition approval — approver, status, budget check | recruitment | M | todo |
| F13 | Offer letter as PDF with accept/decline and revisions | recruitment | M | todo |
| F14 | Interview scheduling — invites, availability, reschedule, reminders | recruitment | M | todo |
| F15 | Structured interview scorecards | recruitment | S | todo |
| F16 | Candidate pool — rejection reasons, tags, revisit, search | recruitment | M | todo |
| F19 | Hiring analytics — time to hire, acceptance rate, funnel | recruitment | M | todo |
| F17 | Candidate portal — login, status, documents, offer acceptance (needs F43) | recruitment | L | todo |
| F18 | Background verification tracking | recruitment | M | todo |

## Phase 5 — Retire / Alumni (1 week)

Needs F43.

| ID | Feature | Module | Effort | Status |
|----|---------|--------|--------|--------|
| F38 | Full and final settlement — statement and workflow | separation | M | todo |
| F39 | Alumni document access — payslips, Form 16, relieving, experience letters | alumni | M | todo |
| F40 | Alumni directory, rehire eligibility, boomerang hiring | alumni | M | todo |
| F41 | Payroll data export for outsourced agency | payroll | S | todo |
| F42 | Structured exit interview with trend analysis | separation | S | todo |

## Phase 6 — Lifecycle fills (1.5 weeks)

| ID | Feature | Module | Effort | Status |
|----|---------|--------|--------|--------|
| F30 | HR helpdesk — categories, SLA, routing, escalation | helpdesk | M | todo |
| F31 | Travel request and advance | self-service | M | todo |
| F32 | Document expiry tracking and renewal reminders | employees | S | todo |
| F33 | Attendance depth — geo-fencing, mobile punch, overtime policy | attendance | M | todo |
| F34 | Recognition and rewards | engagement | M | todo |
| F35 | Pulse surveys (short, recurring) | engagement | S | todo |
| F36 | Manager tools — team calendar, bulk approvals, team cost view | global | M | todo |
| F46 | Policy acknowledgement | settings | S | todo |
| F47 | Notification preferences and digest | global | M | todo |
| F48 | Bulk operations across modules | global | S | todo |
| F49 | DPDP basics — data export, consent record, erasure | settings | M | todo |
| F50 | Stronger audit trail — who changed what, old value | global | M | todo |
| F51 | Mobile-friendly / PWA | global | M | todo |
| F52 | In-app help and first-run tour | global | S | todo |
| F53 | Location-wise holiday calendar | leave | S | todo |
| F54 | Two-factor for admin roles | auth | S | todo |

## Phase 7 — Claude end-to-end testing (1 week)

Every screen, every role, every journey. Defects logged above and fixed.

## Phase 8 — Human testing

Arpit first, then leadership, HR and managers from every function.

## Deferred

| ID | Feature | Reason |
|----|---------|--------|
| F20 | Careers page and job posting | Not worth it at 50 people |
| F21 | Employee referral module | Not worth it at 50 people |
| F37 | Succession planning, position management | Not worth it at 50 people |
| — | Multi-entity support | Only if Pulse is sold externally |

---

**Type**: `bug` | `enhancement` | `ui-fix` | `perf` | `refactor`
**Priority**: `critical` | `high` | `medium` | `low`
**Module**: e.g. `performance`, `payroll`, `employees`, `leave`, `attendance`, `auth`, `settings`, `dashboard`

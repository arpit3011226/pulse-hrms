# Test Case Matrix

Only tests that were actually executed carry a result. Everything else is
marked **Not run** — no test is recorded as passing unless it ran.

## Executed

### Authorization — automated, `QA/scripts/access_matrix.py`

| ID | Role | Objective | Expected | Actual | Result |
|---|---|---|---|---|---|
| AUTH-01 | all 7 | No table has RLS on with no policy | 0 such tables | 0 | **Pass** |
| AUTH-02 | all 7 | No read policy evaluates to `true` | 0 such policies | 0 | **Pass** |
| AUTH-03 | anon | No function executable without signing in | 0 | 1 → fixed → 0 | **Fail → Pass** (QA-02) |
| AUTH-04 | employee | Cannot read `employee_statutory` | 0 rows | 0 | **Pass** |
| AUTH-05 | employee | Cannot read `employee_personal` | 0 rows | 0 | **Pass** |
| AUTH-06 | employee | Sees only own compensation | own only | own only | **Pass** |
| AUTH-07 | manager | Sees own + direct reports' compensation | 4 rows | 4 | **Pass** |
| AUTH-08 | hr_admin | Cannot reach leadership pay | < all rows | 32 of 40 | **Pass** |
| AUTH-09 | employee | Cannot read `payroll_runs` totals | 0 rows | 4 → fixed → 0 | **Fail → Pass** (QA-01) |
| AUTH-10 | employee | Cannot read per-person payroll | 0 rows | 0 | **Pass** |
| AUTH-11 | HR, admin, leadership, payroll | Cannot read mentorship check-in notes | 0 rows | 0 | **Pass** |
| AUTH-12 | employee, contractor | Sees only own leave balances | own only | own only | **Pass** |
| AUTH-13 | employee, contractor | Cannot read `interview_feedback` | 0 rows | 0 | **Pass** |
| AUTH-14 | employee, contractor | Cannot read `job_requisition_budget` | 0 rows | 0 | **Pass** |
| AUTH-15 | employee, contractor, manager | Cannot read `workflow_runs` | 0 rows | 0 | **Pass** |

210 role × table checks in total; the table lists the ones with a stated rule.

### Leave — end to end, two roles, through the UI

| ID | Role | Step | Expected | Actual | Result |
|---|---|---|---|---|---|
| LV-01 | employee | Open Apply Leave from the home page | Form opens | Opens | **Pass** |
| LV-02 | employee | Balance before applying | 12 casual available | 12 | **Pass** |
| LV-03 | employee | Submit 2 days | Saved and listed without reload | Listed immediately | **Fail → Pass** (QA-03) |
| LV-04 | employee | Balance after applying | 10 available, 2 pending | 10 / 2 | **Fail → Pass** (QA-04) |
| LV-05 | manager | Request visible under Team Leaves | Visible | Visible | **Pass** |
| LV-06 | manager | Approve | Status approved | Approved | **Pass** |
| LV-07 | — | Balance after approval | used 2, pending 0 | used 2, pending 0 | **Pass** |
| LV-08 | employee | Over-book: 20 days against 12 | Refused | Accepted → fixed → refused | **Fail → Pass** (QA-04) |
| LV-09 | — | Delete a pending request | Days returned | Returned | **Pass** |
| LV-10 | employee | Sick leave offered for encashment | Not offered | Not offered | **Pass** (QA-07) |
| LV-11 | employee | Encashment shows eligible balance | States the number | "up to 15 days" | **Pass** |

### Helpdesk

| ID | Role | Objective | Expected | Actual | Result |
|---|---|---|---|---|---|
| HD-01 | employee | Category picker is populated | 11 categories | 11 | **Pass** (QA-06) |
| HD-02 | employee | Raise a ticket | Created and listed | HD-0002 created | **Fail → Pass** (QA-05) |
| HD-03 | — | SLA stamped from the category | +4h / +24h | exactly +4h / +24h | **Pass** |

### Self-service letters

| ID | Role | Objective | Expected | Actual | Result |
|---|---|---|---|---|---|
| SS-01 | employee | Salary certificate shows the salary | A figure | "₹12,00,000" in the PDF | **Fail → Pass** (QA-10) |

### Navigation

| ID | Objective | Expected | Actual | Result |
|---|---|---|---|---|
| NV-01 | Quick Action "Apply Leave" | Opens the form | Opens | **Fail → Pass** (QA-12) |
| NV-02 | Quick Action "View Payslips" | Lands on My Payslips | Lands correctly | **Pass** |
| NV-03 | Signed-out visit to a protected URL | Login page, clean console | Clean | **Fail → Pass** (QA-14) |

## Not run

Every case below is designed but **was not executed**. None should be read as
passing.

| Module | Cases | Why not run |
|---|---|---|
| Payroll calculation | Run a cycle; verify gross, deductions, PF, ESI, PT, TDS, rounding, payslip totals | Demo employees have no payroll rows; not yet attempted |
| Attendance | Mark, correct, approve, overnight shifts, month boundaries, totals | Not started |
| Performance | Goals, check-ins, self/manager/peer review, calibration, PIP | Not started |
| Recruitment | Requisition → candidate → interview → feedback → offer → convert | Only the application form tested |
| Onboarding | Journey, tasks, document collection | Not started |
| Separation | Resignation → clearance → settlement → relieve → alumni | No leaver exists |
| Workflows | Triggers, actions, runs | Not started |
| Reports | Figures against source data | Not started |
| File uploads | Can one employee fetch another's documents? | Storage policies not enumerated — **highest-risk gap** |
| Concurrency | Two approvers on one request; double submission | One browser session available |
| Session | Expiry, refresh, logout propagation | Not started |
| Cross-browser, mobile | | Chromium only |

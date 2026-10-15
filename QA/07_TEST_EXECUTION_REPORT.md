# Test Execution Report

**Window** 15 October 2026, one session · **Environment** local app against the live Supabase project, with your approval for destructive testing

## Live status

| Module | Executed | Passed | Failed | Fixed | Status |
|---|---:|---:|---:|---:|---|
| Authorization | 210 | 208 | 2 | 2 | **Good coverage** |
| Leave | 11 | 8 | 3 | 3 | **Good coverage** |
| Helpdesk | 3 | 1 | 2 | 2 | Moderate |
| Self-service letters | 1 | 0 | 1 | 1 | Moderate |
| Navigation | 3 | 1 | 2 | 2 | Moderate |
| Mentorship | 8 | 8 | 0 | 0 | Rules only, no UI |
| Payroll | access only | — | — | — | **Not tested** |
| Attendance | 0 | — | — | — | **Not tested** |
| Performance | 0 | — | — | — | **Not tested** |
| Recruitment | 1 | 0 | 1 | 1 | **Barely tested** |
| Onboarding, separation, workflows, reports, assets | 0 | — | — | — | **Not tested** |

## Defects this session

| ID | Severity | Found by | Status |
|---|---|---|---|
| QA-01 payroll totals readable by all | P1 | Automated matrix | Fixed, retested |
| QA-02 function executable by anon | P3 | Automated matrix | Fixed, retested |
| QA-03 leave list did not refresh | P2 | E2E workflow | Fixed, retested |
| QA-04 leave balances unenforced | P1 | Negative API test | Fixed, retested |

All four found in the first systematic pass over two of twenty modules. That
ratio is the main evidence for the readiness verdict.

## Method notes

**What worked.** Attacking the API directly rather than through the forms found
both P1 defects. Both looked correct in the UI.

**What did not.** Reading policies is not testing them. QA-01 sat in a policy
that reads sensibly — "members of the organisation can read payroll runs" —
and is wrong only when you notice the table holds the wage bill.

**A caution.** My first expectation table flagged three false positives
(employees seeing their own salary row). A harness that cries wolf gets
ignored, so it now checks ownership rather than counts.

## Evidence

- Access matrix: re-runnable, prints a full table, exits non-zero on a finding
- Leave workflow: screenshots and database state captured at each step
- Over-booking: exact error text recorded in the defect register
- Salary certificate: text extracted from the generated PDF

## Not done

No performance testing, no concurrency through the UI, no cross-browser, no
mobile, no file-upload testing, no session-expiry testing. Twelve of twenty
modules untouched.

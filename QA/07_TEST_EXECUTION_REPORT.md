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

---

# Cycle 2 — a full payroll run through the screens

**Run on** 16 October 2026, as `payroll@pulsehrms.demo` (Rohan Gupta, Payroll
Admin) **Month chosen** December 2026, deliberately, so the Karnataka labour
welfare fund rule is exercised rather than assumed.

Everything before this was unit-tested arithmetic. Nobody had watched a real
run produce real payslips. Doing so found four defects, two of which would
have put the wrong amount in somebody's bank account every single month.

## What was done

Assign compensation → create cycle → compute → generate payslips → publish →
sign in as the employee and look at the payslip.

| Step | Result |
|---|---|
| Assign compensation | Failed, 409. **QA-21**, and the failure wiped the employee's existing salary — **QA-22** |
| Compute, first attempt | Finished and reported success. ₹2,000 of deductions across eleven people — **QA-23** |
| Compute, after the fix | Correct, but gross was ₹64,000 for somebody on ₹1,00,000 — **QA-24** |
| Compute, final | All twelve paid exactly the gross agreed |
| Generate payslips | 11 then 12 payslips, numbered PS-202612-0001 upward |
| Publish | "Payslips published to 11 people" |
| Employee view | Sees one payslip, her own. No leakage |

## The final figures, checked line by line against the database

```
12 employees   gross 14,16,667   deductions 25,800   net 13,90,867
```

Every employee: PF ₹1,800, professional tax ₹200, labour welfare fund ₹150.

- **PF ₹1,800 for everybody** is right, not a bug. It is 12% of a basic capped
  at ₹15,000, not 12% of the actual basic.
- **PT ₹200** because all twelve are above the Karnataka ₹25,000 threshold.
- **LWF ₹150** because the month is December.
- **Working days 23**, which is December 2026 less eight weekend days.

## The negative case, because one month passing proves little

The same run for **November 2026**: 12 employees, gross ₹14,16,667, net
₹13,92,667. Deductions ₹24,000 — PF and professional tax only, **no labour
welfare fund**, which is the rule.

```
November 2026   PF_EMP 12 lines ₹21,600   PT 12 lines ₹2,400
December 2026   PF_EMP 12 lines ₹21,600   PT 12 lines ₹2,400   LWF 12 lines ₹1,800
```

## Method notes

**What worked.** Clicking through the whole cycle in order. Every one of these
four defects sat behind a screen that looked fine and a toast that said
success. The first run reported "Payroll computed for 11 employee(s)" while
deducting almost nothing.

**Reading the totals, not just the status.** The run said Completed. What gave
it away was gross ₹11,30,667 against net ₹11,28,667 — ₹2,000 of deductions
for eleven people. A status of Completed means the code finished, not that
the answer is right.

**What I nearly got wrong.** Four unit tests failed when I first wrote them,
and the tests were wrong, not the code — PF really is capped. Changing the
code to satisfy a wrong test is exactly how a payroll bug gets written.

## Honest limitations

- Two console errors — a React update-depth loop and two 409s — appeared
  during the first compute. They did **not** reproduce on a clean page load or
  on the November run, and no data was corrupted: the 409s were duplicate
  inserts that the constraints rejected. Most likely an artefact of a tab left
  open through many hot reloads. Not chased further, and not claimed fixed.
- Income tax and TDS were not exercised. TDS is still typed in by hand.
- No employee had loss of pay in either month, so the loss-of-pay path is
  covered by unit tests only, not by this run.
- The December and November 2026 cycles are still in the demo database as
  evidence. Delete them whenever you like.

---

© 2026 | Augustinnovate Pvt. Ltd.

# UAT Readiness Report

**Date** 15 October 2026 · **Verdict** **NOT READY FOR UAT**

---

## 1. Executive summary

Pulse is in better shape than it was this morning: four defects were found and
fixed today, two of them serious, on top of ten fixed earlier in the week from
tester reports. The authorization model is genuinely strong — row-level
security is on for all 128 tables, every table has a policy, no policy is
open, and no database function is reachable without signing in.

It is **not ready for UAT**, for one structural reason and one coverage
reason.

**Structural.** The application has no automated tests at all. Not a thin
suite — none. Every fix in this engagement was verified by hand, and nothing
re-checks it tomorrow. The defect pattern proves the cost: several defects
were business rules enforced only in the browser, which means they were not
enforced. That class of bug is invisible to compilation and to code review,
and it will keep recurring until something exercises the application
automatically.

**Coverage.** Of twenty modules, four have been tested to any depth. Payroll
calculation, performance, recruitment beyond one form, attendance, onboarding
and workflows have had essentially no functional testing. Declaring readiness
on that basis would be the same mistake that put these defects in front of
your testers.

## 2. Coverage

| Module | Depth | Note |
|---|---|---|
| Authorization (all 128 tables) | **Good** | Automated matrix across 7 roles, ownership-checked |
| Leave | **Good** | Full E2E across two roles, balance arithmetic, server-side limits, negative tests |
| Helpdesk | Moderate | Ticket creation E2E as employee; SLA stamping verified |
| Self-service letters | Moderate | Generation verified by reading the PDF output |
| Payroll | **Thin** | Access control only. No calculation, run, or payslip arithmetic tested |
| Recruitment | **Thin** | One form. Hiring pipeline untested |
| Mentorship | Moderate | Rules proven at the database; UI not exercised |
| Attendance | **None** | |
| Performance | **None** | |
| Onboarding, separation, workflows, assets, reports, recognition | **None** | |

## 3. Execution summary

| | Count |
|---|---:|
| Access-control checks executed (7 roles × 30 tables) | 210 |
| Business workflows executed end to end | 1 (leave, two roles, 16 steps) |
| Negative / boundary tests executed | 6 |
| Defects found today | 4 |
| Defects fixed today | 4 |
| Defects carried in and fixed this week | 10 |
| Defects open | 1 (cannot reproduce) |

Every number here is of tests actually run. Nothing is projected.

## 4. Defects by severity

| Severity | Found | Fixed | Open |
|---|---:|---:|---:|
| P0 | 0 | 0 | 0 |
| P1 | 4 | 4 | 0 |
| P2 | 8 | 8 | 0 |
| P3 | 2 | 2 | 0 |
| Unknown | 1 | 0 | 1 |

## 5. Security findings

**Confirmed and fixed:** payroll totals readable by every employee (QA-01); a
function executable without signing in (QA-02); leave entitlements not
enforced server-side (QA-04); helpdesk ticket numbering that leaked the
existence of other people's tickets through a unique-constraint collision
(QA-05).

**Verified sound:** no table without a policy; no policy evaluating to `true`;
no function executable by `anon`; per-person payroll closed to everyone but
payroll, HR, leadership and admin; HR cannot reach leadership pay; mentorship
check-in notes readable by the two participants and by nobody else, including
super admin.

**Not tested:** file upload safety, storage bucket policies, session expiry and
refresh behaviour, rate limiting, the edge functions beyond their auth gates,
injection against free-text fields.

## 6. Data integrity

**Fixed:** leave balances now move in the same transaction as the request that
moves them, and cannot be over-drawn. They were previously maintained by the
browser through a call that could never succeed.

**Not tested:** payroll calculation and rounding, full-and-final settlement
arithmetic, attendance totals, carry-forward and accrual runs, anything
involving money other than the access control around it.

This is the largest untested area and the one where an error is most expensive.

## 7. Outstanding risks

1. **No automated tests.** Everything verified today is verified once.
2. **Payroll arithmetic is unverified.** Access to it is controlled; whether it
   computes correctly is unknown.
3. **Test and production are the same Supabase project.** Fine while the data
   is synthetic; unacceptable the moment real employee data is loaded.
4. **Self sign-up is still enabled** at the Supabase project level, and leaked
   password protection is off. Both are dashboard toggles, outstanding for
   two weeks.
5. **Google sign-in** is offered on the login page but the provider is disabled,
   so the button fails.
6. **No staging environment.** Changes go from a laptop to the live URL.

## 8. Recommendation

**NOT READY FOR UAT.**

The blocking criteria are coverage and the absence of regression tests, not any
known open defect. To reach readiness:

1. Automated regression tests for the workflows already fixed, so they stay fixed.
2. Functional testing of payroll calculation end to end.
3. Functional testing of attendance, performance and the recruitment pipeline.
4. The two Supabase toggles closed.
5. A decision on separating test data from production before real data is loaded.

Items 1 and 2 are the ones that matter. The rest is schedule.

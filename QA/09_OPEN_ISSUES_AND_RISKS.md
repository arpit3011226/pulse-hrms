# Open Issues and Risks

## Open defects

| ID | Issue | Severity | Blocker |
|---|---|---|---|
| QA-15 | "Dropdown for salary component is not visible" | Unknown | Cannot reproduce. Eight components exist and are active. Need the exact screen from the reporter |

## Needs a business decision

| Question | Current behaviour | Why it matters |
|---|---|---|
| Should leadership see all leave balances or only their team's? | Team only (16 rows); HR sees all (76) | If leadership expect an org-wide view, this is a gap. If not, it is correct |
| Should every employee see the salary component definitions? | Yes — Basic, HRA, PF and their default values | Reference data, arguably fine, but it exposes the pay structure |
| Can a contractor take the same leave entitlement as a full-time employee? | Yes, identical | Raised by the contractor tester. A policy question, not a bug |

## Risks

**1 · No automated tests — HIGH**
Everything verified in this engagement was verified once, by hand. Nothing
re-checks it. This is why defects reached UAT and it will happen again.
*Mitigation: build a regression suite. Not started.*

**2 · Payroll arithmetic unverified — HIGH**
Access to payroll is controlled and tested. Whether it calculates correctly is
unknown: no run, payslip, deduction or statutory figure has been checked.
*Mitigation: functional testing of a full payroll cycle.*

**3 · Test and production share one database — HIGH once real data lands**
Acceptable today because everything is synthetic. Unacceptable the moment real
employee records exist, and there is no staging environment between a laptop
and the live URL.
*Mitigation: a separate Supabase project, or stop destructive testing.*

**4 · Self sign-up still enabled — MEDIUM**
`disable_signup` is false at the Supabase project level, and leaked-password
protection is off. The app offers no sign-up, but the door underneath is open
and the URL is public. Outstanding two weeks.
*Mitigation: two dashboard toggles. Yours to do; I cannot.*

**5 · Google sign-in advertised but disabled — MEDIUM**
The login page shows "Sign in with Google"; the provider is off, so it fails.
*Mitigation: enable it with OAuth credentials, or hide the button.*

**6 · Settlements and exit interviews untestable — MEDIUM**
Nobody in the demo set has left, so neither flow can be exercised. HR must run
a separation first.

**7 · File upload and storage untested — MEDIUM**
Bucket policies were not enumerated. Documents, resumes and reimbursement bills
all upload somewhere. Unknown whether one employee can read another's files.
*This is the most likely place for an undiscovered P0.*

## Assumptions made, and should be checked

- Role permissions in `DEFAULT_ROLE_PERMISSION_LEVELS` represent what August
  actually wants. No requirements document exists to confirm it.
- Earned leave is the only encashable type (you confirmed sick leave is not).
- The reporting line in the demo data mirrors how August really reports.

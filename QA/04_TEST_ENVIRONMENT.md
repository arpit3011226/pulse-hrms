# Test Environment

## What exists

| | |
|---|---|
| Local app | `npm run dev` → `http://localhost:5173`. Works. |
| Database | One Supabase project, `vwfntghluwihhuhuyreq` |
| Live site | `https://pulse-hrms.vercel.app`, deployed from `main` |
| Staging | **None** |
| Test framework | **None** |
| CI | **None** |

## The environment problem

**Test and production are the same Supabase project.** The live URL and every
test run point at one database. There is no separate QA instance.

You approved destructive testing on it on 15 October, on the basis that all the
data in it is synthetic and will be wiped before real data is loaded. That is
what made today's negative testing possible — over-booking leave, forcing
constraint violations, deleting rows.

**That approval stops being safe the moment real employee data is loaded.** At
that point either a separate project is needed, or destructive testing stops.

## Test accounts

Eight demo logins, one per role, created through Settings → Demo Data. Each has
its own password; they are held by you and are not recorded in the repository.

Reporting line, set 7 October so manager and leadership screens have something
to show:

```
lead@…  ──┬── manager@…  ──┬── employee1@…
          ├── hr@…          ├── employee2@…
          └── payroll@…     └── contractor@…
```

Each has leave balances for 2026 (12 casual, 8 sick, 15 earned) and a salary on
record (₹8.4L–₹36L by role) so payroll and letters have something to work with.

## Test data

| | |
|---|---|
| Employees | 19 (11 original + 8 demo) |
| Leave types | 4 — casual, sick, earned, compensatory off |
| Helpdesk categories | 11 |
| Letter templates | 11 |
| Recognition values | 8 |
| Salary components | 8 · structures 1 |
| Payroll runs | 4 (original employees only) |
| Candidates | 5, all against one requisition |

**Gaps that block testing:** nobody has left, so settlements and exit
interviews cannot be exercised. The demo employees have no payroll run rows, so
payslips cannot be generated for them.

## How authorization is tested

Impersonation at the database, the same path a real request takes:

```sql
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"<profile_id>","role":"authenticated"}', true);
```

This is how `QA/scripts/access_matrix.py` works. It is more reliable than
reading policies, because a policy that looks right can still behave wrongly.

## Browser testing

Done through the in-app browser against `localhost:5173`, signing in with the
demo accounts. Screens are read as accessibility trees and screenshots.

**Limitation:** one browser profile, so one session at a time. True concurrency
— two people approving the same request at the same instant — has not been
tested through the UI. Where it mattered it was tested at the database instead.

## Known limitations, stated plainly

- No LibreOffice or Poppler on this machine, so generated Word files cannot be
  rendered and looked at. PDFs were verified by reading the text out of the
  blob instead, which works but shows no layout.
- Email delivery is not tested. The demo domain is not real, so nothing arrives.
- Cross-browser testing has not been done. Chromium only.
- Mobile layouts have not been tested.

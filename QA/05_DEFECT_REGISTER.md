# Defect Register

*Opened 15 October 2026. Every defect here was reproduced before it was fixed and re-tested after. Where something was not verified, it says so.*

Severity: **P0** security or data integrity · **P1** workflow blocked or seriously wrong · **P2** defect with a workaround · **P3** minor.

---

## QA-01 — Every employee could read the company's payroll totals · P1 · FIXED

**Module** Payroll **Found by** `QA/scripts/access_matrix.py` **Fixed in** migration 00061

`payroll_runs` carries `total_employees`, `total_gross`, `total_deductions` and
`total_net_pay`. Its read policy, `org_members_read_payroll_runs`, allowed any
signed-in member of the organisation.

**Reproduction** — as an ordinary employee, against the live API:
```
select total_employees, total_gross from payroll_runs;
→ 10 employees, total gross 10,66,667
```
Divided out, that is an average salary of ₹1,06,667. One query gives the whole
wage bill.

**Root cause** The policy checked organisation membership and nothing else.
Per-person payroll was correctly closed; only the org-level totals leaked —
arguably the more sensitive figure.

**Fix** Read restricted to payroll, HR, admin and leadership. Payroll cycles
restricted the same way. Nothing employee-facing reads either table.

**Retest** Employee, contractor and manager now read 0 rows; payroll, HR,
leadership and admin read 4. HR still reads 32 of 40 `payroll_run_employees`,
so migration 00049's rule keeping HR away from leadership pay is intact.

---

## QA-02 — A trigger function was executable by anon · P3 · FIXED

**Module** Mentorship **Fixed in** migration 00062

`set_first_checkin_due` missed the `REVOKE` the rest of its migration got;
Postgres grants `EXECUTE` to `PUBLIC` by default.

**Not exploitable.** It returns `TRIGGER`, so a direct call is refused, and it
is not `SECURITY DEFINER`. Closed because an inconsistency in who may execute
what stops being harmless the moment somebody changes the function.

**Retest** No function in the schema is executable by `anon`.

---

## QA-03 — A new leave request did not appear until the page was reloaded · P2 · FIXED

**Module** Leave **Fixed in** `use-leave.ts`

**Reproduction** Sign in as an employee, apply for leave, submit. The dialog
closes, the list still reads "No results found", the balance is unchanged. The
request is in the database. Reload and it appears.

**Root cause** Same as QA-04 — see below.

---

## QA-04 — Leave balances were not enforced and not maintained · P1 · FIXED

**Module** Leave **Fixed in** migration 00063 and `use-leave.ts`

Three symptoms, one cause.

**Reproduction** — as an ordinary employee, against the live API:
```
insert into leave_requests (... total_days 20 ...)   -- entitlement is 12
→ accepted
```
22 days reserved against a 12-day entitlement, while the screen read "12 days
available".

**Root cause** Applying for leave made a second call to update
`leave_balances`. Only HR and admins may write that table, so an employee
applying for their own leave was refused by row-level security **every time**.
That single failing call caused all three symptoms:

- `pending_days` was read everywhere and written nowhere, so the balance never moved
- the thrown error took the cache invalidation with it, so the list did not refresh (QA-03)
- nothing checked the entitlement server-side; the apply form compares against
  the balance, but a form is not a control

**Fix** The arithmetic moved into the database: one trigger keeps
`leave_balances` in step with `leave_requests` in the same transaction, a
second refuses a request the person cannot cover. The browser no longer touches
balances on apply, approve, reject or cancel. Existing balances were recounted
from the requests rather than trusted.

**Retest** Full workflow through the UI across two roles. Employee applies:
appears immediately, balance 10 available / 2 pending / 12 total. Manager
approves under Team Leaves. Balance becomes used 2, pending 0, available 10.
Over-booking refused: *"You have 10.0 day(s) of Casual Leave left for 2026, and
this request is for 20.0."* Deleting a request returns the days.

---

## Carried over — found and fixed earlier in the same engagement

These predate the formal register but were found the same way and are listed so
the record is complete.

| ID | Defect | Severity | Status |
|---|---|---|---|
| QA-05 | No ordinary employee could raise a helpdesk ticket once any ticket existed — the ticket number was computed in the browser from rows row-level security hides from them | P1 | Fixed, trigger |
| QA-06 | Helpdesk had no categories at all, so the picker was empty | P2 | Fixed, 11 seeded |
| QA-07 | Sick leave was offered for encashment | P2 | Fixed, `is_encashable` |
| QA-08 | Encashment asked for a number of days "between 1 and 0" | P2 | Fixed |
| QA-09 | Payroll admin was shown Alumni screens the database refuses them | P2 | Fixed |
| QA-10 | `{{salary}}` resolved to empty on every letter — the certificate read "cost to company is ." | P1 | Fixed |
| QA-11 | Payslip download failed silently; the error went to the console only | P2 | Fixed |
| QA-12 | Quick Actions pointed at modules, not screens; "Apply Leave" pointed at a route that did not exist | P2 | Fixed |
| QA-13 | "Failed to create application" hid a unique-constraint violation and offered a combination that could never work | P2 | Fixed |
| QA-14 | Signed-out visits to any protected URL threw ~52 update-depth errors | P2 | Fixed |

---

## Open

| ID | Defect | Severity | Note |
|---|---|---|---|
| QA-15 | Salary component dropdown reported missing | Unknown | Could not reproduce — 8 components exist and are active. Needs the reporter's screen |

## Needs business decision

| Question | Why it matters |
|---|---|
| Should leadership see **all** leave balances, or only their own team's? | Today leadership sees 16 rows (own + direct reports); HR sees 76 (everyone). If leadership is meant to have an org-wide view, that is a gap |
| Should `salary_components` definitions (Basic, HRA, PF and their default values) be readable by every employee? | They currently are. Reference data, arguably fine, but it exposes the pay structure |

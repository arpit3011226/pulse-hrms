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

---

## QA-16 — Payroll produced a payslip for zero and reported success · P1 · FIXED

**Module** Payroll **Found by** reading the calculation, confirmed by unit test **Fixed in** `payroll.api.ts`

An employee with a salary on record but no salary components was run through
the calculation anyway. There is nothing to add up, so gross, deductions and
net all came out zero — and the run reported success.

**Severity** Paying somebody nothing by accident is worse than refusing to pay
them, because nobody notices. All eight demo employees are in exactly this
state today: each has a monthly gross on record and zero components.

**Fix** Employees with no earning component are set aside before the
calculation, and named back to the user: *"Payroll computed for N employee(s).
M left out with no salary components."* If nobody can be paid, the run refuses
outright and says to assign a salary structure first.

**Retest** 24 unit tests pass, including the zero-component case.

---

## QA-17 — Professional tax is a flat ₹200 for everyone · P2 · NEEDS BUSINESS DECISION

**Module** Payroll

`calculateStatutoryDeductions` returns `pt = 200` with the comment "Default
flat PT", regardless of salary or state.

Professional tax in India is a **state** levy with slabs, and is nil below each
state's threshold. A flat ₹200 over-deducts from low earners and is simply
wrong in states with different rates or none at all.

**Not fixed** — the correct slabs depend on which states August operates in.
Inventing Karnataka's numbers would be guessing. Covered by a test that records
the current behaviour so the fix has something to turn green.

---

## QA-18 — Loss of pay is never applied · P1 · NOT FIXED

**Module** Payroll

`computePayrollForRun` passes `lopDays = 0` and `presentDays = totalWorkingDays`
as literals, and `totalWorkingDays = 22` is hardcoded with the comment "MVP
simplification".

The machinery exists and works — `calculateLopDeduction` is correct and tested
— but nothing feeds it. **Attendance and unpaid leave have no effect on pay.**
Somebody absent all month is paid in full.

**Not fixed** — connecting attendance and unpaid leave to payroll is a feature,
not a defect fix, and the hardcoded 22 working days needs a business rule about
how the month is counted. Raised rather than built.

---

## QA-19 — Employee identity documents were downloadable by anyone on the internet · **P0** · FIXED (with a residual, below)

**Module** Storage **Found by** enumerating storage buckets **Fixed in** migration 00064 and `src/lib/storage.ts`

Both buckets — `employee-documents` and `reimbursement-receipts` — were marked
**public**. A public bucket serves every object through
`/storage/v1/object/public/<bucket>/<path>` with no sign-in and no API key.

Eight careful row-level security policies had been written for
`storage.objects`, scoping documents to the employee's own folder, to HR, and
to finance. **Marking the buckets public bypassed every one of them for
reads.** The policies were doing nothing at all.

**Reproduction** — with no credentials of any kind, not even the public API key:

```
GET /storage/v1/object/public/employee-documents/<uuid>/identity/pan_*.png
→ HTTP 200 · image/png · 329,665 bytes · 2418×1202
```

That is a scan of somebody's PAN card. Addresses are guessable in shape:
`<employee-uuid>/identity/<type>_<timestamp>.png`, and employee UUIDs are
readable by any signed-in colleague from the staff directory.

**With real data this is a reportable personal data breach under the DPDP Act**,
not merely a defect.

**Also found in the same place**

- No file size limit and no allowed MIME types on either bucket. The 5 MB and
  JPG/PNG/PDF checks existed only in the browser, so posting straight to the
  storage API bypassed them — including uploading HTML or SVG, which would
  then be served from the project's own origin.
- `uploadFile` returned `getPublicUrl()`, and that permanent public address was
  written into the database and rendered straight into an `<a href>`.

**Fix**

1. Both buckets set private, so the existing policies finally apply.
2. A 5 MB ceiling and a JPEG/PNG/PDF allow-list set on the buckets themselves,
   where they cannot be skipped.
3. `uploadFile` now returns the storage **path**, not a URL.
4. Files are opened through a short-lived signed URL, minted when somebody
   clicks and good for ten minutes, via a shared `StoredFileLink` component
   across all eight places a document was linked.
5. `storagePathFromUrl` recovers the path from rows written before the change,
   so existing documents still open without rewriting any data.

**Retest** Any path in either bucket now returns 400 unauthenticated. The
authenticated API path returns 400 without a valid session. The file is still
reachable by authorised users through the CLI and the app.

**RESIDUAL — needs your action**

One specific URL, the one tested above, is **still served from Supabase's
Smart CDN cache** (`cf-cache-status: HIT`, `cache-control: max-age=3600`).
Making the bucket private closed the origin, but did not purge entries already
cached. Moving the object and waiting did not purge it either.

That one address will keep serving the file until its cache entry expires.
Nothing else is exposed — every other path, and every variation of this one,
returns 400.

To remove it now rather than waiting: delete the object from Storage in the
Supabase dashboard, or ask Supabase support to purge the CDN entry. **If this
had been real employee data, that purge would be mandatory and the incident
reportable**, not optional.

---

## Open

| ID | Defect | Severity | Note |
|---|---|---|---|
| QA-15 | Salary component dropdown reported missing | Unknown | **Closed — will not action** at your request |
| QA-17 | Flat professional tax | P2 | Needs the state slabs |
| QA-18 | Loss of pay never applied | P1 | Needs a business rule, then a feature |
| QA-19 | One cached document URL still served by the CDN | P1 residual | Origin closed. Purge from the dashboard, or wait for the entry to expire |

## Needs business decision

| Question | Why it matters |
|---|---|
| Should leadership see **all** leave balances, or only their own team's? | Today leadership sees 16 rows (own + direct reports); HR sees 76 (everyone). If leadership is meant to have an org-wide view, that is a gap |
| Should `salary_components` definitions (Basic, HRA, PF and their default values) be readable by every employee? | They currently are. Reference data, arguably fine, but it exposes the pay structure |

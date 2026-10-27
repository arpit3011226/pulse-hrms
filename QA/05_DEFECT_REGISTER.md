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

## QA-17 — Professional tax is a flat ₹200 for everyone · P2 · SUPERSEDED

> Recorded when it was still open. **Fixed later the same engagement** — see
> the QA-17 entry further down. Kept because the reasoning for leaving it
> open at the time is still worth reading.

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

## QA-18 — Loss of pay is never applied · P1 · SUPERSEDED

> Recorded when it was still open. **Fixed later the same engagement**, once
> you gave the working-day rule — see the QA-18 entry further down.

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

## QA-35 — A failed payroll run left its wreckage behind · P2 · FIXED

**Module** Payroll **Fixed in** `payroll.api.ts`

There is no transaction across the calls that make up a payroll run. A
failure part way through left the per-employee rows inserted with the run
still marked draft, so the totals looked right while every payslip behind
them was empty — and pressing Compute again stacked a second set of rows on
the first.

Everything after that first insert is now undone if any of it fails, so
Compute can be pressed again without doubling anything.

---

## QA-42 — A candidate's sign-in went through the staff dashboard · P2 · FIXED

**Module** Auth / Routing **Found by** August during UAT, 27 October **Fixed in** `landing.ts`, `auth-layout.tsx`, `app-layout.tsx`

Reported as "logged in as candidate, screen stuck spinning for two or three
minutes".

AuthLayout sent every signed-in person with an organisation to `/dashboard`.
AppLayout then bounced candidates and alumni to their own screen. So a
candidate's sign-in took two route commits through a page built for staff,
and on the way it fired `getCurrentEmployee`, which used `.single()` on an
employee row a candidate does not have:

```
GET /rest/v1/employees?select=id,first_name,... → 406
{"code":"PGRST116","details":"The result contains 0 rows"}
```

The error was swallowed, so nothing broke visibly — it simply filled the
console with noise that hides real faults, and added a wasted round trip to
every candidate sign-in.

**Measured before and after**, signing in as the demo candidate:

| | Before | After |
|---|---|---|
| Route commits | 2 (`/dashboard` → `/my-application`) | **1** |
| Failed requests | 1 (406) | **0** |

`landingPathFor()` now answers "where does this person belong" in one place,
and both layouts ask it instead of each holding half the rule. The dashboard
query uses `maybeSingle()`, because having no employee record is an ordinary
fact about a candidate, not an error.

**Honestly reported:** the two-to-three minute freeze was not reproduced. A
clean sign-in took nine seconds before the fix and nine after. The
"Maximum update depth exceeded" errors seen alongside it appeared only in
browser tabs that had been through many hot-reload cycles during development,
never in a fresh one. The wasted hop was real and is fixed; if the freeze
returns on a clean load, it is still open.

---

## QA-43 — Every link Pulse sends points at localhost · P1 · FIXED

**Module** Auth / Alumni **Found by** August during UAT, 27 October **Fixed in** `app-url.ts`

Set-password invitations and alumni reactivation links were built from
`window.location.origin` — whatever the person generating the link happens to
be browsing. In development that is `http://localhost:5173`, so every link HR
handed out pointed at a machine nobody else can reach.

It looks completely normal and simply does not work for the recipient, which
is the worst kind of broken: HR would not find out until the candidate said
so.

`VITE_PUBLIC_APP_URL` now sets the address people actually use, with the
browser origin as the fallback so local development needs no setup. Both
screens that hand over a link also warn on screen while it would point at
localhost, rather than letting somebody send it.

---

## QA-44 — A candidate could read every profile in the company · P1 · FIXED

**Module** RLS **Found by** reading what a candidate could reach while fixing QA-42 **Fixed in** migration 00085

00053 hid the employee directory and open requisitions from candidates and
alumni. It missed `profiles`, which carries name, email address and role for
everybody.

**Reproduction** — as the demo candidate:
```
select email, role from profiles  → 19 rows
including  role: super_admin, @augustinnovate.com
```

A candidate login is handed out freely, to people who have not been hired and
may never be. Any one of them could enumerate the entire staff list and learn
exactly which address holds the super admin account — a ready-made target
list for a phishing attempt, given away at the application stage.

Reading your own profile still works, because sign-in depends on it. After
the fix: candidate sees 1, employee sees 19, HR sees 19.

---

## QA-40 — Leave balances existed but could not be seen, so leave could not be approved · P1 · FIXED

**Module** Leave **Found by** August during UAT, 27 October **Fixed in** migration 00083

Reported from the floor: an employee with 12 days of casual leave and 9 still
available applied for 3 days. The approval dialog said *"No balance record
found for this leave type and year"* and refused to approve. The balance row
was there the whole time.

**Root cause.** Migration 00004 added `leave_balances.organization_id` with the
comment *"for easier admin queries"*. Nullable, nothing backfilled it, nothing
enforced it. Later `getAllLeaveBalances()` started filtering on it:

```js
.eq('organization_id', orgId).eq('year', year)
```

Every row where the column was null silently disappeared from that query. In
this database that was **33 of 76 rows**, including three of the four belonging
to the person who reported it. The dialog then saw no balance and blocked the
approval — correct behaviour on the facts it was given, and the facts were
wrong.

**Fix.** Backfilled from the employee, derived by trigger on insert and update
so no caller has to remember it, and the column is now NOT NULL.

**The general lesson.** A denormalised column is a convenience only while it is
guaranteed. The moment something filters on it, a null is not a gap — it is
invisible data loss, and it looks exactly like "no such record".

**Verified end to end** on the live test instance after the fix: the dialog
showed 12 total, 0 used, 9 available; the leave was approved; used moved 0 → 3
and pending 3 → 0.

---

## QA-41 — A leave request from someone with no manager reached nobody · P1 · FIXED

**Module** Dashboard **Found by** August during UAT, 27 October **Fixed in** `things-to-do-widget.tsx`

"Things to do" said *2 leave requests to approve* while the Leave screen and
the dashboard's own Pending Leaves tile both said 3.

The widget counted pending requests belonging to the approver's **direct
reports**, and did that for everybody — including HR and admins, who approve
across the whole organisation.

Two consequences:

* HR saw a number smaller than the queue they were actually looking at.
* A request from somebody with **no reporting manager** — the head of the
  company, or anyone whose manager field is simply blank — was in nobody's
  list and was shown to no one at all. That was the missing third request.

HR and admins now count the whole organisation, which is what they can act on.
Managers keep their own reports plus anyone they are covering for through
delegation.

---

## QA-39 — Everybody who left was locked out of their own records · P1 · FIXED

**Module** Alumni / Identity **Fixed in** migration 00074 and the `issue-reactivation-link` function

Completing an exit set the role to `alumni`. That is correct — and `mayUseGoogle()`
blocks company sign-on for alumni on purpose, because the work account stops
working the day they leave.

What nothing did was give them another way in:

* their work address no longer accepts mail or sign-in
* anybody who joined through company sign-on never had a password
* no reactivation link was ever issued, by anything

So the whole point of keeping an alumni login — payslips, Form 16, relieving
letter — was unreachable by the person it was built for. The exit screen
reported the exit as complete.

**Fix.** `become_alumni()` now puts the login back on a password against the
personal address and clears the company one, and the exit trigger calls it.
HR then presses **Sign-in link** on the alumni list when they are ready, which
moves the login to the personal address and hands back a one-time link.

Pressed by HR rather than fired automatically on completion — August's choice,
so a link is never sitting in somebody's inbox before their last working day.

**Not yet exercised end to end.** The database half is tested; the function
refuses an unauthenticated and an anonymous caller. The signed-in HR path needs
one run during UAT, because no alumnus exists in the test data to try it on.

---

## QA-38 — The login screen offers Google sign-in, which is switched off · P1 · OPEN

**Module** Auth **Found by** reading the project's auth settings during the SSO spike

`login-form.tsx` renders a "Continue with Google" button unconditionally. The
project has only one provider enabled:

```
GET /auth/v1/settings
→ enabled: email
→ disabled: google, azure, apple, github, … (all others)
```

`auth.identities` agrees — 18 logins, every one of them `email`, not a single
Google identity ever created. The button has never worked.

A tester who presses it gets "Unsupported provider", and the whole of the
intended joiner journey — personal password before joining, company Google
account afterwards — rests on a provider that is not switched on.

**Left open deliberately.** The fix depends on which identity provider August
settles on after the move to Azure. Enabling Google here would be wasted if the
company moves to Microsoft Entra ID with the rest of its estate. Either way the
button should not be shown while it cannot work.

---

## QA-36 — Any employee could make themselves a super admin · P0 · FIXED

**Module** Identity / RLS **Found by** reading `profiles` policies while fixing QA-37 **Fixed in** migration 00073

`profiles` carries `role`, `organization_id` and `is_active`. The update policy
was:

```sql
users_update_own_profile  FOR UPDATE
  USING (id = auth.uid())  WITH CHECK (id = auth.uid())
```

Both halves are satisfied by a person editing their own row — and `role` sits
on their own row. Row-level security decides which ROWS you may write. It
cannot decide which COLUMNS. The grant agreed:
`has_column_privilege('authenticated','profiles','role','UPDATE')` → true.

**Reproduction** — as the demo employee, inside a rolled-back transaction:
```sql
set local role authenticated;
select set_config('request.jwt.claims',
                  '{"sub":"<employee profile>","role":"authenticated"}', true);
update profiles set role = 'super_admin' where id = '<employee profile>';
select role from profiles where id = '<employee profile>';
→ super_admin
```

One PATCH to `/rest/v1/profiles` from any signed-in employee and they hold
every payslip, every salary, every exit record in the company. The same hole
moved `organization_id` and switched `is_active` back on after being disabled.

**Why no policy could fix it** HR and the employee share one database role,
`authenticated`. Revoking the column from `authenticated` would stop HR doing
their job. A BEFORE UPDATE trigger is the right instrument: it sees the old row
and the new one, so it can judge the *change* rather than the row.

**A second hole, inside the first fix** The guard allows one exception — the
company-setup screen, where a fresh sign-up creates an organisation and becomes
its super admin. That was narrowed to an organisation nobody else had joined.
The membership check ran as the signed-in user, and a fresh sign-up has no
organisation, so `users_read_own_org_profiles` showed them nothing but their
own row. The question "does anybody else belong to this organisation?" came
back **no** for a company with a hundred people in it, and the guard waved them
straight in as its administrator.

RLS had answered a security question with a lie. The check now goes through
`org_has_other_members()`, which is SECURITY DEFINER and gets the true answer.
Worth remembering: **a guard that asks a question under RLS is not a guard.**

**Regression** `QA/scripts/profile_guard.sh` — 7 checks, all inside rolled-back
transactions, safe to run against any environment. 7 passed.

---

## QA-37 — A converted candidate was never made an employee · P1 · FIXED

**Module** Recruitment **Fixed in** `convert-to-employee-dialog.tsx`

Converting a candidate created the employee record and linked their profile,
but never changed `profiles.role`. Nothing anywhere in the application did.

So a new joiner who had been given a portal login kept the `candidate` role.
That role reaches their own application and nothing else: no leave, no
attendance, no payslip, and 00053 deliberately hides the employee directory
from candidates. The conversion reported success.

The role now moves to `employee`, scoped to rows currently holding
`candidate` so a rehire who was once a manager is not quietly demoted.

Only HR and a super admin may change a role. When a recruiter does the
conversion the role change is refused, and they are now told exactly that —
the employee exists, the login still needs HR — instead of seeing a success
message that is only half true. Moving the whole conversion into one
server-side step is Phase 1 of the pre-boarding work.
---

## QA-34 — An HR admin was offered a payroll run they could not finish · P1 · FIXED

**Module** Payroll **Fixed in** `use-permissions.ts`, `payroll-runs-tab.tsx`

`payroll_earnings`, `payroll_deductions` and `payslips` are writable only by
a payroll admin or a super admin — a segregation of duties the policies have
always carried. The Compute button was gated on `canManagePayroll`, which an
HR admin has.

Pressing it half worked: eleven rows of per-employee totals went in, every
earning and deduction line was refused with a 42501, and the run looked
finished with nothing behind it.

Compute, Payslips and Publish now require `canRunPayroll`, which mirrors the
database. Creating a cycle and submitting it for approval stay with HR,
because `payroll_cycles` does allow that.

---

## QA-33 — The labour welfare fund took the employer's share from the employee · P1 · FIXED

**Module** Payroll **Fixed in** migration 00071, `constants.ts`, `payroll-utils.ts`

Karnataka's annual contribution is ₹50 from the employee and ₹100 from the
employer, ₹150 between them. Pulse deducted ₹150 from the employee: the two
shares added together and taken off one side. Every employee lost an extra
₹100 a year, and the employer's own share was recorded nowhere, so it was
missing from cost to company as well.

Checked against the Karnataka Labour Welfare Board's published rates; the
2025 amendment in force 7 January 2026 changed the coverage threshold, not
the amounts.

---

## QA-32 — The mentor directory had never returned a row · P1 · FIXED

**Module** Mentorship **Fixed in** `mentorship.api.ts`

Employees and departments are joined two ways — an employee belongs to a
department, and a department has a head who is an employee. Asked for plain
`departments(...)` nested under an employee, PostgREST will not choose:

```
PGRST201 — Could not embed because more than one relationship was found
           for 'employees' and 'departments'
```

Every mentorship read did this. The pairs list, the requests list and the
directory all threw, and nothing surfaced — the page said "Nobody has
offered to mentor yet", which it would have said with a hundred mentors
registered. Searching by name was the fallback, and the only path that ever
worked.

**This is why HR reported "mentors can only be selected by name".** It read
as a missing feature and was a broken query. Four embeds across three
queries now name the foreign key.

---

## QA-31 — A candidate added on their own could never be interviewed · P2 · FIXED

**Module** Recruitment **Fixed in** `candidates-tab.tsx`, `interview-form-dialog.tsx`

An interview hangs off an application, not a candidate, so the scheduling
list is built from applications. Somebody added on the Candidates tab and
nowhere else is not in it, can never be in it, and nothing said why.

"Put forward for a job" now sits on the candidate's own menu, and the
scheduling form counts the candidates who are not up for any role and names
the action that fixes it.

---

## QA-30 — Interviews could be booked in the past · P2 · FIXED

**Module** Recruitment **Fixed in** `interview-form-dialog.tsx`, `reschedule-interview-dialog.tsx`

The two date fields accepted anything at all. An interview could be booked
for last March, and nothing checked the end came after the start either —
that second one was not reported but sat in the same gap.

Both are stopped twice over: the input carries a `min` of today, and the
schema refuses it if the attribute is bypassed. The rule applies only when
creating, so a past interview stays editable.

---

## QA-22 — A failed compensation assignment removed the salary the employee had · P1 · FIXED

**Module** Payroll **Fixed in** migration 00066

`createEmployeeCompensation` marked the existing current row as not-current
and *then* inserted the new one, as two separate calls. When the insert
failed, the demotion had already happened — leaving the employee with no
current compensation at all. Trying to give somebody a salary took away the
one they had.

Both halves now happen inside one function, so either the old row is demoted
and the new one written, or nothing changes.

---

## QA-21 — Nobody could assign compensation to anybody · P1 · FIXED

**Module** Payroll **Fixed in** migration 00066

`employee_compensation.created_by` is a foreign key to `employees(id)`, and
the dialog passed the auth profile id, which is never an employee id. Every
attempt came back:

```
23503 · insert or update on table "employee_compensation" violates foreign
key constraint "employee_compensation_created_by_fkey"
```

So no employee had any salary components, which is why payroll had nothing
to calculate. `created_by` is now resolved inside the database from the
caller, so no screen has to know which of the two ids the column wants.

---

## QA-29 — In-app notifications never reached anybody · P1 · FIXED

**Module** Everything that notifies **Fixed in** `notifications.api.ts`
**Found by** a swallowed console error during the separation smoke test

Initiating a separation printed this to the console and carried on:

```
Failed to load resource: the server responded with a status of 403
Failed to send resignation notifications
```

Both notification helpers ended in `.select()`, which asks PostgREST to hand
the inserted rows back. Reading a notification is governed by:

```sql
user_read_own_notifications  USING (recipient_profile_id = auth.uid())
```

You may **write** a notification for a colleague. You may not **read** it. So
the RETURNING was refused and the whole statement rolled back. Proven at the
database — the identical insert succeeds without RETURNING and is refused
with it:

```
insert into notifications (...) values (...) returning id;
  ERROR 42501: new row violates row-level security policy

insert into notifications (...) values (...);
  inserted ok
```

Every caller wraps this in `try { ... } catch { console.error(...) }`, so the
resignation saved, the screen said nothing, and the manager was never told.

**21 call sites across six features** — resignation, self-service,
reimbursements, general requests, workflows and mentorship. All silently
dead. The workflow engine's only action is to send a notification, so every
workflow in Pulse was firing into nothing.

**Fix.** Stop asking for the rows. Nothing used them, and writing a
notification is fire and forget.

**Verified by re-running the separation.** Notifications went from 8 to 15;
the reporting manager, both HR admins, the super admin and leadership each
received one.

---

## QA-28 — The dashboard counted withdrawn and rejected exits as in progress · P2 · FIXED

**Module** Dashboard **Fixed in** `things-to-do-widget.tsx`

```js
.neq('status', 'completed')
```

Anything not finished counted, so a withdrawn resignation and a rejected one
were both reported to HR as exits in progress. The widget read "3 exits in
progress" when exactly one was live. Now it counts only `initiated`,
`notice_period`, `clearance_pending` and `clearance_completed`, and reads
"1 exit in progress".

---

## QA-27 — Five of the six kinds of separation vanished · P1 · FIXED

**Module** Separation **Fixed in** `resignation.api.ts`

The "All Requests" tab is the only list HR has, and it was filtered:

```js
.eq('exit_type', 'resignation')
```

The Initiate Separation screen offers **termination, retirement, absconding,
contract end and mutual separation**. Each one was written to the database
and then disappeared — no error, no row in the list, no way to approve it,
track it or run clearances on it.

Proven by initiating a mutual separation: the record was in the database with
`approval_status = submitted`, and the screen showed nothing.

**Fix.** The list shows every exit. `exit_type` is available as a filter for
anyone who wants to narrow it deliberately. Verified in the UI — the mutual
separation now appears with its own badge.

---

## QA-26 — A rejected exit stayed "in progress" for ever · P2 · FIXED

**Module** Separation **Fixed in** migration 00068, `resignation.api.ts`

`employee_exit_records` keeps two columns for one journey: `approval_status`
(who has signed it off) and `status` (where the exit has reached).
`rejectResignation` only ever wrote the first.

One record in the demo data read:

```
status = notice_period        approval_status = hr_rejected
```

HR approved it, which set `status` to `notice_period`; HR then rejected it,
which changed nothing but the approval. The record still said the person was
serving notice.

`status` had no value meaning "not going ahead" — only `withdrawn`, which is
the employee pulling out, not the company declining. Recording a rejection as
a withdrawal would be wrong on the record and wrong in any report built from
it, so `rejected` was added to the constraint and the stale row repaired.

---

## QA-25 — Provident fund for contractors and interns, and no contractor TDS · P1 · FIXED

**Module** Payroll **Fixed in** migration 00067, `payroll-utils.ts`,
`payroll.api.ts`, `compensation-dialog.tsx`
**Raised by** the business, 16 October 2026

Two rules that were not in the system at all:

1. **Provident fund does not apply to a contractor or an intern.** Neither is
   on the rolls as an employee, so there is no EPF membership to contribute
   to. QA-23 had just made PF apply to everybody with current compensation,
   which was right for staff and wrong for these two.
2. **A contractor has 10% deducted at source, under tax code 1027.** Taken on
   the whole payment: a contractor raises an invoice rather than drawing a
   salary, so there is no basic and no exempt portion to carve out.

**Fix.** `employment_type` now reaches the calculator. Provident fund is
skipped for `contract` and `intern`, and a new Contractor TDS component — 10%,
tax code 1027 — is applied to `contract` only. An unknown or missing
employment type is treated as an ordinary employee: PF applies, no TDS.
Erring towards deducting is the safe direction, because an over-deduction is
refunded whereas a short deduction costs interest and damages.

PF is refused for a contractor **even if somebody attached it by hand** to
that person's salary structure. The rule is not a default that configuration
can override.

A `tax_code` column was added to `salary_components`, because the code has to
reach the payslip and the quarterly return. It sits on the component rather
than on each deduction, so it stays correct for every run.

### Found while fixing it: the preview did not match the payslip

The compensation preview reads the salary structure, while payroll merges in
the organisation's statutory components. For a contractor that meant the
screen showed **no TDS at all** while payroll would deduct ₹7,000, and showed
a "PF Employee ₹0" row that never reaches a payslip. The preview now runs the
same merge payroll runs and drops any line that works out to nothing, exactly
as payroll does.

**Verified in the UI.** A contractor on ₹8,40,000 a year:

```
Basic Salary          Earning    40% of Gross      ₹28,000
House Rent Allowance  Earning    50% of Basic      ₹14,000
Dearness Allowance    Earning    10% of Basic       ₹2,800
Special Allowance     Earning    Balance of gross  ₹25,200
Professional Tax      Deduction  Flat ₹200            ₹200
Contractor TDS        Deduction  10% of Gross       ₹7,000
Gross earnings                                     ₹70,000
Less deductions                                    −₹7,200
Take home                                          ₹62,800
```

No provident fund line at all. An intern on ₹3,60,000 shows professional tax
and nothing else.

**And verified through a December payroll run** of fourteen people:

```
EMP-0019  contract    gross 70,000    PT 200, LWF 150, TDS_CONTRACTOR 7,000   net 62,650
EMP-0018  intern      gross 30,000    PT 200, LWF 150                         net 29,650
12 others full_time                   PT 200, LWF 150, PF_EMP 1,800
```

The tax code reaches the deduction:

```
EMP-0019  Contractor TDS  tax code 1027  amount 7,000
```

### Answered by the business, 16 October 2026

Two questions were put back, because either answer changes what comes out of
somebody's payment. Both are now implemented:

**Professional tax and labour welfare fund do not apply to a contractor or an
intern either.** Both Acts are written around persons in employment, so they
stop at the same boundary provident fund does. A contractor on ₹70,000 now has
the ₹7,000 TDS and nothing else, and an intern has no deduction at all.

**Freelance counts as a contractor.** No provident fund, and 10% TDS under
code 1027. Nobody is on that type today, but somebody tagged `freelance` by
mistake is now taxed rather than missed.

So the three engagements `contract`, `intern` and `freelance` sit outside the
employee statutory regime — no PF, no professional tax, no labour welfare
fund — and of those, `contract` and `freelance` are paid under deduction of
tax. Part-time staff are **not** in this group: they are on the rolls and
everything applies to them as usual.

**Re-verified through the December run and the preview.**

```
EMP-0019  contract    gross 70,000   TDS_CONTRACTOR 7,000              net 63,000
12 staff  full_time                  PF, PT 200, LWF 150
```

The preview for the same contractor now reads gross ₹70,000, less deductions
₹7,000, take home ₹63,000 — the same figures the payslip carries.

One worked case worth keeping: an employee on a ₹12,000 basic pays PF of
₹1,440, not ₹1,800. The ₹15,000 cap is a ceiling on the basic, not a floor on
the contribution.

17 unit tests cover the two rules, including the case where PF is attached to
a contractor by hand and must still be refused.

---

## QA-24 — The only salary structure paid 64% of the agreed salary · P0 · FIXED

**Module** Payroll · Compensation **Fixed in** `compensation-dialog.tsx`
**Found by** assigning compensation and then running payroll on it

Three faults in the compensation preview, all visible on one screen.

### a. Components did not add up to the salary agreed

`Standard CTC` — the only structure in the system — is built as:

| Component | Rule | Share of gross |
|---|---|---|
| Basic | 40% of gross | 40% |
| HRA | 50% of basic | 20% |
| DA | 10% of basic | 4% |
| Special Allowance | **flat ₹0** | 0% |

That is **64% of gross**, and nothing fills the other 36%. Payroll pays the
sum of the components, so anybody assigned through this screen was paid 64%
of what they had been promised. Sneha Reddy was assigned ₹12,00,000 a year
and the December run paid her a gross of **₹64,000 against ₹1,00,000**.

Every employee seeded before this screen existed carries a special allowance
of exactly 36% of gross — the remainder. That is the convention in Indian
payroll and plainly the intent, so the shortfall now goes there.

**And a guard, because the structure can still be misconfigured:** if the
earnings do not add up to the agreed salary the screen says so in plain words
and the Save button is disabled. The old behaviour was to save it quietly.

### b. Provident fund shown at ₹4,800 where payroll pays ₹1,800

The preview applied the structure's "12% of basic" literally. Payroll applies
the statutory cap — 12% of a basic capped at ₹15,000. The screen and the
payslip disagreed, and **the wrong figure was the one written to the
employee's record**. The preview now calls the same calculator payroll calls.

### c. The "Total" row added earnings and deductions together

For somebody on ₹1,00,000 a month it read ₹69,000, which is neither gross nor
net nor anything else. Replaced with three honest rows: gross earnings, less
deductions, take home.

The Calculation column also stated rules that were no longer being applied, so
a figure that does not come from the structure's own rule now says where it
does come from — "Balance of gross", "Statutory limit applied".

**Verified in the UI.** Assigning ₹12,00,000:

```
Basic Salary          Earning    40% of Gross               ₹40,000
House Rent Allowance  Earning    50% of Basic               ₹20,000
Dearness Allowance    Earning    10% of Basic                ₹4,000
Special Allowance     Earning    Balance of gross           ₹36,000
PF Employee           Deduction  Statutory limit applied     ₹1,800
Professional Tax      Deduction  Flat ₹200                     ₹200
Gross earnings                                            ₹1,00,000
Less deductions                                             −₹2,000
Take home                                                   ₹98,000
```

**And verified through a payroll run.** After reassigning the two affected
employees, every one of the twelve was paid exactly the gross agreed:

```
EMP-0016  Vikram Mehta    agreed 2,50,000   paid 2,50,000   net 2,47,850
EMP-0017  Sneha Reddy     agreed 1,00,000   paid 1,00,000   net   97,850
          …ten more, all matching
12 employees   gross 14,16,667   deductions 25,800   net 13,90,867
```

Deductions are 12 × ₹2,150 — PF ₹1,800, PT ₹200, December LWF ₹150 each.

**Worth knowing:** the structure itself is still written with special
allowance as flat ₹0. The screen compensates for it. If you would rather the
structure be correct in its own right, set special allowance to 36% of gross
on the Structures tab — but then it has to be recalculated by hand whenever
basic, HRA or DA change, which is why it is done as a balance instead.

---

## QA-23 — Statutory deductions were opt-in · P1 · FIXED

**Module** Payroll **Fixed in** `payroll-utils.ts` and `payroll.api.ts`
**Found by** running a full December 2026 payroll cycle through the screens

The first December run finished and reported success. The totals were
₹11,30,667 gross against ₹11,28,667 net — **₹2,000 of deductions across
eleven people.** Per employee:

| Employee | Gross | Deductions |
|---|---|---|
| Arpit Saxena | ₹2,00,000 | ₹0 |
| Karan Mehta | ₹1,50,000 | ₹0 |
| Mishka S | ₹1,25,000 | ₹0 |
| Neha Gupta | ₹1,16,667 | ₹0 |
| …seven more | | ₹0 |
| Sneha Reddy (EMP-0017) | ₹64,000 | ₹2,000 |

Ten of eleven people were paid with **no provident fund and no professional
tax at all**, and **nobody** had the December labour welfare fund taken —
not even the one employee whose structure did carry PF and PT, because it had
no LWF line.

**Cause.** The calculator walks only the components attached to that
employee's compensation:

```js
for (const comp of components) {
  if (comp.is_statutory && comp.statutory_type) { ...calculate... }
}
```

A statutory deduction therefore happened only if whoever set up the salary
structure had remembered to tick it. The ten demo employees carry Basic, HRA,
DA and Special Allowance and nothing else, so nothing was deducted. QA-20 made
the arithmetic reachable; it could still only reach components that were
there.

**Why this is not cosmetic.** Under-deducting PF is not a display problem. The
employer owes the arrears with interest under section 7Q and damages under
section 14B of the EPF Act, and the employee's account is short by that much.
The same money has to come out whether or not the form was filled in
correctly, so the deduction cannot be opt-in.

**Fix.** `withStatutoryComponents` merges the organisation's active statutory
components into each employee's list before the calculation. A component the
employee already carries always wins, so anything deliberately configured for
one person is untouched; only genuinely missing statutory lines are added.

TDS is deliberately excluded — it is driven by the employee's own investment
declaration and is typed in, so there is nothing to apply automatically.

**Verified by re-running the same cycle through the UI.** All eleven
employees, every line checked against the database:

```
code       employee          gross     deduction lines                      net
EMP001     Arpit Saxena    200000.00   LWF 150, PF_EMP 1800, PT 200    197850.00
EMP-0003   Mishka S        125000.00   LWF 150, PF_EMP 1800, PT 200    122850.00
EMP007     Karan Mehta     150000.00   LWF 150, PF_EMP 1800, PT 200    147850.00
EMP008     Neha Gupta      116667.00   LWF 150, PF_EMP 1800, PT 200    114517.00
EMP006     Ananya Singh    100000.00   LWF 150, PF_EMP 1800, PT 200     97850.00
EMP010     Sneha Reddy      91667.00   LWF 150, PF_EMP 1800, PT 200     89517.00
EMP004     Priya Patel      83333.00   LWF 150, PF_EMP 1800, PT 200     81183.00
EMP003     Vikas Sharma     75000.00   LWF 150, PF_EMP 1800, PT 200     72850.00
EMP005     Rahul Kumar      66667.00   LWF 150, PF_EMP 1800, PT 200     64517.00
EMP-0017   Sneha Reddy      64000.00   LWF 150, PF_EMP 1800, PT 200     61850.00
EMP009     Amit Sharma      58333.00   LWF 150, PF_EMP 1800, PT 200     56183.00
```

PF is ₹1,800 for everybody, which is correct: 12% of a basic capped at
₹15,000, not 12% of the actual basic. Professional tax is ₹200 because all
eleven are above the Karnataka ₹25,000 threshold. LWF is ₹150 because the
month is December. Deductions total ₹23,650, and ₹11,30,667 − ₹23,650 =
₹11,07,017, which is the net the screen shows.

Eight unit tests cover the merge and the December case.

---

## QA-20 — The statutory calculations were unreachable · P1 · FIXED

**Module** Payroll **Fixed in** migration 00065

`computeEmployeePayroll` only calculates PF, ESI and professional tax when the
component carries a `statutory_type`:

```js
if (comp.is_statutory && comp.statutory_type) { ...calculate... }
```

**Every statutory component had `statutory_type` NULL.** The condition never
held. PF, PT and TDS all fell through to whatever flat amount had been typed
onto the component, and the 12%, the ₹15,000 cap and the ₹21,000 ESI threshold
were all dead code.

**Fix** The field is filled in, which makes the existing calculation work.
Nothing in the application changed shape — the code was always ready for it.

**Also added**, both statutory and both missing entirely: Labour Welfare Fund,
and ESI for employee and employer. Without the component, the deduction simply
never happens.

---

## QA-18 — Loss of pay is never applied · P1 · FIXED

**Module** Payroll **Fixed in** `payroll.api.ts` and `payroll-utils.ts`

`computePayrollForRun` passed `lopDays = 0` as a literal and hardcoded
`totalWorkingDays = 22` with the comment "MVP simplification". Attendance and
unpaid leave had no effect on pay at all.

**Fix, to the rule you gave:** a working month is every day that is not a
Saturday or a Sunday. 2026 ranges from 20 to 23 working days, so the hardcoded
22 was wrong for seven months out of twelve — verified against Python's own
calendar, not just against our code.

Loss of pay is taken from **approved leave of a type marked unpaid**,
overlapping the payroll month. Absence recorded through attendance is a second
possible source and is deliberately not used: there is no agreed rule yet for
when an unmarked day becomes loss of pay, and guessing one would quietly dock
people.

Declared holidays are **not** excluded from the working-day count. A public
holiday is a paid day off, so removing it from the denominator would quietly
raise the cost of every day of unpaid leave in that month.

---

## QA-17 — Professional tax was a flat ₹200 · P2 · FIXED

**Module** Payroll **Fixed in** `payroll-utils.ts`

Now the Karnataka threshold: nil below ₹25,000 a month, ₹200 at or above it.
Labour Welfare Fund of ₹150 is taken once a year, in December, per your rule.

**Caveat worth keeping:** state thresholds move with budgets, and the LWF
figure in particular should be confirmed against the current Karnataka
notification — the employee share has historically been lower than ₹150. Both
values sit together in `src/lib/constants.ts` so they are changed in one
place. If August takes on anybody outside Karnataka, professional tax needs a
per-state table.

---

## Open

| ID | Defect | Severity | Note |
|---|---|---|---|
| QA-15 | Salary component dropdown reported missing | Unknown | **Closed — will not action** at your request |

| QA-19 | One cached document URL still served by the CDN | P1 residual | Origin closed. Purge from the dashboard, or wait for the entry to expire |

## Decisions taken

All five open questions were decided on 23 October 2026, on instruction. Each
one is recorded with what would change it, so a later disagreement starts from
the reasoning rather than from scratch.

### The Karnataka LWF figure was wrong — corrected

**Decided:** employee ₹50, employer ₹100.

Pulse deducted ₹150 from the employee. ₹150 is the **combined** figure: the
two shares had been added together and the whole lot taken off one side.
Every employee was losing an extra ₹100 a year, and the employer's own share
was not recorded anywhere, so it was missing from cost to company too.

Checked against the Karnataka Labour Welfare Board's published rates. The
2025 amendment, in force 7 January 2026, changed the coverage threshold and
the payment options, not the amounts.

**What would change it:** the Board revises these from time to time. Worth one
look each December before the run. Both figures sit together in
`src/lib/constants.ts`.

### Leadership now sees leave balances across the organisation

**Decided:** yes, read only.

Leadership already reads org-wide headcount, attrition and the payroll cost.
Leave balance is the same class of number — a liability on the books, and the
one most likely to arrive as a surprise in March when everybody takes what
they are owed at once. Showing them the wage bill but not the leave bill was
an odd place to draw the line, and it left the leave report covering their own
team only.

Adjusting a balance stays with HR and the super admin. Seeing a number is not
the same as changing it.

**Verified:** leadership 76 rows, HR 76, an ordinary employee still 4 — their
own.

### Salary component definitions stay readable by everybody

**Decided:** no change.

The table holds the rules, not anybody's pay: basic is 40% of gross, HRA 50%
of basic, PF 12%, professional tax ₹200. All of it is in every offer letter
and on every payslip already.

It is also load-bearing. Six payslip queries join `salary_components` for the
component names, so closing it would leave every employee looking at a payslip
of blank rows against amounts. It protects nothing and breaks something.

### Provident fund is deducted from every member of staff, with no exemption field

**Decided:** no per-employee exemption, for now.

In law an employee who has never been an EPF member and joins above a basic of
₹15,000 may be excluded on Form 11. Pulse does not model that and deducts
anyway.

That errs in the recoverable direction. An over-deduction goes into the
employee's own PF account — it is theirs, transferable and withdrawable, not
lost. A short deduction costs the employer the arrears plus interest under
section 7Q and damages under 14B. Building an exception path for a case that
may not exist here is speculation; the cost of being wrong the other way is
real.

**What would change it:** August actually hiring somebody in that position.
Then the field gets added with a real case to shape it, rather than a guess.

### Contractor TDS stays at a flat 10% under code 1027, with no override

**Decided:** no per-contractor rate, for now.

A contractor holding a lower-deduction certificate under section 197 would be
over-deducted. Same reasoning: it is recoverable by the contractor as a
refund, and no contractor here holds one today.

**What would change it:** the first certificate that arrives. It is a column
on the employee and a branch in `contractorTds`, so it is a small change when
there is a real one to test against.

---

## Needs business decision

Nothing open.


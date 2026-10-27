# UAT Readiness Report — Pulse

**Prepared for** August Innovate Pvt Ltd
**Date** 27 October 2026 *(third revision)*
**Verdict** **READY FOR UAT**, with two settings to apply first.

> Supersedes the report of 23 October, which recorded 36 defects and predates
> three features and thirteen more defects.

---

## 1. In short

Pulse is ready for people to use in earnest.

**49 defects have been found and 47 are fixed.** Three were P0: one let any
employee hand themselves full administrative access, one exposed every
employee's identity documents to the open internet, and one paid people 64% of
the salary they had been promised. Twenty-four were P1.

One defect is open on purpose (QA-38, waiting on a Google credential) and one
was closed at your request without action (QA-15).

Since the last report, three features were built to completion and are
exercised end to end:

| Feature | What it does |
|---|---|
| **Candidate pre-boarding** | HR maintains a document catalogue and asks for documents in two stages; the candidate uploads from their own portal; HR reviews; everything carries onto the employee record on joining day |
| **Identity through the journey** | One login from candidate to employee to alumnus, with the transitions, the audit trail and the sign-in rule held in Postgres rather than in whichever auth service is underneath |
| **Digital onboarding** | Six legal documents, written and versioned by HR, assigned by role, signed on screen with the text frozen and hashed, and kept as a PDF the person can download — including after they leave |

Offers are now accepted by the candidate rather than relayed by telephone, and
that acceptance is recorded the same way a signed agreement is.

---

## 2. What changed since 16 October

| | 16 Oct | 23 Oct | Today |
|---|---|---|---|
| Verdict | Not ready | Ready | **Ready** |
| Defects found | 14 | 36 | **49** |
| Open | 3 | 0 | **1**, by choice |
| Automated tests | 0 | 63 | **93** |
| Database guard checks | 0 | 0 | **33** |
| Modules exercised | 4 of 20 | 20 of 20 | 20 of 20, **plus 3 new** |
| Migrations this engagement | — | 24 | **30** |

Thirteen more defects since 23 October is not the project getting worse. Nine
of them came from two things that had never been done before: asking what each
role can **change** rather than what it can read, and walking the candidate
journey as a candidate.

---

## 3. The defects

### By severity

| Severity | Found | Fixed | Open |
|---|---:|---:|---:|
| **P0** — data exposed, access escalated, or wrong money paid | 3 | 3 | 0 |
| **P1** — a core job cannot be done, or is done wrongly | 24 | 23 | 1 |
| **P2** — works, but wrongly or confusingly | 20 | 20 | 0 |
| **P3** — minor | 1 | 1 | 0 |
| Severity not established | 1 | — | — |
| **Total** | **49** | **47** | **1** |

The one open defect is **QA-38**: the login screen offered Google sign-in while
only email and password were enabled on the project. The button is hidden until
the provider is switched on, which needs a Google credential only August can
supply.

QA-15 was closed without action at your request.

### The three P0s

**QA-36 — any employee could make themselves a super admin.** Row-level
security can say which rows you may write; it cannot say which columns. The
policy on `profiles` allowed a person to update their own row, and `role` sits
on their own row. One request and an ordinary employee held every payslip,
every salary and every exit record in the company. A trigger now judges the
change rather than the row. The first version of that fix had a hole of its
own — its membership check ran under RLS, which hid the existing staff and let
a stranger walk into the company as its administrator; the check now runs
where RLS cannot distort the answer. Nine regression checks cover it.

**QA-19 — identity documents were downloadable by anyone on the internet.**
Both storage buckets were marked public, which serves every object with no
sign-in and no API key. Eight carefully written security policies existed for
storage and were being bypassed entirely. A PAN card scan was fetched with no
credentials to prove it. The buckets are now private and files are reached
through links that expire in ten minutes. With real data this would have been a
reportable personal data breach under the DPDP Act, not merely a bug.

**QA-24 — the only salary structure paid 64% of the agreed salary.** Basic 40%
of gross, HRA 20%, DA 4%, special allowance left at zero, and nothing filling
the remaining 36%. Somebody assigned ₹12,00,000 a year was paid a gross of
₹64,000 against ₹1,00,000. Special allowance is now the balancing figure, and
the screen refuses to save a breakup that does not add up to the agreed salary.

### A fourth that was nearly a P0

**QA-45 — HR could delete an entire month's payroll.** Not a P0 only because
nobody had. QA-34 had carefully stopped HR writing payslips, earnings and
deductions. Nobody checked `DELETE` on the row above them, and the foreign
keys cascade from `payroll_runs` down through every payslip. So an HR admin
could not alter a single payslip and could erase all of them with one request.

Worth recording as a lesson rather than an incident: the control on *writing*
was built with care, and the control on *deleting* was never considered. A
wrong figure is visible and argued about. A missing record is not.

### The pattern worth noticing

Most of the serious defects shared one shape: **the screen said it worked.**

- Payroll reported "computed successfully" while paying ₹0 (QA-16)
- The first December run said success with ₹2,000 of deductions across eleven
  people (QA-23)
- The mentor directory said "nobody has offered to mentor yet", which it would
  have said with a hundred mentors registered (QA-32)
- Five of the six kinds of separation were saved and then invisible (QA-27)
- Every in-app notification across six features was silently refused (QA-29)
- HR saving a retention period saw "Saved" and the number had not moved (QA-47)

None of these is visible from the code, and none would be caught by a tester
who trusts the success message. They were found by doing the job end to end and
then checking the database against hand arithmetic. That is the method worth
keeping during UAT.

---

## 4. Coverage

| Module | Depth | How it was tested |
|---|---|---|
| Authorization (129 tables) | **Good** | Automated matrix, 7 roles × 30 tables, ownership-checked |
| Payroll | **Good** | Unit tests for the arithmetic, plus four full cycles through the screens |
| Leave | **Good** | End to end across two roles, balance arithmetic, negative tests |
| Storage and documents | **Good** | Bucket policy and signed URLs, tested from both sides |
| Separation | **Good** | Full flow; three defects found and fixed |
| Mentorship | **Good** | Full flow; the directory fault found and fixed |
| Recruitment | Moderate | Candidate to interview; scheduling, validation, analytics |
| Onboarding | Moderate | Joiner started from a template, 23 tasks and 5 check-ins created |
| Performance | Moderate | Cycle created, activated, 19 reviews generated |
| Helpdesk, self-service letters | Moderate | Ticket raised as an employee; PDF output read |
| Assets | Moderate | Added, issued, returned |
| Recognition | Moderate | Created, reacted to, commented on |
| Attendance | Moderate | Clock in and out, hours checked against the stored values |
| Workflows | Moderate | Created from a template and enabled |
| Reports | Moderate | Every tab rendered against real figures |
| **Candidate pre-boarding** | **Good** | HR sent a list, the candidate uploaded from their own portal, the row and the stored file were both checked. 10 database guard checks |
| **Digital onboarding** | **Good** | An agreement signed as a real user; name, timestamp, hash and PDF verified. 14 database guard checks |
| **Offer acceptance** | **Good** | Accepted as the candidate; frozen terms, hash and PDF verified; four guards held against the live accepted offer |
| **Identity transitions** | **Good** | Candidate to employee to alumnus, with 9 database guard checks on the privileged columns |

**Not covered, and honest about it:** performance review *content* (a cycle was
generated, no review was written), income tax and TDS screens, the recruitment
pipeline beyond scheduling, concurrency, cross-browser, mobile layouts, session
expiry, and load.

**Not covered because it is switched off:** company sign-on. The code is
written and the database model is in place, but no Google identity has ever
been created, so that path has never run. The first real sign-in is the test.

---

## 5. Security

| Check | Result |
|---|---|
| Row-level security enabled | **129 of 129 tables** |
| Tables with security on but no policy | **0** |
| Database functions reachable without signing in | **0** |
| Storage buckets public | **0** (both closed, QA-19) |
| Read-side access checks | 210 (7 roles × 30 tables) — **PASS** |
| **Write-side access checks** | **84 (6 roles × 14 tables) — PASS** |
| Targeted guard checks on new features | **33**, all inside rolled-back transactions |

The authorization model is genuinely strong. Every fault found in it was a
specific mistake rather than a missing foundation.

**The write-side matrix is new, and it earned its place immediately.** The
original matrix asks what each role can *read*; that is why QA-36 — any
employee being able to make themselves a super admin — survived forty-four
migrations. The first run of the new one found QA-45: HR could not alter a
single payslip, and could delete an entire month's payroll, because the
foreign keys cascade from the run down to every payslip under it. The control
on *writing* had been built with care and the control on *deleting* had never
been considered.

**One residual.** A single document URL cached by the CDN still serves after the
origin was closed. You asked to leave it until the databases move. It cannot be
reached without the exact URL, and it expires on its own.

---

## 6. What to do before testers start

Two are settings. The rest is who holds which account.

**1. Set the public address.** *Two minutes, and the only one that really
matters.*

```
VITE_PUBLIC_APP_URL=https://pulse.augustinnovate.com
```

Every set-password invitation and alumni reactivation link is built from this.
Leave it unset and they are built from whatever the person generating them is
browsing — `localhost` on a developer's machine. The link looks completely
normal and reaches nobody, so nothing appears wrong until a real candidate says
it is broken. Pulse now warns an administrator on the dashboard when this is
wrong, but setting it is better than being warned.

**2. The two deferred Supabase switches** — leaked-password protection and
multi-factor. Outstanding since 16 October. Two toggles, no code. Worth doing
before real salary data exists, not after.

**3. Decide who holds which account.**

* **Payroll admin.** Computing a run, generating payslips and publishing them
  need it, which mirrors what the database has always enforced. An HR admin can
  set up a cycle but not compute it, and will be confused if nobody said so.
* **Super admin.** Needed to set a password for a member of staff. HR can do it
  for candidates and alumni only — deliberately, since letting HR set a password
  on a super admin's login would be privilege escalation.

**4. Confirm the LWF figure.** The employee share was corrected from ₹150 to
₹50 against the Karnataka Labour Welfare Board's published rates, with the
employer paying ₹100. Right as at today, but the Board revises it and it is
real money leaving real salaries.

Full detail in `QA/11_CONFIGURATION_CHECKLIST.md`, including how to enable
company sign-on when you are ready.

---

## 7. What to watch during UAT

Written for whoever is running the testing.

**Do not trust a success message.** This is the single most useful thing on
this page. Seven defects — QA-24, QA-29, QA-34, QA-37, QA-42, QA-47 and QA-49 —
had exactly one shape: the screen said it worked and nothing had happened.

It has a cause. Row-level security does not refuse a write it disallows; it
narrows it to no rows and returns success. So a screen offered to somebody the
database will not permit reports a cheerful "Saved" and changes nothing.

Check the figure, the list or the record afterwards. Every time.

**Payroll deserves a full cycle, not a spot check.** Assign a salary, create a
cycle, compute, generate payslips, publish, then sign in as that employee and
read the payslip. Every payroll defect was found that way and none would have
been found any other way.

**Try the awkward cases.** A contractor, an intern, somebody on unpaid leave,
somebody who joined mid-month. The rules differ for each and the differences are
where the mistakes live.

**December is special.** The labour welfare fund is only taken in December. If
you test a November run you will not see it.

**Workflows have never actually fired.** Notifications were refused for every
feature until this week, so no workflow has ever delivered anything. They are
worth one deliberate test now that the path works.

**Walk the candidate journey as a candidate.** Not as HR looking at a candidate.
Sign in on their portal, upload a document, accept an offer. Three defects came
from doing that once, and none of them was visible from the HR side.

**Say when a screen is merely confusing.** Several fixes came from exactly that
kind of note rather than from a crash — including the leave balance bars, which
were reported simply as "this control is not uniform".

---

## 8. Known gaps, by choice

These are decisions, not oversights. Each is recorded in the defect register
with what would change it.

| Gap | Why it is acceptable |
|---|---|
| No PF exemption for a Form 11 excluded employee | The over-deduction lands in the employee's own PF account; a short one costs the employer interest and damages. Built when August actually hires somebody in that position |
| No section 197 override on contractor TDS | Recoverable by the contractor as a refund. Built when the first certificate arrives |
| Loss of pay comes from approved unpaid leave only, not from attendance | There is no agreed rule yet for when an unmarked day becomes unpaid. Guessing one would quietly dock people |
| Professional tax is Karnataka only | Every employee is in Karnataka. A per-state table is needed before anybody is hired elsewhere |
| Retention of candidate documents is a button, not a schedule | Pulse has no scheduler it can rely on across the move to Azure, and a purge that runs itself where nobody is watching is how documents vanish that somebody needed. An administrator sets the period; HR presses the button. The obligation is visible, which is also easier to evidence to a regulator |
| Aadhaar is compulsory and collected in full | Decided by August on 27 October against advice. Files are private, reached only through expiring links, and readable only by HR and the hiring panel |
| A permission can be granted that the database will refuse | Rather than stop the permissions screen offering it — which needs a third copy of what RLS allows, and removes a capability — the write now reports the refusal plainly instead of claiming success (QA-49) |

---

## 9. Evidence

Everything in this report can be re-checked.

- **Defect register** — `QA/05_DEFECT_REGISTER.md`, 49 entries with the cause,
  the fix and how it was verified
- **Execution report** — `QA/07_TEST_EXECUTION_REPORT.md`, including the payroll
  cycle that found four defects in one sitting
- **Access matrix** — `QA/scripts/access_matrix.py`, re-runnable, exits non-zero
  on a finding
- **Write-side matrix** — `QA/scripts/write_matrix.py`, 6 roles × 14 tables,
  counting rows affected rather than looking for an error
- **Guard suites** — `profile_guard.sh` (9), `preboarding_guard.sh` (10) and
  `agreement_guard.sh` (14). Every check runs inside a rolled-back transaction
  and is safe against any environment, including one holding real data
- **Unit tests** — `npm test`, 93 passing across 6 files
- **Configuration checklist** — `QA/11_CONFIGURATION_CHECKLIST.md`
- **Migrations** — 30 added this engagement, each one carrying the reasoning for
  the change in its own comments

---

## 10. Verdict

**Ready for UAT**, once the public address is set.

No P0 is open. The single open P1 is open on purpose: company sign-on is
switched off, and the button for it is hidden until you supply a Google
credential. Nothing else waits on anybody.

The payroll arithmetic is tested and has been watched end to end. All twenty
modules have been opened and used, and the three new ones have been walked
through from both sides — HR asking for documents and the candidate sending
them, an agreement signed and downloaded, an offer accepted. Authorization
holds against 210 read checks and 84 write checks.

### Three things worth carrying into the testing

**A screen saying "Saved" is not evidence.** Seven defects had that exact
shape, and they share a cause: row-level security does not refuse a write it
disallows — it narrows it to nothing and reports success. The new guard
(QA-49) closes the specific instances found; the habit of checking afterwards
closes the rest.

**Read-side testing finds read-side faults.** QA-36 — any employee able to
make themselves a super admin — sat in the very first migration and survived
every round, because the automated check asked what each role could read. The
write-side matrix was written on 27 October and found a P1 on its first run:
HR could not alter a payslip, and could delete an entire month of them. If a
whole question has never been asked, the coverage figure is not measuring what
it appears to measure.

**Pulse has no server of its own.** Every rule lives in the browser or in the
database, and a rule that lives only in the browser is not enforced. Several
defects were exactly that. When a tester says "it should not have let me do
that", the first question is where that rule lives.

### What is left

The kind of thing only real users find: whether the screens make sense,
whether the workflow matches how August actually works, and whether the
numbers match what finance expects. That is what UAT is for.

---

© 2026 | Augustinnovate Pvt. Ltd.

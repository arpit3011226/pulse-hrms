# UAT Readiness Report — Pulse

**Prepared for** August Innovate Pvt Ltd
**Date** 23 October 2026 · **revised 27 October 2026**
**Verdict** **READY FOR UAT**, once the two fixes of 27 October are re-tested.

> Supersedes the report of 16 October, which said **not ready**. What changed is
> set out in section 2.
>
> **Revision of 27 October.** While planning the pre-boarding work, a P0 was
> found that this report had not seen: any signed-in employee could make
> themselves a super admin with a single request (QA-36). A P1 was found with
> it — a converted candidate was never actually made an employee (QA-37). Both
> are fixed and both have regression cover. The figures below now read 36
> found, 36 fixed, three of them P0. The verdict stands, but it stands on
> fixes that are two days old rather than on a settled week.

---

## 1. In short

Pulse is ready for people to use in earnest.

**36 defects were found and 36 are fixed.** Three of them were P0 — one let any
employee hand themselves full administrative access, one exposed every
employee's identity documents to the open internet, and one paid people 64% of
the salary they had been promised. Seventeen were P1.

The two reasons the last report said no have both been dealt with. There was no
automated test of any kind; there are now 63, covering the payroll arithmetic
where a mistake costs money. Of twenty modules only four had been tested; every
one has now been exercised through the screens, and that pass alone found nine
more defects, four of which would have stopped a tester on their first click.

What remains is the ordinary business of a UAT: one residual item waiting on a
cache to expire, two settings in the Supabase dashboard you have chosen to
defer, and areas that can only be judged by real people doing real work.

**The recommendation is to start.**

---

## 2. What changed since 16 October

| | 16 October | Today |
|---|---|---|
| Verdict | Not ready | **Ready** |
| Defects found | 14 | **36** |
| Still open | 3 | **0** (1 residual, 1 closed at your request) |
| Automated tests | **0** | **63** |
| Modules exercised through the UI | 4 of 20 | **20 of 20** |
| Questions waiting on a decision | 5 | **0** |

Twenty more defects were found in the week. That is not a sign of things getting
worse — it is what happens when somebody finally clicks through every screen
instead of reading the code.

---

## 3. The defects

### By severity

| Severity | Found | Fixed | Open |
|---|---:|---:|---:|
| **P0** — data exposed, access escalated, or wrong money paid | 3 | 3 | 0 |
| **P1** — a core job cannot be done, or is done wrongly | 17 | 17 | 0 |
| **P2** — works, but wrongly or confusingly | 15 | 15 | 0 |
| **P3** — minor | 1 | 1 | 0 |
| **Total** | **36** | **36** | **0** |

One further item, QA-15, was closed without action at your request.

### The three P0s

**QA-36 — any employee could make themselves a super admin.** Row-level
security can say which rows you may write; it cannot say which columns. The
policy on `profiles` allowed a person to update their own row, and `role` sits
on their own row. One request and an ordinary employee held every payslip,
every salary and every exit record in the company. A trigger now judges the
change rather than the row. The first version of that fix had a hole of its
own — its membership check ran under RLS, which hid the existing staff and let
a stranger walk into the company as its administrator; the check now runs
where RLS cannot distort the answer. Seven regression checks cover it.

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

### The pattern worth noticing

Most of the serious defects shared one shape: **the screen said it worked.**

- Payroll reported "computed successfully" while paying ₹0 (QA-16)
- The first December run said success with ₹2,000 of deductions across eleven
  people (QA-23)
- The mentor directory said "nobody has offered to mentor yet", which it would
  have said with a hundred mentors registered (QA-32)
- Five of the six kinds of separation were saved and then invisible (QA-27)
- Every in-app notification across six features was silently refused (QA-29)

None of these is visible from the code, and none would be caught by a tester
who trusts the success message. They were found by doing the job end to end and
then checking the database against hand arithmetic. That is the method worth
keeping during UAT.

---

## 4. Coverage

| Module | Depth | How it was tested |
|---|---|---|
| Authorization (129 tables) | **Good** | Automated matrix, 7 roles × 30 tables, ownership-checked |
| Payroll | **Good** | 63 unit tests, plus four full cycles through the screens |
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

**Not covered, and honest about it:** performance review *content* (a cycle was
generated, no review was written), income tax and TDS screens, the recruitment
pipeline beyond scheduling, concurrency, cross-browser, mobile layouts, session
expiry, and load.

---

## 5. Security

| Check | Result |
|---|---|
| Row-level security enabled | **129 of 129 tables** |
| Tables with security on but no policy | **0** |
| Database functions reachable without signing in | **0** |
| Storage buckets public | **0** (both closed, QA-19) |
| Access-control checks executed | 210 (7 roles × 30 tables) |

The authorization model is genuinely strong. Every fault found in it was a
specific mistake rather than a missing foundation.

**One residual.** A single document URL cached by the CDN still serves after the
origin was closed. You asked to leave it until the databases move. It cannot be
reached without the exact URL, and it expires on its own.

---

## 6. What to do before testers start

Three things. None blocks a start.

1. **Two Supabase dashboard settings** — leaked-password protection and
   multi-factor options. You chose to defer these. They are two switches and
   need no code.
2. **Confirm the LWF figure one last time.** The employee share was corrected
   from ₹150 to ₹50 this week after checking the Karnataka Labour Welfare
   Board's rates. It is now right, but the Board revises it and this is real
   money.
3. **Decide who runs payroll in UAT.** Computing a run, generating payslips and
   publishing them now require a payroll admin, which matches what the database
   has always enforced. An HR admin can set up a cycle but not compute it. If a
   tester expects to do both, give them the payroll admin account.

---

## 7. What to watch during UAT

Written for whoever is running the testing.

**Do not trust a success message.** Five of the worst defects reported success.
Check the figure, the list or the record afterwards.

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

**Say when a screen is merely confusing.** Several fixes this week came from
exactly that kind of note rather than from a crash.

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

---

## 9. Evidence

Everything in this report can be re-checked.

- **Defect register** — `QA/05_DEFECT_REGISTER.md`, 36 entries with the cause,
  the fix and how it was verified
- **Execution report** — `QA/07_TEST_EXECUTION_REPORT.md`, including the payroll
  cycle that found four defects in one sitting
- **Access matrix** — `QA/scripts/access_matrix.py`, re-runnable, exits non-zero
  on a finding
- **Profile privilege guard** — `QA/scripts/profile_guard.sh`, 7 checks for
  QA-36, each inside a rolled-back transaction, safe against any environment
- **Unit tests** — `npm test`, 63 passing
- **Migrations** — 24 added this engagement, each one carrying the reasoning for
  the change in its own comments

---

## 10. Verdict

**Ready for UAT.**

Nothing P0 or P1 is open. The payroll arithmetic is tested and has been watched
end to end. Every module has been opened and used. The authorization model holds
up to an automated attack across 210 role-and-table combinations.

One caution, added on 27 October. QA-36 sat in the first migration this project
ever wrote and survived every round of testing until somebody read the policy
while working on something else. The automated access matrix did not catch it,
because that script asks what a role can **read** and this was a hole in what a
role could **write**. Write-side checks are now the thinner half of the
coverage, and worth extending during UAT rather than after it.

What is left is the kind of thing only real users find: whether the screens make
sense, whether the workflow matches how August actually works, and whether the
numbers match what the finance team expects. That is what UAT is for.

The one caution worth repeating: this application has no server of its own.
Every rule lives either in the browser or in the database, and a rule that lives
only in the browser is not enforced at all. Several defects this week were
exactly that. When a tester reports that something should not have been allowed,
the first question to ask is where that rule lives.

---

© 2026 | Augustinnovate Pvt. Ltd.

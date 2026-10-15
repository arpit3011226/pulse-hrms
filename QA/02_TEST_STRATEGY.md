# Test Strategy

## The principle that shaped it

Pulse has no application server. Every rule either lives in the browser or in
the database. **A rule enforced only in the browser is not enforced** — anyone
can post to the API directly.

So testing is weighted towards the database. Of the defects found, four were
business rules that existed only as form validation: leave entitlements,
helpdesk ticket numbering, mentorship caps, application uniqueness. None would
be caught by clicking through the UI, because the UI behaves correctly. They
are only visible when you attack the API the way a determined user could.

## Priority

Ordered by *likelihood of a defect* × *cost if it reaches production*.

| Rank | Area | Why |
|---|---|---|
| 1 | Authorization | 128 tables, 7 roles. A mistake exposes salary or personal data. Cheap to test exhaustively — automated |
| 2 | Money | Payroll, compensation, settlements. Wrong by a rupee is a serious incident |
| 3 | Leave | Most-used workflow, real entitlement arithmetic, multi-role approval |
| 4 | Employee lifecycle | Joining, manager change, leaving. Feeds everything else |
| 5 | Attendance | High volume, date-boundary heavy |
| 6 | Recruitment, performance | Lower frequency, lower blast radius |
| 7 | Recognition, assets, helpdesk | Useful, but a defect is an annoyance |

Work so far has covered 1 and 3. **2 is the largest untested risk.**

## Methods, and where each is used

**Authorization** — impersonate each role at the database and count what it can
see. Automated in `QA/scripts/access_matrix.py`. Counts alone are not enough:
an employee seeing one compensation row is correct when it is their own, so
ownership is checked too.

**End-to-end workflows** — drive the real UI as a real person, across roles,
checking the database at each step. Slow; reserved for the workflows that
matter.

**Negative testing against the API** — bypass the UI and attempt what the forms
prevent. This is where the serious defects were. Every business rule should be
attacked this way at least once.

**Boundary testing** — zero balances, empty tables, dates across year ends,
duplicates. The recurring defect in this application is a screen built
correctly with nothing behind it, so *empty* is the first boundary to try.

**Regression** — re-run the authorization matrix and the leave workflow after
any change touching policies or balances.

## Explicitly out of scope, and why

- **Performance and load.** No baseline exists and the user count is small.
  Worth doing before scale, not before UAT.
- **Cross-browser.** Chromium only; no other browser available here.
- **Email.** The demo domain is not real, so nothing can be received.
- **File upload safety.** Storage policies were not enumerated. This is a
  genuine gap, flagged rather than silently skipped.

## What "tested" means here

A test counts only if it was executed and its result observed. A workflow
counts only if the outcome was verified in the database as well as on screen.
Nothing in these documents is projected, estimated, or inferred from the code
looking correct.

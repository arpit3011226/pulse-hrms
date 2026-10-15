# Regression Test Guide

What to re-run after a change, and how.

## Automated

### Authorization matrix

```bash
python3 QA/scripts/access_matrix.py
```

Asks the database, as each of the seven roles, how many rows of each sensitive
table it can see — using the same impersonation path a real request takes.
Fails loudly if a role reads a table it is forbidden, or reads a row belonging
to someone else where it should see only its own.

Takes about three minutes. **Run it after any migration that touches a policy,
and before any release.**

It found QA-01 and QA-02.

Counts alone cry wolf — an employee seeing one compensation row is correct when
it is their own — so tables where a role may see only its own rows are checked
by asking who each visible row belongs to. If you add a sensitive table, add it
to `DEFAULT_TABLES` and to either `FORBIDDEN` or `OWN_ROWS_ONLY`.

### Type and lint

```bash
npx tsc -b --force     # NOT `tsc --noEmit` — the root tsconfig is a solution
                       # file with files: [], so --noEmit checks nothing
npx eslint src --quiet
npm run build
```

## Manual, until automated

These are the checks that caught real defects. Each takes a minute.

### Leave, end to end — the highest-value single check

1. Sign in as `employee1`. Note the casual leave balance.
2. Apply for 2 days. **The request must appear without reloading**, and the
   balance must show 2 pending.
3. Sign in as `manager`. Team Leaves shows it. Approve.
4. Balance must become used 2, pending 0.
5. Try to apply for more days than remain — must be refused with a message
   naming the number left.

### Per-role smoke

Sign in as each role and confirm the sidebar matches the role. An employee must
not see Payroll, Recruitment, Reports or Workflows.

### Empty-state check

The recurring defect in this application is a screen built correctly with
nothing behind it, which reads as broken. After any change that adds a picker,
open it with the underlying table empty and confirm it explains itself.

## What is not covered

Payroll calculation, attendance, performance, recruitment beyond one form,
onboarding, separation, workflows, reports, file uploads, session expiry,
concurrency through the UI, cross-browser, mobile.

Treat this guide as a floor, not a ceiling.

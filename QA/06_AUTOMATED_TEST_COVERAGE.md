# Automated Test Coverage

## Honest position

The project had **no automated tests** when this engagement began, and it has
one automated check now. That is not a test suite.

| | |
|---|---|
| Test framework | Vitest |
| Unit tests | 24, all passing — payroll arithmetic |
| Component tests | 0 |
| Browser E2E tests | 0 |
| Automated checks | 2 — payroll unit tests, authorization matrix |
| CI | None |

## What is automated

### `QA/scripts/access_matrix.py`

```bash
python3 QA/scripts/access_matrix.py            # sensitive set, ~3 min
python3 QA/scripts/access_matrix.py employees  # named tables
```

Asks the database, as each of seven roles, how many rows of each sensitive
table it can see, using the same impersonation path a real request takes. Two
kinds of assertion:

- `FORBIDDEN` — tables a role must not read at all. Any row is a failure.
- `OWN_ROWS_ONLY` — tables where a role may see only its own rows. Checked by
  asking who each visible row belongs to, because a count cannot tell "my
  salary" from "everybody's salary".

Exit code 1 on any finding, so it can gate a pipeline.

**It found QA-01 and QA-02.** 210 checks per run.

### `npm test` — payroll arithmetic

```bash
npm test          # vitest run, ~0.2s
npm run test:watch
```

24 tests over `payroll-utils.ts`: component percentages and rounding, the PF
cap, the ESI threshold and its boundary either side, loss-of-pay arithmetic
including divide-by-zero and negative days, gross and net assembly, adjustments,
the basic-salary fallback, and payslip numbering.

These were written against the Indian statutory rules the code claims to
implement, not against what the code happens to do. **Four initially failed,
and in all four cases the test was wrong and the code was right** — PF is
capped at 12% of a basic of ₹15,000, which I had not accounted for. The
expectations were corrected; the code was not touched. Worth recording,
because the opposite mistake — changing code to match a wrong test — is how
payroll bugs get written.

They found QA-16 and QA-17.

### Type and lint

`tsc -b --force`, `eslint src`, `npm run build`. All pass. These catch
compilation and style, not behaviour.

> `tsc --noEmit` checks **nothing** in this repository — the root `tsconfig.json`
> is a solution file with `files: []`. Always `tsc -b`.

## What is not automated

Everything else. All 14 defects other than QA-01 and QA-02 were found by hand
and are verified by hand only. Specifically unautomated: the leave workflow,
every form validation, every role's navigation, payroll, and every business
rule now enforced by the database triggers added this week.

## Recommended next step

A Playwright suite, in this order:

1. Sign in as each role; assert the sidebar matches the role.
2. The leave workflow end to end across two roles, asserting balances.
3. One regression test per fixed defect — these are known-good scenarios with
   known-bad history, so they are the cheapest tests with the highest value.
4. Negative API tests: attempt each business rule the way a determined user
   would, bypassing the forms. This is where the serious defects were.

Then `npm test` in CI on every push.

**Not started.** Estimating it would be guessing.

## Known flaky tests

None, because there are none to be flaky.

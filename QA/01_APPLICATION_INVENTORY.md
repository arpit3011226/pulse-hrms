# Pulse — Application Inventory

*Compiled 15 October 2026 by reading the repository and querying the live schema. Nothing here is assumed; every count came from the code or the database.*

## Stack

| Layer | What it is |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, Tailwind 4 |
| Routing | TanStack Router (code-defined, `src/router.tsx`) |
| Data | TanStack Query over the Supabase JS client |
| UI | Radix primitives (shadcn conventions) under `src/components/ui` |
| Backend | Supabase — PostgREST, GoTrue, Storage |
| Database | PostgreSQL, 128 tables, 63 migrations |
| Server code | 3 Deno edge functions: `create-user`, `set-password`, one other |
| Hosting | Vercel, deployed from `main` |

There is **no application server of our own**. Every business rule either lives
in the browser or in the database. That matters for testing: anything enforced
only in the browser is not enforced at all, and several defects below are
exactly that.

## Modules

Twenty feature folders under `src/features`, 288 `.tsx` files.

| Module | Components | Route |
|---|---:|---|
| alumni | 4 | `/alumni`, `/my-records` |
| assets | 2 | `/assets` |
| attendance | 13 | `/attendance` |
| auth | 4 | `/login`, `/forgot-password`, `/onboarding` |
| dashboard | 4 | `/dashboard` |
| departments | 1 | `/departments` |
| employees | 21 | `/employees`, `/employees/$id`, `/employees/new`, `/employees/$id/edit` |
| helpdesk | 1 | `/helpdesk` |
| leave | 19 | `/leave` |
| mentorship | 12 | `/mentorship` |
| onboarding | 7 | `/new-joiners` |
| payroll | 18 | `/payroll` |
| performance | 25 | `/performance` |
| recruitment | 25 | `/recruitment`, `/recruitment/candidates/$id`, `/my-application` |
| reports | 13 | `/reports` |
| resignation | 8 | `/separation` |
| self-service | 19 | `/self-service` |
| settings | 8 | `/settings` |
| workflows | 5 | `/workflows` |
| workplace | 7 | `/recognition` |

29 routes in total. Most modules are a single route with tabs; tabs are
addressable as `?tab=` since 15 October.

## Roles

Seven, from the `app_role` enum. Permissions come from
`DEFAULT_ROLE_PERMISSION_LEVELS` in `src/lib/constants.ts`, overridable per
organisation in settings.

| Role | Scope |
|---|---|
| `super_admin` | Everything |
| `hr_admin` | People, hiring, letters, separation, workflows, org setup. Payroll read-only, and cannot reach leadership pay (migration 00049) |
| `payroll_admin` | Payroll, compensation, reimbursements. Directory and attendance read-only |
| `leadership` | Wide read, including compensation |
| `manager` | Own team: leave approval, attendance, reviews. Not a role in the data — it is the `reporting_manager_id` column, so people with the plain `employee` role can manage a team |
| `employee` | Own records plus the directory |
| `candidate` / `alumni` | One screen each, outside the staff app |

## Authorization

Row-level security is on for **all 128 tables**, and every table has at least
one policy — checked, not assumed. No policy evaluates to an unrestricted
`true`. No function in the schema is executable by `anon` (one was, until
QA-02).

This is the primary control. The UI hides menus by role, but that is
presentation only — the database is what actually refuses.

## Testing infrastructure found

**None.** No test framework, no test files, no CI workflow, no `test` script in
`package.json`. The only automated checks are `tsc -b` and `eslint`, both of
which pass.

This is the single biggest gap in the project and the reason defects reached
UAT: nothing re-checks behaviour after a change.

## What this inventory does not cover

- Storage buckets and file-upload paths were not enumerated.
- The third edge function was not read.
- Workflow templates and their triggers were not catalogued.
- No requirements or acceptance-criteria documents exist in the repository, so
  "correct behaviour" has been inferred from the code and from the business
  rules you have stated. Where that was ambiguous it is recorded as **Needs
  business decision** in the defect register rather than guessed.

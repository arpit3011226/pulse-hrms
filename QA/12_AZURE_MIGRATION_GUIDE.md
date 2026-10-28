# Moving Pulse to Azure — a guide for the developer doing it

**Prepared for** August Innovate Pvt Ltd
**Date** 27 October 2026
**Target** `pulse.augustinnovate.com`, 20–30 employees, 5–7 at once
**Budget** ₹5,000–10,000 a month, all in

---

## 1. Read this part first

There is one decision that determines whether this takes a week or three
months, and it is counter-intuitive.

**Do not rewrite Pulse's backend. Move the one it already has.**

Supabase is not a proprietary service. The pieces Pulse uses are open source
and run anywhere Docker runs:

| Piece | What it does for Pulse | Used by |
|---|---|---|
| **PostgREST** | Turns Postgres tables into the REST API the app talks to | **698 call sites** |
| **GoTrue** | Sign-in, sessions, JWTs | 12 call sites |
| ~~Storage API~~ | **Replaced by Azure Blob — see below** | 1 adapter file |
| **Edge Runtime** | 4 functions that need the service key | 4 call sites |

Run those four containers on Azure, point them at Azure Database for
PostgreSQL, and **the application code barely changes.** You edit four
environment variables.

### Why this is not just about saving effort

It is about not throwing away the testing.

Row-level security is the whole of Pulse's security model — 129 tables, every
one of them. It works because PostgREST sets `request.jwt.claims` on each
connection from a JWT that GoTrue signed. Every policy reads that claim.

That chain has been verified: 210 read checks, 84 write checks, 33 targeted
guard checks. **If you replace PostgREST with hand-written APIs, none of that
verification means anything any more** — and the failure mode is silent. A
connection with no claim does not error; RLS simply decides the person can see
nothing, or, if something runs as a privileged role, everything.

Keep the chain, keep the proof.

### What you are *not* keeping

- **Storage API** — replaced by Azure Blob, 28 October. It cannot write to
  Blob: its file backend wants extended attributes an Azure Files share may
  not provide, and the alternative adds a container to run and watch. Pulse
  now talks to Blob through its own `files` function, which also brings soft
  delete and backups for well under a dollar a month. **One container fewer.**
- **Realtime** — Pulse does not use it. Leave it out.
- **Supabase Studio** — a convenience. Leave it out of production; use psql or
  pgAdmin.
- **Supavisor / connection pooling** — unnecessary at 5–7 concurrent users.

---

## 2. Target architecture

```
          pulse.augustinnovate.com
                    │
        ┌───────────┴───────────┐
        │  Azure Static Web App │   the React build, free tier
        └───────────┬───────────┘
                    │  https
        ┌───────────┴────────────────────────────┐
        │  Azure VM (Linux, B2s) — docker compose │
        │                                         │
        │   Caddy or nginx  → TLS, one hostname   │
        │   PostgREST       → the REST API        │
        │   GoTrue          → auth                │
        │   Edge Runtime    → 5 functions          │
        └───────────┬────────────────────────────┘
                    │  private endpoint
        ┌───────────┴───────────────────────────┐
        │  Azure Database for PostgreSQL        │
        │  Flexible Server, Burstable B1ms      │
        │  automated backups, PITR              │
        └───────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │  Azure Blob Storage   │  documents, payslips, signed agreements
        └───────────────────────┘
```

Email already goes through Resend over plain HTTPS. Nothing to move.

### What it costs

Central India, pay as you go, October 2026. Treat as indicative and confirm on
the Azure pricing calculator.

| Item | Spec | Monthly |
|---|---|---:|
| PostgreSQL Flexible Server | B1ms, 1 vCore, 2 GiB | ~$18 |
| — storage and backups | 32 GB + 7-day PITR | ~$6 |
| Virtual machine | B2s, 2 vCPU, 4 GiB | ~$35 |
| — OS disk | 64 GB standard SSD | ~$5 |
| Blob Storage | a few GB, LRS | ~$2 |
| Static Web Apps | Free tier | $0 |
| **Total** | | **~$66 ≈ ₹5,600** |

**If that is tight**, a B1s VM (1 vCPU, 1 GiB) runs the four containers at this
load and takes roughly $26 off, bringing it to about ₹3,400. Start on B2s for
the migration so you are not debugging memory pressure, then step down once it
is stable — resizing is a reboot.

**One thing not to economise on:** use the *managed* Postgres, not Postgres in
the VM's docker-compose. It is about $10 a month more and it brings automated
backups and point-in-time restore. This database holds salaries, PF numbers
and bank accounts. The day you need a restore, you will not care what it cost.

> A factual aside, since cost is an explicit goal: Supabase's own hosted Pro
> plan is around $25 a month and needs no migration at all. If Azure is a
> company policy decision, ignore this. If it was chosen to save money, it is
> worth five minutes of checking.

---

## 3. What changes in the application

Genuinely small. The whole list:

| File | Change |
|---|---|
| `.env` / build variables | Four values, below |
| `src/lib/config.ts` | Nothing. It already reads them all — it is the only file in the codebase that touches the environment |
| `src/lib/storage.ts` | **Already done.** It talks to the `files` function, which talks to Blob. The four exported functions kept their shapes, so all eight callers are untouched |
| `supabase/functions/*` | Nothing, if you run Edge Runtime. Otherwise port 5 small Deno functions |
| Everything else | Nothing |

```
VITE_SUPABASE_URL=https://api.pulse.augustinnovate.com
VITE_SUPABASE_ANON_KEY=<the anon JWT you sign, see step 4>
VITE_PUBLIC_APP_URL=https://pulse.augustinnovate.com
VITE_SSO_ENABLED=false        # until Google sign-on is live
VITE_SSO_DOMAIN=augustinnovate.com
```

`VITE_PUBLIC_APP_URL` is not optional. Without it, every set-password
invitation and alumni reactivation link is built from whatever the person
generating it is browsing. The link looks completely normal and reaches
nobody.

---

## 4. The migration, step by step

### Step 1 — The database

1. Create **Azure Database for PostgreSQL Flexible Server**, Burstable B1ms,
   in Central India. PostgreSQL 15 or later.
2. Enable the extensions Pulse uses: `pgcrypto` (for `gen_random_uuid()`) and
   `uuid-ossp` if present. Check `supabase/migrations/00001_initial_schema.sql`.
3. Create the roles PostgREST and GoTrue expect. Supabase's schema assumes
   `anon`, `authenticated`, `service_role` and `authenticator`. Every RLS
   policy in this project is written against them, so the names must match
   exactly.
4. Create the `auth` and `storage` schemas. GoTrue creates its own tables on
   first run. Nothing creates `storage` any more — the Storage API is gone —
   but several migrations still reference `storage.buckets` and
   `storage.objects`, so the schema and those two tables have to exist.
   `QA/scripts/replay_migrations.sh` creates exactly what is needed and is
   the easiest place to copy it from.

### Step 2 — Apply the schema

All 90 migrations are plain SQL and run unchanged:

```bash
for f in supabase/migrations/*.sql; do psql "$AZURE_PG_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

Run them in order. Stop at the first error — do not skip and come back.

A few touch `storage.buckets` and `storage.objects`. Those tables are vestigial
now that files live in Blob, but the migrations still mention them, so they
must exist or the replay stops. Step 1 above creates them.

### Step 3 — Move the data

```bash
# From Supabase. Data only; the schema came from the migrations above.
pg_dump --data-only --no-owner --no-privileges \
        --exclude-schema=auth --exclude-schema=storage \
        "$SUPABASE_PG_URL" > pulse-data.sql

# auth.users separately — GoTrue owns this table and the password hashes
# must come across or everybody is locked out.
pg_dump --data-only --no-owner --table=auth.users --table=auth.identities \
        "$SUPABASE_PG_URL" > pulse-auth.sql

psql "$AZURE_PG_URL" -v ON_ERROR_STOP=1 -f pulse-data.sql
psql "$AZURE_PG_URL" -v ON_ERROR_STOP=1 -f pulse-auth.sql
```

**The JWT secret must come with you.** GoTrue signs tokens with it and
PostgREST verifies with it. Copy the existing `JWT_SECRET` from the Supabase
project settings rather than generating a new one, or every session is
invalidated and — worse — any token Pulse issued stops verifying mid-use.

Then mint new `anon` and `service_role` keys signed with that secret. They are
ordinary JWTs with a `role` claim and a long expiry.

### Step 4 — The containers

On the VM, a `docker-compose.yml` with four services. Start from the official
self-hosting compose file at `supabase/docker` on GitHub and **delete** the
services you do not need: `realtime`, `studio`, `meta`, `imgproxy`, `vector`,
`supavisor`, and the bundled `db` (you are using managed Postgres).

The settings that matter:

```
# shared
JWT_SECRET            the one you brought across
ANON_KEY              signed with it
SERVICE_ROLE_KEY      signed with it

# postgrest
PGRST_DB_URI          postgres://authenticator:…@<azure-pg>:5432/postgres
PGRST_DB_SCHEMAS      public,storage
PGRST_DB_ANON_ROLE    anon
PGRST_JWT_SECRET      ${JWT_SECRET}

# gotrue
GOTRUE_SITE_URL       https://pulse.augustinnovate.com
GOTRUE_URI_ALLOW_LIST https://pulse.augustinnovate.com/*
GOTRUE_DB_DATABASE_URL  postgres://supabase_auth_admin:…@<azure-pg>:5432/postgres
GOTRUE_JWT_SECRET     ${JWT_SECRET}
GOTRUE_DISABLE_SIGNUP true     ← HR creates every account; see note below
GOTRUE_SMTP_*         or leave unset, since Pulse sends via Resend

# files  (replaces the Storage API container)
AZURE_STORAGE_ACCOUNT   the storage account name
AZURE_STORAGE_KEY       one of its access keys
# The key never leaves this function. The browser only ever receives a URL
# that expires in ten minutes.
```

`GOTRUE_DISABLE_SIGNUP=true` matters. Pulse creates every login through HR,
and the company-setup screen that makes the first super admin has already been
run. Leaving open sign-up on would let anybody with the URL create an account.

Put Caddy in front for TLS and route one hostname to the right container by
path, the way Supabase's Kong does: `/rest/v1/*` → PostgREST, `/auth/v1/*` →
GoTrue, `/storage/v1/*` → Storage, `/functions/v1/*` → Edge Runtime.

### Step 5 — The frontend

Azure Static Web Apps, free tier, pointed at the repository. Build command
`npm run build`, output `dist`. Set the five environment variables from
section 3 as build-time variables — Vite inlines them, so they must be present
when it builds, not when it runs.

Add `pulse.augustinnovate.com` as a custom domain. TLS is included.

### Step 6 — Files, on Azure Blob

Create **three private containers**, named exactly as the application names
them:

```
employee-documents        <employee_id>/…
candidate-documents       <candidate_id>/…
reimbursement-receipts    <org_id>/<employee_id>/…
```

**Private. Every one of them.** One bucket being public was a reportable
personal data breach (QA-19) — a PAN card scan was fetched from the open
internet with no credentials at all. Turn on soft delete while you are there;
it costs nothing at this size and it is the difference between a mistake and
an incident.

Copy the objects across with `azcopy`, preserving the paths exactly. Rows in
the database point at a container and a key, so a renamed path is a lost
file. `employee_identity_documents.file_url` holds one full URL that needs
rewriting by hand.

**Who may read what** is not configured on the containers. Blob has no
row-level security, so the twelve policies that used to live on
`storage.objects` are now one Postgres function, `can_access_file()`, added
in migration 00091. The `files` function asks it with the caller's own token
before it mints any URL.

That is checked, and it is worth running after the move:

```bash
./QA/scripts/file_access_guard.sh     # 24 checks across all three containers
```

It covers both directions for every role, and the path tricks — climbing out
with `..`, a leading slash, a bare filename, an unknown container.

---

## 5. The verification gate

**Do not let anybody sign in to the Azure instance until this passes.**

Pulse's entire security model rests on PostgREST putting a verified JWT claim
on every connection. If that is misconfigured the application looks completely
normal and the database quietly stops protecting anything.

Run, in order:

```bash
npm test                               # 93 unit tests — pure logic, no backend
python3 QA/scripts/access_matrix.py    # 210 read checks
python3 QA/scripts/write_matrix.py     #  84 write checks
./QA/scripts/profile_guard.sh          #   9 privilege checks
./QA/scripts/preboarding_guard.sh      #  10 document privacy checks
./QA/scripts/agreement_guard.sh        #  14 signing and offer checks
./QA/scripts/file_access_guard.sh      #  24 file access checks
python3 QA/scripts/check_migrations.py #   reads the migrations for replay faults
./QA/scripts/replay_migrations.sh --docker   # builds a database from nothing
```

**All five run against either database.** By default they use the Supabase
CLI. Point them at Azure with one variable:

```bash
export PULSE_DB_URL="postgres://user:pass@<azure-pg>:5432/postgres"
```

Each prints which backend answered — `[supabase]` or `[psql]` — so nobody
mistakes a pass on the old platform for a pass on the new one.

> **One honest caveat.** The psql path was written on a machine with no psql
> and no direct Postgres URL, so it has never run against a live database.
> The part that would actually go wrong — reading psql's output — is covered
> by `QA/scripts/lib/test_dbq.py`, 9 cases against real psql output shapes.
> Run that first (`python3 QA/scripts/lib/test_dbq.py`), then run one real
> check and eyeball it before trusting the rest.

Then check by hand, because these are the things a script cannot see:

- [ ] Sign in as an ordinary employee. Open the browser's network tab. Confirm
      requests carry an `Authorization: Bearer` header and the responses are
      narrowed — an employee must not see other people's compensation.
- [ ] Sign in as HR. Confirm they see the directory and not payroll runs.
- [ ] Download a payslip. The URL must expire.
- [ ] Create a login from Settings. The link must point at
      `pulse.augustinnovate.com`, not localhost.
- [ ] Run one payroll cycle end to end and compare every figure against the
      same cycle on Supabase. They must match to the rupee.

---

## 6. Cutover

Pulse is not live, so this is a move rather than a migration under load. Even
so:

1. Stand Azure up **alongside** Supabase. Do not switch DNS yet.
2. Run the verification gate against Azure.
3. Run the short UAT against Azure. **Test the thing you will ship**, not the
   thing you are leaving.
4. Re-copy the data the morning of cutover, so UAT's test records do not go to
   production. Re-run the gate.
5. Point DNS at the Static Web App.
6. Keep the Supabase project **paused, not deleted**, for one month.

### If it goes wrong

Point DNS back. That is the whole rollback, as long as you have not deleted
Supabase and have not let anybody enter real data on Azure yet. After real
data exists on Azure, rollback means restoring from the Azure backup instead —
which is why point-in-time restore is worth the $6.

---

## 7. Operations — the part that is not code

None of this exists today and none of it is application work.

| | |
|---|---|
| **Backups** | Managed Postgres does it. **Test a restore before go-live.** An untested backup is a belief, not a backup |
| **Monitoring** | Azure Monitor on the VM and the database. Alert on CPU, memory, disk and failed connections |
| **Uptime** | A free external check on `pulse.augustinnovate.com` |
| **Container restarts** | `restart: unless-stopped` in compose, and enable Docker on boot |
| **Secrets** | `JWT_SECRET` and `SERVICE_ROLE_KEY` in Azure Key Vault, not in the compose file |
| **Patching** | Unattended security upgrades on the VM |
| **On call** | Decide who answers when payroll fails at 11pm on the 28th |

---

## 8. Order of work

| | Work | Rough time |
|---|---|---|
| 1 | Postgres, schema, roles | half a day |
| 2 | Containers running, app talking to them | 1–2 days |
| 3 | Data and files across | half a day |
| 4 | ~~Port the verification scripts~~ — **done, they run against either** | — |
| 5 | **Run the gate, fix what it finds** | 1 day, unknown tail |
| 6 | Static Web App, domain, TLS | half a day |
| 7 | Backup and restore tested, monitoring | half a day |
| | | **about four days**, plus whatever step 5 turns up |

Step 5 is the one with an unknown tail, and it is the one not to compress.

---

## 9. After the move, before the next thing

Two items were deliberately left until Azure:

- **Google sign-on** (QA-38). The database model is already in place and the
  button is hidden behind a flag. `QA/11_CONFIGURATION_CHECKLIST.md` has the
  steps.
- **The retention purge** currently runs when HR presses a button, because
  Supabase had no scheduler Pulse could rely on across this move. Azure does.

---

© 2026 | Augustinnovate Pvt. Ltd.

#!/usr/bin/env python3
"""
One person, one account.

August's requirement: email and password sign-in stays on alongside Google,
and signing in either way must land on the SAME account. Somebody who signs
in with Google and finds an empty Pulse, because a second account was created
for the same address, is the worst version of this going wrong — it looks
like data loss and it is hard to undo.

GoTrue links an OAuth sign-in to an existing account when the email matches
AND that account's email is confirmed. The second half is the catch, and it
is precisely what a migration can drop: copy auth.users without
email_confirmed_at and every Google sign-in makes a new account instead.

So this checks three things:

  1. Nobody has two accounts for one address.
  2. Every account has a confirmed email, so linking can happen at all.
  3. Every account matches a profile, and every profile an account.

Run it after the data moves, before anybody signs in with Google, and again
after the first few do.

    python3 QA/scripts/identity_check.py

    export PULSE_DB_URL=postgres://user:pass@host:5432/postgres   # for Azure

Exits non-zero on anything that would split a person in two.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
from dbq import query, backend  # noqa: E402

problems = []
notes = []

print(f"One person, one account   [{backend()}]\n")

# ── 1. Two accounts for one address ──────────────────────────────────────
rows = query("""
  select lower(email) as addr, count(*) as n
  from auth.users
  where email is not null and email <> ''
  group by lower(email)
  having count(*) > 1;
""")
if rows:
    for r in rows:
        problems.append(f"{r['addr']} has {r['n']} accounts — Google sign-in split this person in two")
else:
    print("  ok    no address has more than one account")

# Same question for the identity anchor, which is what the app matches on.
rows = query("""
  select lower(personal_email) as addr, count(*) as n
  from profiles
  where personal_email is not null and personal_email <> ''
  group by lower(personal_email)
  having count(*) > 1;
""")
if rows:
    for r in rows:
        problems.append(f"{r['addr']} is the personal email on {r['n']} profiles — one person, two records")
else:
    print("  ok    no personal email belongs to two profiles")

# ── 2. Unconfirmed emails cannot be linked ───────────────────────────────
rows = query("""
  select count(*) as n from auth.users where email_confirmed_at is null;
""")
unconfirmed = int(rows[0]["n"]) if rows else -1
if unconfirmed > 0:
    problems.append(
        f"{unconfirmed} account(s) have an unconfirmed email. GoTrue will NOT attach a "
        "Google sign-in to them — it will create a second account instead. Confirm them "
        "before anybody signs in with Google."
    )
elif unconfirmed == 0:
    print("  ok    every account has a confirmed email, so linking can happen")
else:
    problems.append("could not read auth.users — is the schema present and readable?")

# ── 3. Accounts and profiles must agree ──────────────────────────────────
rows = query("""
  select count(*) as n from auth.users u
  left join profiles p on p.id = u.id
  where p.id is null;
""")
orphan_users = int(rows[0]["n"]) if rows else 0
if orphan_users:
    problems.append(f"{orphan_users} account(s) have no profile — they can sign in and reach nothing")
else:
    print("  ok    every account has a profile")

rows = query("""
  select count(*) as n from profiles p
  left join auth.users u on u.id = p.id
  where u.id is null;
""")
orphan_profiles = int(rows[0]["n"]) if rows else 0
if orphan_profiles:
    problems.append(f"{orphan_profiles} profile(s) have no account — nobody can sign in as them")
else:
    print("  ok    every profile has an account")

# ── 4. What linking has actually done so far ─────────────────────────────
rows = query("""
  select i.provider, count(*) as n, count(distinct i.user_id) as people
  from auth.identities i
  group by i.provider
  order by i.provider;
""")
print()
for r in rows:
    print(f"  {r['provider']:<10} {r['n']:>4} identities across {r['people']} accounts")

rows = query("""
  select count(*) as n from (
    select user_id from auth.identities group by user_id having count(*) > 1
  ) t;
""")
linked = int(rows[0]["n"]) if rows else 0
print(f"  {linked} account(s) have more than one way to sign in — that is linking working")

if linked == 0:
    notes.append(
        "Nobody has linked a second sign-in method yet. Expected until somebody has "
        "used Google. Re-run this after the first few do — that is the real test."
    )

# ── Verdict ──────────────────────────────────────────────────────────────
print()
for n in notes:
    print(f"  note  {n}")
if notes:
    print()

if problems:
    for p in problems:
        print(f"  PROBLEM  {p}")
    print(f"\n  {len(problems)} problem(s).")
    sys.exit(1)

print("  Nothing would split a person into two accounts.")
sys.exit(0)

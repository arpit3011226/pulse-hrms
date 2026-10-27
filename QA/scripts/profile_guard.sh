#!/usr/bin/env bash
#
# QA-36 regression — can a person change their own role?
#
# profiles carries the role, the organisation and the active flag. Row-level
# security can say which ROWS you may update; it cannot say which COLUMNS. For
# a while it said "your own row", and `role` is on your own row.
#
# Every check runs inside a transaction that is rolled back, so this is safe
# against any environment, including one with real data in it.
#
#   ./QA/scripts/profile_guard.sh
#
# Runs against Supabase by default. For Azure, or any plain Postgres:
#   export PULSE_DB_URL=postgres://user:pass@host:5432/postgres
set -uo pipefail
cd "$(dirname "$0")/../.."
# shellcheck source=QA/scripts/lib/dbq.sh
. "$(dirname "$0")/lib/dbq.sh"

EMP=0639a54b-f2a7-457a-b73c-9edc5857f26f   # demo employee
HR=eb8bb741-08f2-4037-a1d6-0a2b6032872f    # demo HR admin
ORG=328bd5f2-fcd1-43e2-ae0d-11e3076abc7f   # the demo organisation
NEWORG=aaaaaaaa-0000-0000-0000-00000000000a

pass=0; fail=0

jwt() { echo "set local role authenticated; select set_config('request.jwt.claims','{\"sub\":\"$1\",\"role\":\"authenticated\"}',true);"; }

check() {
  local name="$1" want="$2" sql="$3" got out
  # Captured rather than piped: a rejected query makes the CLI exit non-zero,
  # and under `pipefail` that sinks the whole pipeline even when grep matched.
  out=$(db_run "$sql" 2>&1)
  if printf '%s' "$out" | grep -qi "not allowed from this account"; then
    got=BLOCKED
  else
    got=ALLOWED
  fi
  if [ "$got" = "$want" ]; then
    printf '  ok    %-42s %s\n' "$name" "$got"; pass=$((pass+1))
  else
    printf '  FAIL  %-42s got %s, wanted %s\n' "$name" "$got" "$want"; fail=$((fail+1))
  fi
}

echo "Profile privilege guard (QA-36)   [$(db_backend)]"

check "employee makes self super_admin"   BLOCKED "begin; $(jwt $EMP) update profiles set role='super_admin' where id='$EMP'; rollback;"
check "employee edits own name"           ALLOWED "begin; $(jwt $EMP) update profiles set first_name=first_name||'' where id='$EMP'; rollback;"
check "HR changes an employee's role"     ALLOWED "begin; $(jwt $HR) update profiles set role='manager' where id='$EMP'; rollback;"
check "employee deactivates self"         BLOCKED "begin; $(jwt $EMP) update profiles set is_active=false where id='$EMP'; rollback;"
check "employee rewrites anchor email"    BLOCKED "begin; $(jwt $EMP) update profiles set personal_email='x@y.com' where id='$EMP'; rollback;"
check "first user into a brand new org"   ALLOWED "begin; insert into organizations (id,name,slug) values ('$NEWORG','Bootstrap Test','bootstrap-test'); update profiles set organization_id=null where id='$EMP'; $(jwt $EMP) update profiles set organization_id='$NEWORG', role='super_admin' where id='$EMP'; rollback;"
check "walks into the existing org"       BLOCKED "begin; update profiles set organization_id=null where id='$EMP'; $(jwt $EMP) update profiles set organization_id='$ORG', role='super_admin' where id='$EMP'; rollback;"

# 00074 added two more columns that decide how a person gets in. A column is
# invisible to the guard until it is named there, so these two keep it honest.
# Flipped to whatever it is not, so this is always a real change. Setting a
# column to the value it already holds changes nothing and the guard correctly
# lets it by — which looks like a pass and proves nothing.
check "employee changes own sign-in method" BLOCKED "begin; $(jwt $EMP) update profiles set login_method = case when login_method='sso' then 'password' else 'sso' end where id='$EMP'; rollback;"
check "employee claims another work email" BLOCKED "begin; $(jwt $EMP) update profiles set sso_email='ceo@augustinnovate.com' where id='$EMP'; rollback;"

echo
echo "  $pass passed, $fail failed"
[ "$fail" -eq 0 ]

#!/usr/bin/env bash
#
# Pre-boarding documents — can a candidate reach what is not theirs, and can
# they pass their own paperwork?
#
# A candidate must be able to UPDATE their own item rows, because that is how
# an upload is recorded. Row-level security hands them the row; it cannot stop
# them writing "verified" into it. That gap is exactly QA-36, so it is checked
# here rather than discovered later.
#
# Every check runs inside a transaction that is rolled back. Safe anywhere.
#
#   ./QA/scripts/preboarding_guard.sh
#
# Runs against Supabase by default. For Azure, or any plain Postgres:
#   export PULSE_DB_URL=postgres://user:pass@host:5432/postgres
set -uo pipefail
cd "$(dirname "$0")/../.."
# shellcheck source=QA/scripts/lib/subjects.sh
. "$(dirname "$0")/lib/subjects.sh"

# Found by role, every run — see profile_guard.sh for why.
ORG=$(subject_org)
CAND=$(candidate_with_login)
CPROF=$(profile_of_candidate "$CAND")
HR=$(subject_for_role hr_admin)
EMP=$(subject_for_role employee)

require_subjects "an organisation" "$ORG" "a candidate with a login" "$CAND" \
                 "that candidate's profile" "$CPROF" "an HR admin" "$HR" \
                 "an employee" "$EMP"

LIST=bbbbbbbb-0000-0000-0000-00000000000b
ITEM=cccccccc-0000-0000-0000-00000000000c
OTHERCAND=dddddddd-0000-0000-0000-00000000000d
OTHERPROF=eeeeeeee-0000-0000-0000-00000000000e
OTHERLIST=ffffffff-0000-0000-0000-00000000000f
OTHERITEM=99999999-0000-0000-0000-000000000009

pass=0; fail=0

jwt() { echo "set local role authenticated; select set_config('request.jwt.claims','{\"sub\":\"$1\",\"role\":\"authenticated\"}',true);"; }

# One candidate with a list, plus a second candidate who must stay invisible
# to the first.
setup() {
  cat <<SQL
-- Clear anything real for this candidate first. Everything here runs inside a
-- transaction that is rolled back, so nothing is actually lost — but without
-- this the inserts below collide with a genuine checklist the moment somebody
-- uses the feature, and the whole suite fails for the wrong reason.
delete from preboarding_checklists where candidate_id in ('$CAND','$OTHERCAND');
delete from candidates where id = '$OTHERCAND';
insert into preboarding_checklists (id, organization_id, candidate_id, gate, status)
  values ('$LIST','$ORG','$CAND','before_offer','sent');
insert into preboarding_checklist_items (id, organization_id, checklist_id, label, is_mandatory, status)
  values ('$ITEM','$ORG','$LIST','PAN card',true,'pending');
insert into candidates (id, organization_id, first_name, last_name, email, profile_id)
  values ('$OTHERCAND','$ORG','Other','Person','other.person@example.invalid', null);
insert into preboarding_checklists (id, organization_id, candidate_id, gate, status)
  values ('$OTHERLIST','$ORG','$OTHERCAND','before_offer','sent');
insert into preboarding_checklist_items (id, organization_id, checklist_id, label, is_mandatory, status)
  values ('$OTHERITEM','$ORG','$OTHERLIST','Aadhaar',true,'pending');
SQL
}

# want REFUSED / ALLOWED
check() {
  local name="$1" want="$2" sql="$3" got out
  out=$(db_run "$sql" 2>&1)
  if printf '%s' "$out" | grep -qiE "Only HR can|42501"; then got=REFUSED; else got=ALLOWED; fi
  if [ "$got" = "$want" ]; then
    printf '  ok    %-46s %s\n' "$name" "$got"; pass=$((pass+1))
  else
    printf '  FAIL  %-46s got %s, wanted %s\n' "$name" "$got" "$want"; fail=$((fail+1))
  fi
}

# want a specific visible row count
count_check() {
  local name="$1" want="$2" sql="$3" got out
  out=$(db_run "$sql" 2>&1)
  got=$(printf '%s' "$out" | grep -o '"n": [0-9]*' | head -1 | grep -o '[0-9]*')
  got=${got:-ERR}
  if [ "$got" = "$want" ]; then
    printf '  ok    %-46s sees %s\n' "$name" "$got"; pass=$((pass+1))
  else
    printf '  FAIL  %-46s sees %s, wanted %s\n' "$name" "$got" "$want"; fail=$((fail+1))
  fi
}

echo "Pre-boarding documents   [$(db_backend)]"

check "candidate marks own document verified"  REFUSED "begin; $(setup) $(jwt $CPROF) update preboarding_checklist_items set status='verified' where id='$ITEM'; rollback;"
check "candidate records an upload"            ALLOWED "begin; $(setup) $(jwt $CPROF) update preboarding_checklist_items set status='uploaded', storage_path='$CAND/x.pdf' where id='$ITEM'; rollback;"
check "candidate writes a rejection reason"    REFUSED "begin; $(setup) $(jwt $CPROF) update preboarding_checklist_items set rejection_reason='nope' where id='$ITEM'; rollback;"
check "candidate renames what was asked for"   REFUSED "begin; $(setup) $(jwt $CPROF) update preboarding_checklist_items set label='Something easier' where id='$ITEM'; rollback;"
check "HR verifies it"                         ALLOWED "begin; $(setup) $(jwt $HR) update preboarding_checklist_items set status='verified', reviewed_by='$HR' where id='$ITEM'; rollback;"

# The one that matters for privacy: somebody else's documents.
count_check "candidate sees only their own items"  1 "begin; $(setup) $(jwt $CPROF) select count(*) as n from preboarding_checklist_items; rollback;"
count_check "candidate sees only their own list"   1 "begin; $(setup) $(jwt $CPROF) select count(*) as n from preboarding_checklists; rollback;"
count_check "an ordinary employee sees no lists"   0 "begin; $(setup) $(jwt $EMP) select count(*) as n from preboarding_checklists; rollback;"
count_check "an ordinary employee sees no items"   0 "begin; $(setup) $(jwt $EMP) select count(*) as n from preboarding_checklist_items; rollback;"
count_check "HR sees both candidates' lists"       2 "begin; $(setup) $(jwt $HR) select count(*) as n from preboarding_checklists; rollback;"

echo
echo "  $pass passed, $fail failed"
[ "$fail" -eq 0 ]

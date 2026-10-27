#!/usr/bin/env bash
#
# Digital agreements — is a signature worth anything?
#
# An employee needs UPDATE on their own agreement row, because that is how
# signing works. Row-level security hands them the row and then has nothing
# to say about which columns they write. Same shape as QA-36.
#
# The one that matters most: the frozen text and its hash must not be
# editable by ANYONE, HR included. If the wording can be changed after the
# fact, the signature proves nothing.
#
# Every check runs inside a rolled-back transaction. Safe anywhere.
#
set -uo pipefail
cd "$(dirname "$0")/../.."

ORG=328bd5f2-fcd1-43e2-ae0d-11e3076abc7f
EMP_P=0639a54b-f2a7-457a-b73c-9edc5857f26f       # employee's profile
EMP_E=41ce5a21-2986-4a33-9969-e67c710f205a       # that employee's record
OTHER_E=cfe53950-ee98-45d4-891f-a57450f226ef     # somebody else
HR=eb8bb741-08f2-4037-a1d6-0a2b6032872f

A1=11111111-0000-0000-0000-000000000001
A2=22222222-0000-0000-0000-000000000002

pass=0; fail=0
jwt() { echo "set local role authenticated; select set_config('request.jwt.claims','{\"sub\":\"$1\",\"role\":\"authenticated\"}',true);"; }

setup() {
  cat <<SQL
insert into employee_agreements (id, organization_id, employee_id, title, rendered_html, rendered_sha256, status, consent_statement)
  values ('$A1','$ORG','$EMP_E','NDA','<p>The agreed words.</p>','abc123','pending','I agree.');
insert into employee_agreements (id, organization_id, employee_id, title, rendered_html, rendered_sha256, status, consent_statement)
  values ('$A2','$ORG','$OTHER_E','NDA','<p>Someone else.</p>','def456','pending','I agree.');
SQL
}

check() {
  local name="$1" want="$2" sql="$3" got out
  out=$(npx --yes supabase db query --linked "$sql" 2>&1)
  if printf '%s' "$out" | grep -qiE "cannot be changed|only sign your own|already been signed|Only HR can|not something you can set|42501"; then
    got=REFUSED
  else
    got=ALLOWED
  fi
  if [ "$got" = "$want" ]; then
    printf '  ok    %-48s %s\n' "$name" "$got"; pass=$((pass+1))
  else
    printf '  FAIL  %-48s got %s, wanted %s\n' "$name" "$got" "$want"; fail=$((fail+1))
  fi
}

state_check() {
  local name="$1" want="$2" sql="$3" got out
  out=$(npx --yes supabase db query --linked "$sql" 2>&1)
  got=$(printf '%s' "$out" | grep -o '"v": "[^"]*"' | head -1 | cut -d'"' -f4)
  got=${got:-ERR}
  if [ "$got" = "$want" ]; then
    printf '  ok    %-48s still %s\n' "$name" "$got"; pass=$((pass+1))
  else
    printf '  FAIL  %-48s is %s, wanted %s\n' "$name" "$got" "$want"; fail=$((fail+1))
  fi
}

echo "Digital agreements"

check "employee signs their own"                 ALLOWED "begin; $(setup) $(jwt $EMP_P) update employee_agreements set status='signed', signed_name='Test', signed_at=now() where id='$A1'; rollback;"
# Asserted on the row, not on the absence of an error.
#
# An UPDATE that row-level security filters out affects zero rows and returns
# success. Checking only for an exception would have called that a pass — the
# same "it said it worked" trap that produced most of last week's defects.
state_check "employee signs somebody else's" pending "begin; $(setup) $(jwt $EMP_P) update employee_agreements set status='signed', signed_name='Test' where id='$A2'; reset role; select status as v from employee_agreements where id='$A2'; rollback;"
check "employee rewrites what they agreed to"    REFUSED "begin; $(setup) $(jwt $EMP_P) update employee_agreements set rendered_html='<p>Something nicer.</p>' where id='$A1'; rollback;"
check "employee fakes the fingerprint"           REFUSED "begin; $(setup) $(jwt $EMP_P) update employee_agreements set rendered_sha256='forged' where id='$A1'; rollback;"
check "employee makes it non-mandatory"          REFUSED "begin; $(setup) $(jwt $EMP_P) update employee_agreements set is_mandatory=false where id='$A1'; rollback;"
check "employee un-signs a signed agreement"     REFUSED "begin; $(setup) update employee_agreements set status='signed' where id='$A1'; $(jwt $EMP_P) update employee_agreements set status='viewed' where id='$A1'; rollback;"

# The important one. HR has every other power here and must not have this.
check "HR rewrites text after it was signed"     REFUSED "begin; $(setup) $(jwt $HR) update employee_agreements set rendered_html='<p>Rewritten later.</p>' where id='$A1'; rollback;"
check "HR changes the title (allowed)"           ALLOWED "begin; $(setup) $(jwt $HR) update employee_agreements set title='NDA v2' where id='$A1'; rollback;"

echo
echo "  $pass passed, $fail failed"
[ "$fail" -eq 0 ]

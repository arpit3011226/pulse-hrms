#!/usr/bin/env bash
#
# can_access_file() must agree with the policies it replaces.
#
# Storage moves to Azure Blob, which has no row-level security, so the twelve
# policies on storage.objects become one Postgres function. If that function
# is more generous than the policies were, somebody reads a document they
# should not — and nothing else in the system would notice.
#
# Reads only, inside rolled-back transactions. Safe anywhere.
#
# Runs against Supabase by default. For Azure, or any plain Postgres:
#   export PULSE_DB_URL=postgres://user:pass@host:5432/postgres
#
set -uo pipefail
cd "$(dirname "$0")/../.."
# shellcheck source=QA/scripts/lib/subjects.sh
. "$(dirname "$0")/lib/subjects.sh"

# Found by role, every run — see profile_guard.sh for why.
EMP_P=$(subject_for_role employee)
EMP_E=$(employee_for_profile "$EMP_P")
OTHER_E=$(other_employee_than "$EMP_P")
HR=$(subject_for_role hr_admin)
PAY=$(subject_for_role payroll_admin)
LEAD=$(subject_for_role leadership)
CAND_C=$(candidate_with_login)
CAND_P=$(profile_of_candidate "$CAND_C")
ORG=$(subject_org)

require_subjects "an employee" "$EMP_P" "that employee's record" "$EMP_E" \
                 "a second employee" "$OTHER_E" "an HR admin" "$HR" \
                 "a payroll admin" "$PAY" "a leadership account" "$LEAD" \
                 "a candidate with a login" "$CAND_C" "an organisation" "$ORG"

pass=0; fail=0
jwt() { echo "set local role authenticated; select set_config('request.jwt.claims','{\"sub\":\"$1\",\"role\":\"authenticated\"}',true);"; }

# who, bucket, path, intent, expected
check() {
  local name="$1" who="$2" bucket="$3" path="$4" intent="$5" want="$6" got
  got=$(db_scalar "begin; $(jwt "$who") select can_access_file('$bucket','$path','$intent'); rollback;")
  # The two backends spell a boolean differently — psql says t/f, the
  # Supabase path comes back as True/False. Normalise both, and treat
  # anything else as an error rather than silently as a "no", because a
  # check that reads a failure as "access denied" would pass while telling
  # you nothing.
  got=$(printf '%s' "$got" | tr -d ' []' | tr '[:upper:]' '[:lower:]')
  case "$got" in
    t|true)  got=yes ;;
    f|false) got=no ;;
    *)       got="error($got)" ;;
  esac
  if [ "$got" = "$want" ]; then
    printf '  ok    %-52s %s\n' "$name" "$got"; pass=$((pass+1))
  else
    printf '  FAIL  %-52s got %s, wanted %s\n' "$name" "$got" "$want"; fail=$((fail+1))
  fi
}

echo "File access rules   [$(db_backend)]"
echo
echo "  employee-documents"
check "owner reads their own"            "$EMP_P" employee-documents "$EMP_E/identity/pan.pdf"   read   yes
check "employee reads somebody else's"   "$EMP_P" employee-documents "$OTHER_E/identity/pan.pdf" read   no
check "owner writes their own"           "$EMP_P" employee-documents "$EMP_E/identity/pan.pdf"   write  yes
check "owner cannot delete their own"    "$EMP_P" employee-documents "$EMP_E/identity/pan.pdf"   delete no
check "HR reads anybody's"               "$HR"    employee-documents "$OTHER_E/identity/pan.pdf" read   yes
check "HR deletes"                       "$HR"    employee-documents "$OTHER_E/identity/pan.pdf" delete yes
check "leadership reads"                 "$LEAD"  employee-documents "$OTHER_E/identity/pan.pdf" read   yes
check "leadership cannot delete"         "$LEAD"  employee-documents "$OTHER_E/identity/pan.pdf" delete no
check "payroll admin cannot read"        "$PAY"   employee-documents "$OTHER_E/identity/pan.pdf" read   no

echo
echo "  candidate-documents"
check "candidate reads their own"        "$CAND_P" candidate-documents "$CAND_C/pan.pdf" read   yes
check "candidate writes their own"       "$CAND_P" candidate-documents "$CAND_C/pan.pdf" write  yes
check "candidate cannot delete"          "$CAND_P" candidate-documents "$CAND_C/pan.pdf" delete no
check "candidate reads another's"        "$CAND_P" candidate-documents "11111111-1111-1111-1111-111111111111/x.pdf" read no
check "HR reads a candidate's"           "$HR"     candidate-documents "$CAND_C/pan.pdf" read   yes
check "an employee cannot read one"      "$EMP_P"  candidate-documents "$CAND_C/pan.pdf" read   no

echo
echo "  reimbursement-receipts   (owner is the SECOND folder)"
check "owner reads their own"            "$EMP_P" reimbursement-receipts "$ORG/$EMP_E/r.pdf"   read  yes
check "employee reads another's"         "$EMP_P" reimbursement-receipts "$ORG/$OTHER_E/r.pdf" read  no
check "payroll admin reads any"          "$PAY"   reimbursement-receipts "$ORG/$OTHER_E/r.pdf" read  yes
check "owner deletes their own"          "$EMP_P" reimbursement-receipts "$ORG/$EMP_E/r.pdf"   delete yes

echo
echo "  paths that must never be accepted"
check "climbing out with .."             "$EMP_P" employee-documents "$EMP_E/../$OTHER_E/pan.pdf" read no
check "leading slash"                    "$EMP_P" employee-documents "/$EMP_E/pan.pdf"            read no
check "bare filename, no folder"         "$EMP_P" employee-documents "pan.pdf"                    read no
check "an unknown bucket"                "$HR"    secret-bucket       "$EMP_E/x.pdf"              read no
check "a made-up intent"                 "$HR"    employee-documents  "$EMP_E/x.pdf"              peek no

echo
echo "  $pass passed, $fail failed"
[ "$fail" -eq 0 ]

# Find the people these checks need, in whatever database we are pointed at.
#
# Every guard suite used to hard-code UUIDs from the Supabase demo data. The
# moment they ran against Azure, every row was missing — so an UPDATE matched
# nothing, which the scripts read as "allowed", and the inserts errored. Six
# "failures" that were nothing of the kind, and worse, they could equally
# have been six false passes.
#
# Nobody could have run these anywhere but the one database they were written
# against. They are the safety net for a migration; a safety net that only
# works on the platform you are leaving is not one.
#
# So: look the subjects up by ROLE, every run, wherever we are.
#
# And if a role is missing, say so and stop. A check with nobody to test is
# not a pass.

# shellcheck source=QA/scripts/lib/dbq.sh
. "$(dirname "${BASH_SOURCE[0]}")/dbq.sh"

# One profile id for a role, or empty.
subject_for_role() {
  db_scalar "select id from profiles where role = '$1' and coalesce(is_active,true) order by created_at limit 1;" \
    | tr -d ' \r'
}

# The employee row behind a profile, or empty.
employee_for_profile() {
  db_scalar "select id from employees where profile_id = '$1' limit 1;" | tr -d ' \r'
}

# An employee who is NOT this person — the one whose records must stay shut.
other_employee_than() {
  db_scalar "select id from employees where profile_id is distinct from '$1' order by created_at limit 1;" \
    | tr -d ' \r'
}

subject_org() {
  db_scalar "select id from organizations order by created_at limit 1;" | tr -d ' \r'
}

candidate_with_login() {
  db_scalar "select id from candidates where profile_id is not null limit 1;" | tr -d ' \r'
}

profile_of_candidate() {
  db_scalar "select profile_id from candidates where id = '$1';" | tr -d ' \r'
}

# Stop, loudly, when there is nobody to test.
#
# This exists because the gate reported PASS against an empty database. Rows
# of zeros and "no data" were counted as nobody having access they should not
# — which is true, and worthless. A check that cannot run must not look like
# a check that ran.
require_subjects() {
  local missing=()
  local name value
  while [ "$#" -gt 0 ]; do
    name="$1"; value="$2"; shift 2
    [ -z "$value" ] && missing+=("$name")
  done
  if [ "${#missing[@]}" -gt 0 ]; then
    echo
    echo "  INCONCLUSIVE — this database has no: ${missing[*]}"
    echo
    echo "  These checks need somebody of each role to test against. Nothing"
    echo "  was verified. That is not the same as nothing being wrong."
    echo
    echo "  Either load representative data, or run this against a database"
    echo "  that has some. An empty database cannot answer the question."
    exit 3
  fi
}

# An application belonging to a candidate who has a login.
application_for_candidate() {
  db_scalar "select id from candidate_applications where candidate_id = '$1' limit 1;" | tr -d ' \r'
}

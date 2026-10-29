#!/usr/bin/env bash
#
# The gate. Run this before anybody signs in to the Azure instance.
#
# Everything Pulse's security rests on was verified against Supabase. This is
# the same set of questions asked of the new database. Nothing here writes:
# the matrices read, and the guard suites run inside transactions that are
# rolled back.
#
#   export PULSE_DB_URL="postgres://user:pass@<azure-pg>:5432/postgres"
#   ./QA/scripts/azure_gate.sh 2>&1 | tee gate.txt
#
# Then send gate.txt back. Exits non-zero if anything failed.

set -uo pipefail
cd "$(dirname "$0")/../.."

: "${PULSE_DB_URL:?Set PULSE_DB_URL to the Azure Postgres connection string first}"

command -v psql >/dev/null || { echo "psql not found — install the postgres client"; exit 2; }

line() { printf '\n%s\n%s\n' "$1" "$(printf '%.0s─' $(seq 1 ${#1}))"; }

failed=0
run() {
  local label="$1"; shift
  line "$label"
  if "$@"; then
    echo "  → PASS"
  else
    echo "  → FAIL"
    failed=$((failed + 1))
  fi
}

echo "Pulse — Azure verification gate"
echo "Database: $(printf '%s' "$PULSE_DB_URL" | sed 's#://[^@]*@#://…@#')"
echo "Date:     $(date -u '+%Y-%m-%d %H:%M UTC')"

# The first one matters most. If email_confirmed_at was dropped in the data
# copy, everything looks perfect today and the first Google sign-in months
# from now silently creates a second account for somebody.
run "1. One person, one account"       python3 QA/scripts/identity_check.py
run "2. Who can READ what"             python3 QA/scripts/access_matrix.py
run "3. Who can CHANGE what"           python3 QA/scripts/write_matrix.py

# Cheap, and they cover the features built in the last week.
run "4. Profile privileges"            ./QA/scripts/profile_guard.sh
run "5. Pre-boarding documents"        ./QA/scripts/preboarding_guard.sh
run "6. Agreements and offers"         ./QA/scripts/agreement_guard.sh
run "7. File access rules"             ./QA/scripts/file_access_guard.sh

line "8. Migrations would replay"
if python3 QA/scripts/check_migrations.py; then echo "  → PASS"; else echo "  → FAIL"; failed=$((failed+1)); fi

line "Result"
if [ "$failed" -eq 0 ]; then
  echo "  Everything passed. The security model survived the move."
else
  echo "  $failed check(s) failed. Do not let anybody sign in until they are understood."
fi
exit "$failed"

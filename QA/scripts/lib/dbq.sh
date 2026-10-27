# Ask the database something, whichever database it is.
#
# These checks have to survive the move to Azure. They were the only thing
# that proved row-level security actually holds, and a safety net that stays
# behind on the old platform is no safety net at all.
#
#   On Supabase   nothing to do; the Supabase CLI is used.
#   On Azure      export PULSE_DB_URL=postgres://user:pass@host:5432/postgres
#                 and psql is used instead.
#
# Everything the callers do is phrased the same way either side.

db_backend() {
  if [ -n "${PULSE_DB_URL:-}" ]; then echo "psql"; else echo "supabase"; fi
}

# Run some SQL and print whatever came back, errors included.
#
# Used where the question is "was this refused?", so the caller greps the
# output for the message. Both backends print the message the database
# raised, so the same grep works for both.
db_run() {
  if [ -n "${PULSE_DB_URL:-}" ]; then
    psql "$PULSE_DB_URL" --no-psqlrc --quiet --command "$1" 2>&1
  else
    npx --yes supabase db query --linked "$1" 2>&1
  fi
}

# Run some SQL and print one value: the first column of the last row.
#
# The two backends disagree about shape — the Supabase CLI returns JSON,
# psql returns text — so this is where that difference stops. Callers get a
# bare value and never need to know which one answered.
db_scalar() {
  local out
  if [ -n "${PULSE_DB_URL:-}" ]; then
    # --tuples-only drops headers, --no-align drops padding, so each result
    # row is one bare line. Multi-statement SQL prints each statement's rows
    # in turn, and the one we want is the last.
    out=$(psql "$PULSE_DB_URL" --no-psqlrc --quiet --tuples-only --no-align \
                --command "$1" 2>&1) || { printf '%s' "$out"; return 1; }
    printf '%s' "$out" | grep -v '^$' | tail -1
  else
    out=$(npx --yes supabase db query --linked "$1" 2>&1)
    # The CLI prints a JSON object whose "rows" array holds the last
    # statement's result. One value per check, so the first is the one.
    printf '%s' "$out" | python3 -c '
import sys, json, re
raw = sys.stdin.read()
m = re.search(r"\{.*\}", raw, re.S)
if not m:
    sys.exit(0)
try:
    rows = json.loads(m.group()).get("rows") or []
except json.JSONDecodeError:
    sys.exit(0)
if rows:
    print(list(rows[0].values())[0])
'
  fi
}

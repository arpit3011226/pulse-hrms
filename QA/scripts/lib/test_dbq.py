#!/usr/bin/env python3
"""
The psql parser, checked against real psql output shapes.

psql is not installed on the machine these scripts were written on and the
Supabase project exposes no direct Postgres URL, so the psql path could not
be tried against a live database. What CAN be checked is the part that would
actually go wrong — reading psql's output — and that is what this does,
using output captured in the shape psql produces with
--no-align --field-separator=<tab>.

    python3 QA/scripts/lib/test_dbq.py

This is not a substitute for running the suites once against Azure. It means
a mistake in the parsing is caught here rather than mid-migration.
"""
import sys
from dbq import _parse_psql, _parse_supabase

TAB = "\t"
cases = []


def case(name, got, want):
    cases.append((name, got, want))


# A single count, the commonest shape in these scripts.
case(
    "one row, one column",
    _parse_psql("n\n5\n(1 row)\n"),
    [{"n": "5"}],
)

# Multi-statement: begin, set role, set_config, the real query, rollback.
# Only the last result set matters.
case(
    "takes the LAST result set, not the first",
    _parse_psql(
        "BEGIN\nSET\n"
        "set_config\n\n"
        "\n"
        "n\n0\n(1 row)\n"
        "ROLLBACK\n"
    ),
    [{"n": "0"}],
)

# Several columns, as the purge and audit queries return.
case(
    "several columns",
    _parse_psql(f"role{TAB}login_method\nemployee{TAB}password\n(1 row)\n"),
    [{"role": "employee", "login_method": "password"}],
)

# Several rows.
case(
    "several rows",
    _parse_psql(f"id{TAB}n\na{TAB}1\nb{TAB}2\n(2 rows)\n"),
    [{"id": "a", "n": "1"}, {"id": "b", "n": "2"}],
)

# A query that matched nothing must give [], not a crash.
case("no rows", _parse_psql("n\n(0 rows)\n"), [])

# An error must give [] rather than something that reads as a result —
# a check that cannot tell "refused" from "fell over" reports the wrong
# thing with complete confidence, which is the failure this suite exists
# to catch.
case(
    "an error is not a result",
    _parse_psql("ERROR:  permission denied for table profiles\n"),
    [],
)

# The Supabase path must keep working unchanged.
case(
    "supabase JSON still parses",
    _parse_supabase('{"rows":[{"n":7}],"warning":"…"}'),
    [{"n": 7}],
)
case("supabase, no rows", _parse_supabase('{"rows":[]}'), [])
case("supabase, not JSON at all", _parse_supabase("command not found"), [])

failed = 0
for name, got, want in cases:
    ok = got == want
    print(f"  {'ok  ' if ok else 'FAIL'}  {name}")
    if not ok:
        print(f"         got  {got}\n         want {want}")
        failed += 1

print()
print(f"  {len(cases) - failed} passed, {failed} failed")
sys.exit(1 if failed else 0)

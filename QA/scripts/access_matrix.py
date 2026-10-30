#!/usr/bin/env python3
"""
Who can read what.

Asks the live database, as each role in turn, how many rows of each sensitive
table it can see. Row-level security is the only thing between an ordinary
employee and everybody's salary, so it is worth checking by asking rather than
by reading the policies and hoping.

This impersonates a role the way PostgREST does: switch to the `authenticated`
role and set the JWT claims the policies read, so a policy that looks right but
behaves wrongly still shows up.

    python3 QA/scripts/access_matrix.py                # the sensitive set
    python3 QA/scripts/access_matrix.py employees      # named tables

Runs against Supabase by default. For Azure, or any plain Postgres:

    export PULSE_DB_URL=postgres://user:pass@host:5432/postgres

Reads only. Safe against any environment.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
from dbq import query, backend  # noqa: E402
from subjects import roles_present, stop_if_meaningless  # noqa: E402

# Discovered at run time by subjects.roles_present(), never hard-coded.
ROLES: list[tuple[str, str]] = []

DEFAULT_TABLES = [
    "employees", "employee_statutory", "employee_personal", "employee_compensation",
    "payslips", "payroll_runs", "leave_requests", "leave_balances",
    "attendance_records", "candidates", "interview_feedback", "job_requisition_budget",
    "offer_letters", "mentorship_checkins", "mentorships", "helpdesk_tickets",
    "employee_exit_records", "final_settlements", "exit_interview_responses",
    "activity_log", "workflow_runs", "recognitions",
]

# What a role has no business seeing AT ALL. A count above zero here is a
# finding. Tables where a role legitimately sees only its own or its team's
# rows are deliberately absent: a count cannot tell "my salary" from
# "everybody's salary", so those are checked by OWNERSHIP below instead.
FORBIDDEN = {
    "employee_statutory":       ["employee", "contractor", "manager"],
    "employee_personal":        ["employee", "contractor", "manager"],
    "payslips":                 ["employee", "contractor", "manager"],
    "payroll_runs":             ["employee", "contractor", "manager"],
    "payroll_cycles":           ["employee", "contractor", "manager"],
    "payroll_run_employees":    ["employee", "contractor", "manager"],
    "payroll_earnings":         ["employee", "contractor", "manager"],
    "job_requisition_budget":   ["employee", "contractor"],
    "interview_feedback":       ["employee", "contractor"],
    "mentorship_checkins":      ["payroll_admin", "hr_admin", "super_admin", "leadership"],
    "final_settlements":        ["employee", "contractor"],
    "exit_interview_responses": ["employee", "contractor", "manager"],
    "workflow_runs":            ["employee", "contractor", "manager"],
}

# Tables where a role may see its OWN rows and nothing else. Checked by asking
# which employee each visible row belongs to, not by counting — an employee
# seeing one compensation row is correct when it is theirs and a defect when it
# is somebody else's, and the count is 1 either way.
OWN_ROWS_ONLY = {
    "employee_compensation": ("employee_id", ["employee", "contractor"]),
    "leave_balances":        ("employee_id", ["employee", "contractor"]),
    "leave_requests":        ("employee_id", ["employee", "contractor"]),
}


def own_rows_check(profile_id, table, column):
    """Rows visible to this person that belong to somebody else."""
    sql = (
        "set local role authenticated; "
        f"select set_config('request.jwt.claims','{{\"sub\":\"{profile_id}\",\"role\":\"authenticated\"}}',true); "
        f"select count(*) as leaked from {table} t "
        f"where t.{column} not in (select id from employees where profile_id = auth.uid());"
    )
    rows = query(sql)
    if not rows or "leaked" not in rows[0]:
        return None
    try:
        return int(rows[0]["leaked"])
    except (TypeError, ValueError):
        return None


def count_for(profile_id, tables):
    """Row counts for one role, in a single round trip."""
    selects = ", ".join(f'(select count(*) from {t}) as "{t}"' for t in tables)
    sql = (
        "set local role authenticated; "
        f"select set_config('request.jwt.claims','{{\"sub\":\"{profile_id}\",\"role\":\"authenticated\"}}',true); "
        f"select {selects};"
    )
    rows = query(sql)
    if not rows:
        return {t: "err" for t in tables}
    return rows[0]


def main():
    # Look the subjects up here rather than carrying a list of UUIDs.
    #
    # The hard-coded list was from the Supabase demo data. Run against Azure
    # it matched nobody, every count came back zero, and this printed PASS —
    # a security check that tested nothing and said it was fine.
    global ROLES
    stop_if_meaningless()
    ROLES = roles_present()
    if len(ROLES) < 3:
        print("  INCONCLUSIVE — fewer than three roles have anybody in them.")
        return 3

    tables = sys.argv[1:] or DEFAULT_TABLES
    results = {}
    for role, pid in ROLES:
        print(f"  reading as {role}…", file=sys.stderr)
        results[role] = count_for(pid, tables)

    width = max(len(t) for t in tables) + 2
    header = "table".ljust(width) + "".join(r.ljust(15) for r, _ in ROLES)
    print(header)
    print("-" * len(header))
    for t in tables:
        row = t.ljust(width)
        for role, _ in ROLES:
            row += str(results[role].get(t, "?")).ljust(15)
        print(row)

    print()
    failures = []
    for table, roles in FORBIDDEN.items():
        if table not in tables:
            continue
        for role in roles:
            value = results.get(role, {}).get(table)
            if isinstance(value, int) and value > 0:
                failures.append(f"{role} can read {value} row(s) of {table}")

    # Rows belonging to other people, where a role should see only its own.
    for table, (column, roles) in OWN_ROWS_ONLY.items():
        if tables is not DEFAULT_TABLES and table not in tables:
            continue
        for role in roles:
            pid = dict(ROLES)[role]
            leaked = own_rows_check(pid, table, column)
            if leaked:
                failures.append(
                    f"{role} can read {leaked} row(s) of {table} belonging to someone else"
                )

    if failures:
        print(f"FAIL — {len(failures)} finding(s):")
        for f in failures:
            print("  ✗", f)
        return 1
    print("PASS — no role read a table it is forbidden, and no cross-employee rows leaked.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

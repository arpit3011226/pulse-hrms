#!/usr/bin/env python3
"""
Who can CHANGE what.

The companion to access_matrix.py, which asks what each role can READ. That
script has run since the first week and never found QA-36 — an ordinary
employee being able to make themselves a super admin — because the hole was
in what a role could WRITE, and nothing asked that question.

It asks it by trying. For each role and table it picks a row belonging to
somebody else, switches to that role, and attempts an UPDATE on it.

THE IMPORTANT PART: it counts rows affected, not whether an error came back.
Row-level security does not refuse an UPDATE it disallows — it silently
narrows it to nothing and reports success. Twice today a check that looked
only for an error reported "allowed" when the row had not been touched, and
once reported "blocked" when a fixture had failed. A test that cannot tell
"permitted" from "filtered to nothing" from "fell over" will state the wrong
answer with complete confidence.

Everything runs inside a transaction that is rolled back, and the UPDATE sets
a column to its own value, so nothing changes even before the rollback. Safe
against any environment, including one holding real data.

    python3 QA/scripts/write_matrix.py

Exits non-zero if any role can reach a row it has no business changing.
"""
import json
import re
import subprocess
import sys

# One demo account per role. Same set as access_matrix.py.
ROLES = [
    ("employee",      "0639a54b-f2a7-457a-b73c-9edc5857f26f"),
    ("contractor",    "82df94c4-5f35-4926-af28-337d2faaf792"),
    ("manager",       "d622e365-0e50-4ff6-bc0c-216c3346ee5e"),
    ("payroll_admin", "b56ed460-8bb9-4641-a5f0-1c33349808bf"),
    ("leadership",    "a8dbc6e7-7dcf-4f38-bff6-54c2f7ce3524"),
    ("hr_admin",      "eb8bb741-08f2-4037-a1d6-0a2b6032872f"),
]

# table -> (key column, column we touch).
#
# The key is not always "id": employee_statutory and employee_personal are
# keyed on employee_id. The first version of this script assumed "id"
# everywhere, so those two silently reported "no data" — a blind spot that
# looked exactly like a table with nothing in it. They had eleven rows each.
#
# The touched column is set to its own value: a real UPDATE as far as
# row-level security is concerned, and no change to the data.
TABLES = {
    "employee_compensation":  ("id",          "employee_id"),
    "employee_statutory":     ("employee_id", "employee_id"),
    "employee_personal":      ("employee_id", "employee_id"),
    "employee_bank_accounts": ("id",          "employee_id"),
    "employee_documents":     ("id",          "employee_id"),
    "payslips":               ("id",          "employee_id"),
    "leave_balances":         ("id",          "employee_id"),
    "leave_requests":         ("id",          "employee_id"),
    "attendance_records":     ("id",          "employee_id"),
    "performance_reviews":    ("id",          "employee_id"),
    "employee_exit_records":  ("id",          "employee_id"),
    "final_settlements":      ("id",          "employee_id"),
    "employees":              ("id",          "organization_id"),
    "payroll_runs":           ("id",          "organization_id"),
}

# Which roles must NOT be able to change somebody else's row in each table.
# Absent from a list means the role legitimately may, and is reported for
# information rather than scored.
FORBIDDEN = {
    "employee_compensation":  ["employee", "contractor", "manager", "leadership"],
    "employee_statutory":     ["employee", "contractor", "manager"],
    "employee_personal":      ["employee", "contractor", "manager"],
    "employee_bank_accounts": ["employee", "contractor", "manager"],
    "employee_documents":     ["employee", "contractor"],
    "payslips":               ["employee", "contractor", "manager", "hr_admin"],
    "leave_balances":         ["employee", "contractor", "manager"],
    "leave_requests":         ["employee", "contractor"],
    "attendance_records":     ["employee", "contractor"],
    "performance_reviews":    ["employee", "contractor", "payroll_admin"],
    "employee_exit_records":  ["employee", "contractor"],
    "final_settlements":      ["employee", "contractor", "manager"],
    "employees":              ["employee", "contractor", "manager", "payroll_admin"],
    "payroll_runs":           ["employee", "contractor", "manager", "hr_admin"],
}


def run(sql):
    out = subprocess.run(
        ["npx", "--yes", "supabase", "db", "query", "--linked", sql],
        capture_output=True, text=True,
    ).stdout
    m = re.search(r"\{.*\}", out, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group())
    except json.JSONDecodeError:
        return None


def victim_row(table, key, profile_id):
    """A row belonging to somebody other than this person, chosen as postgres."""
    if table == "payroll_runs":
        where = "true"
    elif table == "employees":
        where = f"id not in (select id from employees where profile_id = '{profile_id}')"
    else:
        where = f"employee_id not in (select id from employees where profile_id = '{profile_id}')"
    res = run(f"select {key} as k from {table} where {where} limit 1;")
    rows = (res or {}).get("rows") or []
    return rows[0]["k"] if rows else None


def can_write(table, key, column, row_id, profile_id):
    """
    'yes', 'no', or 'error'.

    Reported from rows affected, because RLS narrows a disallowed UPDATE to
    nothing and returns success rather than refusing it.
    """
    sql = (
        "begin; set local role authenticated; "
        f"select set_config('request.jwt.claims','{{\"sub\":\"{profile_id}\",\"role\":\"authenticated\"}}',true); "
        f"with touched as (update {table} set {column} = {column} where {key} = '{row_id}' returning 1) "
        "select count(*) as n from touched; rollback;"
    )
    res = run(sql)
    if res is None:
        return "error"
    rows = res.get("rows") or []
    if not rows or "n" not in rows[0]:
        return "error"
    return "yes" if int(rows[0]["n"]) > 0 else "no"


def main():
    only = sys.argv[1:]
    tables = {t: kc for t, kc in TABLES.items() if not only or t in only}

    print("Who can change somebody else's row\n", flush=True)
    print(f"  {'table':<24} " + " ".join(f"{r:<14}" for r, _ in ROLES))
    print("  " + "-" * (24 + 15 * len(ROLES)))

    findings = []
    errors = []

    for table, (key, column) in tables.items():
        cells = []
        for role, pid in ROLES:
            row_id = victim_row(table, key, pid)
            if row_id is None:
                cells.append("no data")
                continue
            verdict = can_write(table, key, column, row_id, pid)
            if verdict == "error":
                cells.append("ERROR")
                errors.append((table, role))
            elif verdict == "yes":
                if role in FORBIDDEN.get(table, []):
                    cells.append("CAN WRITE !")
                    findings.append((table, role))
                else:
                    cells.append("can write")
            else:
                cells.append("blocked")
        print(f"  {table:<24} " + " ".join(f"{c:<14}" for c in cells), flush=True)

    print()
    if errors:
        print(f"  {len(errors)} check(s) could not run:")
        for t, r in errors:
            print(f"    {t} as {r}")
    if findings:
        print(f"  {len(findings)} FINDING(S) — a role can change a row it should not:")
        for t, r in findings:
            print(f"    {r} can write somebody else's {t}")
        return 1
    print("  No role can change a row it should not.")
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())

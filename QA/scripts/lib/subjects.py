"""
Find the people these checks need, in whatever database we are pointed at.

The matrices used to carry a hard-coded list of UUIDs from the Supabase demo
data. Run against Azure they matched nothing, every count came back zero, and
the scripts reported PASS — a security check that tested nothing and said it
was fine.

That is the exact failure this whole suite exists to catch, sitting in the
suite. So: look the subjects up by role, every run, and refuse to report a
pass when there was nobody to test.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dbq import query  # noqa: E402

ROLE_ORDER = [
    "employee", "contractor", "manager",
    "payroll_admin", "leadership", "hr_admin", "super_admin",
]


def roles_present() -> list[tuple[str, str]]:
    """One active profile per role, in a sensible order. Roles with nobody are left out."""
    rows = query("""
      select distinct on (role) role::text as role, id
      from profiles
      where coalesce(is_active, true)
      order by role, created_at;
    """)
    found = {r["role"]: r["id"] for r in rows}
    return [(r, found[r]) for r in ROLE_ORDER if r in found]


def has_any_data() -> tuple[bool, str]:
    """
    Is there enough here for the answer to mean anything?

    An empty database makes every check pass, because nobody can reach what
    is not there. Reporting that as a pass is how the Azure gate came back
    green having proved nothing.
    """
    rows = query("select count(*) as n from employees;")
    employees = int(rows[0]["n"]) if rows else 0
    rows = query("select count(distinct role) as n from profiles where coalesce(is_active,true);")
    roles = int(rows[0]["n"]) if rows else 0

    if employees < 2:
        return False, f"only {employees} employee record(s) — nothing to test cross-person access against"
    if roles < 3:
        return False, f"only {roles} distinct role(s) present — most checks would have nobody to compare"
    return True, f"{employees} employees across {roles} roles"


def stop_if_meaningless() -> None:
    ok, why = has_any_data()
    if not ok:
        print()
        print(f"  INCONCLUSIVE — {why}.")
        print()
        print("  Nothing was verified. That is not the same as nothing being wrong:")
        print("  on an empty database every role can reach nothing, which reads as a")
        print("  pass and proves nothing at all.")
        print()
        print("  Load representative data, then run this again.")
        sys.exit(3)
    print(f"  Testing against {why}.\n")

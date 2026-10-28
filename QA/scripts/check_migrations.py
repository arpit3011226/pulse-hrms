#!/usr/bin/env python3
"""
Will these migrations build a database from nothing?

Two faults reached the Azure move because production was the only database
that had ever run these files:

  * 00020 had a filesystem path pasted into the middle of `storage.objects`,
    so the file could not parse at all.
  * 00017 re-declared `notifications` with CREATE TABLE IF NOT EXISTS and a
    different column name. It found 00001's table, did nothing, said nothing,
    and failed three statements later on an index — taking every migration
    after it down too.

Both are invisible to anybody working against a database that already exists.
This reads the files instead and looks for the shapes that only bite on a
fresh build.

    python3 QA/scripts/check_migrations.py

It is a fast check, not a substitute for replay_migrations.sh, which actually
runs them. Use this on every commit and that one before a release.
"""
import pathlib
import re
import sys

MIGRATIONS = sorted(pathlib.Path("supabase/migrations").glob("*.sql"))

findings = []
handled = []


def flag(file, why, detail=""):
    findings.append((file.name, why, detail))


# ── 1. Text that cannot be SQL ───────────────────────────────────────────
# An absolute path or a .sql filename inside a statement is almost always an
# editor accident, and it stops the file parsing.
SUSPICIOUS = re.compile(r"(/Users/|/home/|[A-Z]:\\\\|\.sql[a-z])")

# ── 2. Dollar-quoting that does not close ────────────────────────────────
def unbalanced_dollars(text):
    # Strip line comments first; $$ inside a comment is not a quote.
    body = re.sub(r"--[^\n]*", "", text)
    return body.count("$$") % 2 != 0


# ── 3. A table declared twice with different columns ─────────────────────
CREATE_TABLE = re.compile(
    r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z_.\"]+)\s*\((.*?)\n\);",
    re.S | re.I,
)


def columns_of(block):
    cols = []
    depth = 0
    current = ""
    for ch in block:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            cols.append(current)
            current = ""
        else:
            current += ch
    cols.append(current)
    names = []
    for c in cols:
        c = c.strip()
        if not c or re.match(r"^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT|EXCLUDE)\b", c, re.I):
            continue
        m = re.match(r'^"?([a-z_]+)"?\s', c, re.I)
        if m:
            names.append(m.group(1).lower())
    return set(names)


seen_tables = {}

for path in MIGRATIONS:
    text = path.read_text()

    for m in SUSPICIOUS.finditer(text):
        line_no = text[: m.start()].count("\n") + 1
        line = text.splitlines()[line_no - 1].strip()
        # A path inside a comment is only documentation.
        if line.lstrip().startswith("--"):
            continue
        flag(path, f"line {line_no}: text that cannot be SQL", line[:110])

    if unbalanced_dollars(text):
        flag(path, "unbalanced $$ — a function or DO block does not close")

    for m in CREATE_TABLE.finditer(text):
        name = m.group(1).strip('"').lower()
        if "." in name and not name.startswith("public."):
            continue
        name = name.replace("public.", "")
        cols = columns_of(m.group(2))
        if name in seen_tables:
            first_file, first_cols = seen_tables[name]
            only_first = first_cols - cols
            only_now = cols - first_cols
            if only_first or only_now:
                # A later migration may deal with this on purpose — renaming
                # the old column so the table ends up in the shape it wants.
                # That is a fix, not a fault, so look before complaining.
                reconciled = all(
                    re.search(
                        rf"RENAME\s+COLUMN\s+\"?{re.escape(old_col)}\"?\s+TO",
                        text, re.I,
                    )
                    for old_col in only_first
                ) if only_first else False

                if reconciled:
                    handled.append(
                        f"{path.name}: `{name}` differs from {first_file} "
                        f"and is reconciled ({', '.join(sorted(only_first))} renamed)"
                    )
                else:
                    flag(
                        path,
                        f"`{name}` was already created in {first_file} with different columns, "
                        "and nothing reconciles them",
                        f"only in {first_file}: {sorted(only_first) or '—'} · "
                        f"only here: {sorted(only_now) or '—'} — "
                        "CREATE TABLE IF NOT EXISTS will silently skip, and the next "
                        "index or policy on a new column will fail",
                    )
                # The reconciled shape is what the database actually ends up
                # with, so later files are compared against that.
                seen_tables[name] = (path.name, cols)
        else:
            seen_tables[name] = (path.name, cols)


print(f"Checked {len(MIGRATIONS)} migrations for faults that only show on a fresh build\n")

for note in handled:
    print(f"  handled  {note}")
if handled:
    print()

if not findings:
    print("  Nothing wrong. Run replay_migrations.sh to be certain.")
    sys.exit(0)

for name, why, detail in findings:
    print(f"  {name}")
    print(f"     {why}")
    if detail:
        print(f"     {detail}")
    print()

print(f"  {len(findings)} finding(s)")
sys.exit(1)

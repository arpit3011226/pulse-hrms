"""
Ask the database something, whichever database it is.

These checks have to survive the move to Azure. They were the only thing that
proved row-level security actually holds, and a safety net that stays behind
on the old platform is no safety net at all.

    On Supabase   nothing to do; the Supabase CLI is used.
    On Azure      export PULSE_DB_URL=postgres://user:pass@host:5432/postgres
                  and psql is used instead.
"""
import json
import os
import re
import subprocess


def backend() -> str:
    return "psql" if os.environ.get("PULSE_DB_URL") else "supabase"


def _parse_psql(stdout: str) -> list[dict]:
    """
    Turn psql's aligned-off output into rows.

    Run with --no-align --field-separator=<tab>, psql prints a header line
    then one line per row, and does that again for every statement in a
    multi-statement command. What the callers want is the LAST result set —
    the SELECT at the end, after the begin and the set_config.

    Split on blank lines, take the last block with at least two lines, and
    read the first of those as the header.
    """
    blocks, current = [], []
    for line in stdout.splitlines():
        if line.strip() == "":
            if current:
                blocks.append(current)
                current = []
            continue
        # psql's row counts and notices are not data.
        if re.match(r"^\(\d+ rows?\)$", line.strip()):
            if current:
                blocks.append(current)
                current = []
            continue
        if line.startswith(("SET", "BEGIN", "ROLLBACK", "COMMIT", "NOTICE", "UPDATE ", "INSERT ", "DELETE ")):
            continue
        current.append(line)
    if current:
        blocks.append(current)

    for block in reversed(blocks):
        if len(block) >= 2:
            header = block[0].split("\t")
            return [dict(zip(header, line.split("\t"))) for line in block[1:]]
    return []


def _parse_supabase(stdout: str) -> list[dict]:
    m = re.search(r"\{.*\}", stdout, re.S)
    if not m:
        return []
    try:
        return json.loads(m.group()).get("rows") or []
    except json.JSONDecodeError:
        return []


def query(sql: str) -> list[dict]:
    """Run SQL and return the last statement's rows. [] on any failure."""
    url = os.environ.get("PULSE_DB_URL")
    if url:
        out = subprocess.run(
            ["psql", url, "--no-psqlrc", "--quiet", "--no-align",
             "--field-separator=\t", "--command", sql],
            capture_output=True, text=True,
        )
        return _parse_psql(out.stdout)

    out = subprocess.run(
        ["npx", "--yes", "supabase", "db", "query", "--linked", sql],
        capture_output=True, text=True,
    )
    return _parse_supabase(out.stdout)

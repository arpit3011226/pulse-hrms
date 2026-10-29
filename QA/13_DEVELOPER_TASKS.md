# Two jobs on the Azure server

**For** the developer who set up `pulse.augustinnovate.com`
**Date** 29 October 2026
**Time needed** about 20 minutes

Pulse is up on Azure and working. Two things are left before anybody signs
in to use it properly.

Neither is difficult. The second one matters more than it looks, and the
reason is explained so you can judge it yourself rather than take it on
trust.

---

## Before you start

You need:

- SSH access to the Azure virtual machine
- The Postgres connection string for the Azure database
- The Pulse repository pulled on that machine, or somewhere with `psql` and
  `python3`

Pull the latest code first. Everything below was added in the last two days.

```bash
git pull
```

---

## Job 1 — Turn on the security headers

**Why.** Supabase used to send these for us. A self-hosted nginx sends none
of them, and nothing looks wrong — the application works perfectly without
them. We checked the live site and all six are missing.

Two of them matter particularly for Pulse:

- Pulse accepts file uploads. Without `X-Content-Type-Options`, a browser
  can decide an uploaded file is something more interesting than it claims
  to be, and run it.
- Pulse URLs contain record identifiers. Without `Referrer-Policy`, those
  URLs are sent to any other site a page links to.

### Step 1. Copy the file into place

```bash
sudo cp deploy/nginx-security-headers.conf /etc/nginx/snippets/pulse-security.conf
```

### Step 2. Include it

Open the nginx site configuration for `pulse.augustinnovate.com` and add
this line inside the `server { ... }` block:

```
include /etc/nginx/snippets/pulse-security.conf;
```

### Step 3. Test, then reload

Test first. This catches a typo before it takes the site down.

```bash
sudo nginx -t
```

Only if that says the configuration is OK:

```bash
sudo nginx -s reload
```

### Step 4. Check it worked

```bash
curl -sI https://pulse.augustinnovate.com/login | grep -iE "strict-transport|x-frame|x-content-type|referrer|content-security"
```

You should see five lines. If you see nothing, the include did not take
effect — check it is inside the right `server` block.

### If a page breaks afterwards

It will be the content-security-policy line. That is the only one that can
stop a page working.

Open the browser console on the broken page. It names the exact directive
that blocked something, for example `script-src` or `connect-src`.

**Fix that one directive. Do not delete the whole header.** Tell us what the
console said and we will adjust it.

To undo everything quickly: comment out the `include` line, then
`sudo nginx -t && sudo nginx -s reload`.

---

## Job 2 — Run the checks

**Why.** Everything that protects the data in Pulse was tested against
Supabase. Row-level security, who can read what, who can change what — all
of it was proved on the old platform.

None of it has been proved on the new one. The database is new, the API
layer is new, and the way the signed-in person is identified is new. If any
part of that chain is wired differently, the application still looks
completely normal — and the database quietly stops protecting anything.

These checks ask the same questions of the new database.

**They are safe to run against the live system.** Nothing writes. The
reading checks only read, and the others run inside transactions that are
rolled back, so nothing is left behind.

### Step 1. Point them at the Azure database

```bash
export PULSE_DB_URL="postgres://USER:PASSWORD@YOUR-SERVER.postgres.database.azure.com:5432/postgres"
```

### Step 2. Run them

```bash
./QA/scripts/azure_gate.sh 2>&1 | tee gate.txt
```

It runs eight sets of checks and takes a few minutes. Each one prints PASS
or FAIL as it finishes.

### Step 3. Send back `gate.txt`

Send the file. We will read it and say what, if anything, needs attention.

---

## What the checks are looking at

Useful to know, in case one fails and you want to understand it.

| | What it asks |
|---|---|
| 1. One person, one account | Did every account keep its confirmed email through the data copy? |
| 2. Who can read what | 210 checks: can any role see something it should not? |
| 3. Who can change what | 84 checks: can any role alter somebody else's record? |
| 4. Profile privileges | Can an employee make themselves an administrator? |
| 5. Pre-boarding documents | Can one job candidate see another one's documents? |
| 6. Agreements and offers | Can a signed document be altered afterwards? |
| 7. File access | Can somebody open a file that is not theirs? |
| 8. Migrations | Could the database be rebuilt from the migration files? |

### The first one is the one to care about

It checks a single column: `email_confirmed_at` on each account.

Google sign-in is not switched on yet, so this looks irrelevant today. It is
not. When Google is turned on later, it attaches to somebody's existing
account **only if that account's email is confirmed**. If the data copy
dropped that column, it creates a **second** account instead.

That person then opens Pulse and finds it empty. It looks exactly like data
loss, and untangling it afterwards is slow.

Today it costs nothing to check. In three months it costs a weekend.

---

## If something fails

Send `gate.txt` and stop there. Do not try to fix a failing security check
by changing the check.

A failure here almost always means something in the wiring between the API
layer and the database is not passing through who the signed-in person is.
That is a configuration problem with a specific cause, and we would rather
find it than work around it.

---

## Summary

1. Copy the nginx file, include it, test, reload, check five headers appear.
2. Export the database URL, run `azure_gate.sh`, send back `gate.txt`.

Nothing in either job changes any data.

---

© 2026 | Augustinnovate Pvt. Ltd.

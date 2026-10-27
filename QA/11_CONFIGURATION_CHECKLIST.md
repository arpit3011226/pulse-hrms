# Configuration Checklist — Pulse

**For** August Innovate Pvt Ltd
**Date** 27 October 2026

Things that are built and tested in the code but still need switching on, with
a value only you can supply. None of these is a code change, and none can be
done from inside Pulse.

Ordered by what bites first.

---

## 1. The address Pulse is reachable at · before anybody real is invited

**Why it matters.** Every set-password invitation and every alumni
reactivation link is built from this. Without it, links are built from
whatever the person generating them happens to be browsing — today
`http://localhost:5173`. The link looks completely normal and reaches nobody,
so HR would not find out until the recipient said so.

**What to do.** Add to `.env.local`, and to the environment of wherever Pulse
is deployed:

```
VITE_PUBLIC_APP_URL=https://pulse.augustinnovate.com
```

Use whatever address people actually type. No trailing slash needed — it is
stripped either way.

**How to check.** Create a login from **Settings → Logins**. If the amber
warning "This link points at localhost" is gone, it is set.

---

## 2. Company sign-on with Google · QA-38, currently open

**Why it matters.** The whole joiner identity story depends on it: a personal
password before joining, the company Google account afterwards. Right now the
project has only email and password enabled, and no Google identity has ever
been created — the button was hidden because pressing it returned an error.

**What to do**, in the Supabase dashboard:

1. **Authentication → Providers → Google** — enable it.
2. Supply the **Client ID** and **Client Secret** from a Google Cloud OAuth
   client for the `augustinnovate.com` workspace.
3. Add the redirect URL Supabase shows you to that Google OAuth client's
   **Authorised redirect URIs**.
4. **Authentication → URL Configuration** — set the Site URL to the same
   address as `VITE_PUBLIC_APP_URL`, and add it to Redirect URLs.

Then, in Pulse:

5. Set `VITE_SSO_ENABLED=true` so the sign-in button appears.
6. Set the organisation's `sso_enabled` flag, so new joiners are marked as SSO
   users as they are converted:

```sql
update organizations
set sso_enabled = true,
    sso_domain  = 'augustinnovate.com'
where id = '<your organisation id>';
```

**Why those are two separate flags.** `VITE_SSO_ENABLED` decides whether the
button is shown, which is a question the login screen has to answer before
anybody has signed in and before there is an organisation to ask.
`sso_enabled` decides whether a new joiner is recorded as an SSO user. Keeping
them apart is what stops Pulse marking the whole company as SSO-only while the
provider is still off — which would lock everybody out with a single column.

**One thing to verify on the day.** When somebody who already has a
password-based login signs in with Google on the same address, Supabase should
attach the Google identity to the existing account rather than making a second
one. That is the documented behaviour for verified addresses, and all 18
current logins are confirmed, so it should hold — but test it with one real
account before switching the company over.

---

## 3. Two deferred Supabase settings · outstanding since 16 October

Both are switches in the dashboard and need no code.

* **Authentication → Policies → leaked password protection.** Checks a new
  password against the Have I Been Pwned list and refuses known-breached ones.
* **Authentication → Multi-factor.** More than one factor available for the
  accounts that matter — the super admin and payroll admin above all.

You chose to defer these. They are worth doing before real salary data is in
the system, not after.

---

## 4. Who holds which account during UAT

* **Payroll admin.** Computing a run, generating payslips and publishing them
  require it, which mirrors what the database has always enforced. An HR admin
  can set up a cycle but not compute it, and will be confused if nobody told
  them.
* **Super admin.** Needed to set a password for a member of staff. HR can do
  it for candidates and alumni only — deliberately, since letting HR set a
  password on a super admin's login would be privilege escalation.

---

## 5. One figure to confirm

**Labour Welfare Fund.** The employee share was corrected from ₹150 to ₹50
against the Karnataka Labour Welfare Board's published rates, with the
employer paying ₹100. It is right as at today, but the Board revises it and it
is real money leaving real salaries. Worth one check with your payroll
consultant.

---

© 2026 | Augustinnovate Pvt. Ltd.

-- QA-02: one trigger function was left executable by anon.
--
-- `set_first_checkin_due` came in with the mentorship migration and missed the
-- REVOKE every other function there got. Postgres grants EXECUTE to PUBLIC by
-- default, which is what 00044 was written about.
--
-- Not exploitable: it returns TRIGGER, so calling it directly raises "trigger
-- functions can only be called as triggers", and it is not SECURITY DEFINER so
-- it would run as the caller anyway. Closed because an inconsistency in who can
-- execute what is the kind of thing that stops being harmless when somebody
-- later changes the function.

REVOKE ALL ON FUNCTION public.set_first_checkin_due() FROM PUBLIC, anon, authenticated;

-- Ordinary employees could not raise a helpdesk ticket at all.
--
-- The ticket number was worked out in the browser: read the highest HD-nnnn
-- for the organisation, add one. That read goes through row-level security,
-- and an ordinary employee may only see tickets they raised, were assigned, or
-- were escalated to. So for almost everybody the query came back empty, the
-- browser decided the next number was HD-0001, and the insert hit the unique
-- index on a number that already existed. The result was a 409 from PostgREST
-- and a form that closed as though it had worked.
--
-- It only showed up once somebody else had raised the first ticket, which is
-- why it survived to this point: whoever tested it was usually HR, who can see
-- every ticket and therefore always got the right number.
--
-- A number that has to be unique across rows the caller cannot see is not the
-- browser's job. It moves here, where the count is honest, and the client no
-- longer sends one at all.

CREATE OR REPLACE FUNCTION assign_helpdesk_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  -- One allocator at a time per organisation. Two people pressing Raise in the
  -- same second would otherwise both read the same maximum and both try to
  -- insert the same number. The lock is released when the transaction ends.
  PERFORM pg_advisory_xact_lock(
    hashtext('helpdesk_ticket_number:' || NEW.organization_id::TEXT)
  );

  SELECT COALESCE(MAX((regexp_match(ticket_number, '^HD-(\d+)$'))[1]::INTEGER), 0) + 1
    INTO v_next
  FROM helpdesk_tickets
  WHERE organization_id = NEW.organization_id;

  -- Always set, never trusted from the caller: the browser cannot see enough
  -- rows to pick a number, so it should not be allowed to choose one.
  NEW.ticket_number := 'HD-' || lpad(v_next::TEXT, 4, '0');

  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.assign_helpdesk_ticket_number() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_assign_helpdesk_ticket_number ON helpdesk_tickets;
CREATE TRIGGER trg_assign_helpdesk_ticket_number
  BEFORE INSERT ON helpdesk_tickets
  FOR EACH ROW EXECUTE FUNCTION assign_helpdesk_ticket_number();

COMMENT ON FUNCTION assign_helpdesk_ticket_number() IS
  'Allocates the next HD-nnnn for the organisation. Here rather than in the browser, which cannot see every ticket.';

-- ============================================================================
-- The notification type list never grew past resignations.
--
-- notifications.type was constrained to six resignation events plus
-- 'general'. The pre-boarding, signing and offer flows have their own things
-- to say, and sending them all as 'general' would make the list unreadable
-- the moment it has more than a handful of rows in it.
--
-- Found the hard way: notify_roles() raised 23514 on every call, and the
-- browser helper logs and swallows a failure on purpose — so a document
-- could be uploaded and nobody told, with nothing on screen to say so. The
-- swallow is still right (losing an upload because a notification failed
-- would be worse), but it meant a plain coding mistake sat invisible. A
-- constraint is the right place to catch it; it just needed to know about
-- the new events.
-- ============================================================================

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type = ANY (ARRAY[
    -- Separation, as before
    'resignation_submitted',
    'resignation_manager_approved',
    'resignation_hr_approved',
    'resignation_rejected',
    'clearance_requested',
    'clearance_updated',
    -- Hiring and joining
    'documents_requested',
    'document_uploaded',
    'document_rejected',
    'offer_accepted',
    'offer_declined',
    'agreements_issued',
    'agreement_signed',
    -- Anything that does not deserve its own kind
    'general'
  ])
);

COMMENT ON COLUMN notifications.type IS
  'What kind of thing happened. Add a value here when adding a flow — notify_roles() will raise 23514 otherwise, and the browser helper swallows that by design.';

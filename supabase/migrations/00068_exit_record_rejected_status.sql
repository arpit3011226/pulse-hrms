-- QA-26: a rejected exit had nowhere to sit, so it stayed "in progress" forever.
--
-- `employee_exit_records` carries two columns for the same journey:
-- `approval_status` (who has signed it off) and `status` (where the exit has
-- got to). Rejecting only ever wrote the first one.
--
-- Found on the demo data, where one record reads:
--
--   status = notice_period   approval_status = hr_rejected
--
-- HR approved the resignation, which set status to notice_period and flagged
-- the employee as on notice; HR then rejected it, which changed nothing but
-- the approval. The exit record still says the person is serving notice, and
-- the HR dashboard still counts it — "2 exits in progress" included one that
-- had been rejected.
--
-- `status` had no value meaning "this exit is not going ahead". The only
-- terminal state was `withdrawn`, which is the employee changing their mind,
-- not the company turning them down. Recording a rejection as a withdrawal
-- would be wrong on the record and wrong in any report built from it.
--
-- `rejected` is added, and the application sets it when either the manager or
-- HR rejects.

ALTER TABLE employee_exit_records
  DROP CONSTRAINT IF EXISTS employee_exit_records_status_check;

ALTER TABLE employee_exit_records
  ADD CONSTRAINT employee_exit_records_status_check
  CHECK (status = ANY (ARRAY[
    'initiated',
    'notice_period',
    'clearance_pending',
    'clearance_completed',
    'completed',
    'withdrawn',
    'rejected'
  ]));

COMMENT ON COLUMN employee_exit_records.status IS
  'Where the exit has reached. "withdrawn" is the employee pulling out; "rejected" is the company declining it. Both are terminal and neither counts as in progress.';

-- Put right the records already left stale by a rejection.
UPDATE employee_exit_records
SET status = 'rejected'
WHERE approval_status IN ('manager_rejected', 'hr_rejected')
  AND status NOT IN ('rejected', 'withdrawn', 'completed');

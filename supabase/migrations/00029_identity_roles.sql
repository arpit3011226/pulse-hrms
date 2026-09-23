-- ============================================================================
-- F43 (part 1 of 2) — Identity roles
--
-- New enum values must be added in their own migration: Postgres will not let
-- a value be USED in the same transaction that adds it. Part 2 (00030) does
-- the table work and may reference these.
-- ============================================================================

-- A person who has applied but is not an employee. Gets a login so they can
-- track their application, upload documents and accept an offer.
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'candidate';

-- A person who has left. Keeps a login so they can download their payslips,
-- Form 16 and letters.
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'alumni';

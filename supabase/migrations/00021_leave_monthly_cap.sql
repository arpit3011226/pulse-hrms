-- ============================================
-- Leave Type: Monthly Cap & Use-it-or-lose-it
-- For leave types like menstrual leave where only
-- X leave(s) can be applied per month
-- ============================================

-- Maximum number of leaves that can be applied in a single month
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS max_leaves_per_month NUMERIC(3,1) DEFAULT NULL;

-- If true, unused monthly credit expires at end of month (not accumulated)
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS is_use_it_or_lose_it BOOLEAN DEFAULT false;

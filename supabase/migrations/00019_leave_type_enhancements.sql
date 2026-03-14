-- ============================================
-- Leave Type Enhancements
-- Accrual frequency, monthly crediting, regional leaves
-- ============================================

ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS accrual_frequency TEXT DEFAULT 'yearly'
  CHECK (accrual_frequency IN ('yearly', 'monthly', 'quarterly'));

ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS monthly_credit_amount NUMERIC(5,1) DEFAULT NULL;

ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS is_regional BOOLEAN DEFAULT false;

ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS applicable_region TEXT DEFAULT NULL;

-- ============================================================================
-- Income Tax Declarations & TDS Tracking
-- ============================================================================

-- Tax regime selection per employee per financial year
CREATE TABLE IF NOT EXISTS employee_tax_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  financial_year TEXT NOT NULL, -- e.g., '2025-26'
  tax_regime TEXT NOT NULL CHECK (tax_regime IN ('old', 'new')), -- old or new regime
  -- Section 80C
  section_80c NUMERIC DEFAULT 0, -- PPF, ELSS, LIC, etc. (max 1.5L)
  -- Section 80D
  section_80d NUMERIC DEFAULT 0, -- Medical insurance (max 25K/50K)
  -- Section 24
  home_loan_interest NUMERIC DEFAULT 0, -- Home loan interest (max 2L)
  -- HRA
  hra_claimed NUMERIC DEFAULT 0,
  -- Section 80CCD(1B)
  nps_contribution NUMERIC DEFAULT 0, -- NPS (max 50K)
  -- Other deductions
  other_deductions NUMERIC DEFAULT 0,
  other_deductions_detail TEXT,
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'verified', 'rejected')),
  verified_by UUID REFERENCES employees(id),
  verified_at TIMESTAMPTZ,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, employee_id, financial_year)
);

-- Monthly TDS tracking
CREATE TABLE IF NOT EXISTS employee_tds_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  financial_year TEXT NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  -- For full-time (Section 192)
  projected_annual_income NUMERIC,
  total_exemptions NUMERIC DEFAULT 0,
  taxable_income NUMERIC,
  annual_tax_liability NUMERIC,
  monthly_tds NUMERIC DEFAULT 0,
  -- For contractors (Section 194C/194J)
  invoice_amount NUMERIC,
  tds_rate NUMERIC, -- 1%, 2%, or 10%
  tds_section TEXT, -- '192', '194C', '194J'
  -- Actual deducted
  tds_deducted NUMERIC DEFAULT 0,
  payslip_id UUID REFERENCES payslips(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, employee_id, month, year)
);

-- Enable RLS
ALTER TABLE employee_tax_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_tds_records ENABLE ROW LEVEL SECURITY;

-- Policies (same pattern as other tables)
CREATE POLICY "org_isolation_tax_decl" ON employee_tax_declarations
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "org_isolation_tds" ON employee_tds_records
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

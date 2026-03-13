-- ============================================================================
-- 00007: Payroll & Compensation — Salary Components, Structures, Compensation,
--        Payroll Processing, Payslips, and Adjustments
-- ============================================================================

-- Salary Components — Master list of earning/deduction types
CREATE TABLE IF NOT EXISTS salary_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  component_name TEXT NOT NULL,
  component_code TEXT NOT NULL,
  component_type TEXT NOT NULL DEFAULT 'earning',       -- 'earning' | 'deduction' | 'employer_contribution'
  category TEXT NOT NULL DEFAULT 'fixed',                -- 'fixed' | 'variable' | 'statutory' | 'reimbursement'
  is_taxable BOOLEAN DEFAULT true,
  is_statutory BOOLEAN DEFAULT false,
  statutory_type TEXT,                                   -- 'pf_employee' | 'pf_employer' | 'esi_employee' | 'esi_employer' | 'pt' | 'tds'
  calculation_type TEXT NOT NULL DEFAULT 'flat',          -- 'flat' | 'percentage_of_basic' | 'percentage_of_gross'
  default_value NUMERIC(12,2) DEFAULT 0,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, component_code)
);

CREATE TRIGGER set_updated_at_salary_components BEFORE UPDATE ON salary_components
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Salary Structures — Named groupings/templates
CREATE TABLE IF NOT EXISTS salary_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  structure_name TEXT NOT NULL,
  structure_code TEXT,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, structure_name)
);

CREATE TRIGGER set_updated_at_salary_structures BEFORE UPDATE ON salary_structures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Salary Structure Components — Junction table
CREATE TABLE IF NOT EXISTS salary_structure_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salary_structure_id UUID NOT NULL REFERENCES salary_structures(id) ON DELETE CASCADE,
  salary_component_id UUID NOT NULL REFERENCES salary_components(id) ON DELETE CASCADE,
  calculation_type TEXT NOT NULL DEFAULT 'flat',
  default_value NUMERIC(12,2) DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(salary_structure_id, salary_component_id)
);

-- Employee Compensation — Per-employee CTC assignment (effective-dated)
CREATE TABLE IF NOT EXISTS employee_compensation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  salary_structure_id UUID NOT NULL REFERENCES salary_structures(id),
  annual_ctc NUMERIC(14,2) NOT NULL,
  monthly_gross NUMERIC(14,2) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  revision_reason TEXT,
  is_current BOOLEAN DEFAULT true,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at_employee_compensation BEFORE UPDATE ON employee_compensation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_employee_compensation_employee ON employee_compensation(employee_id, is_current);
CREATE INDEX idx_employee_compensation_org ON employee_compensation(organization_id);

-- Employee Compensation Components — Breakup line items
CREATE TABLE IF NOT EXISTS employee_compensation_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_compensation_id UUID NOT NULL REFERENCES employee_compensation(id) ON DELETE CASCADE,
  salary_component_id UUID NOT NULL REFERENCES salary_components(id),
  monthly_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  annual_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  calculation_type TEXT NOT NULL DEFAULT 'flat',
  calculation_value NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_compensation_id, salary_component_id)
);

CREATE INDEX idx_emp_comp_components ON employee_compensation_components(employee_compensation_id);

-- Payroll Cycles — Monthly cycle definitions
CREATE TABLE IF NOT EXISTS payroll_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  cycle_name TEXT NOT NULL,
  payroll_month INTEGER NOT NULL CHECK (payroll_month BETWEEN 1 AND 12),
  payroll_year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'draft',       -- 'draft' | 'processing' | 'computed' | 'approved' | 'paid' | 'cancelled'
  pay_date DATE,
  notes TEXT,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, payroll_month, payroll_year)
);

CREATE TRIGGER set_updated_at_payroll_cycles BEFORE UPDATE ON payroll_cycles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Payroll Runs — Processing runs within a cycle
CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  payroll_cycle_id UUID NOT NULL REFERENCES payroll_cycles(id) ON DELETE CASCADE,
  run_number INTEGER NOT NULL DEFAULT 1,
  run_type TEXT NOT NULL DEFAULT 'regular',               -- 'regular' | 'supplementary' | 'arrears'
  run_status TEXT NOT NULL DEFAULT 'draft',               -- 'draft' | 'processing' | 'completed' | 'approved' | 'cancelled'
  total_employees INTEGER DEFAULT 0,
  total_gross NUMERIC(16,2) DEFAULT 0,
  total_deductions NUMERIC(16,2) DEFAULT 0,
  total_net_pay NUMERIC(16,2) DEFAULT 0,
  processed_by UUID REFERENCES employees(id),
  processed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at_payroll_runs BEFORE UPDATE ON payroll_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Payroll Run Employees — Per-employee payroll results
CREATE TABLE IF NOT EXISTS payroll_run_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  employee_compensation_id UUID REFERENCES employee_compensation(id),
  gross_earnings NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_pay NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_employer_contributions NUMERIC(14,2) DEFAULT 0,
  working_days INTEGER DEFAULT 0,
  present_days NUMERIC(5,1) DEFAULT 0,
  lop_days NUMERIC(5,1) DEFAULT 0,
  payroll_status TEXT NOT NULL DEFAULT 'draft',           -- 'draft' | 'computed' | 'approved' | 'paid' | 'on_hold'
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(payroll_run_id, employee_id)
);

CREATE TRIGGER set_updated_at_payroll_run_employees BEFORE UPDATE ON payroll_run_employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_payroll_run_employees_run ON payroll_run_employees(payroll_run_id);
CREATE INDEX idx_payroll_run_employees_employee ON payroll_run_employees(employee_id);

-- Payroll Earnings — Earning line items per employee per run
CREATE TABLE IF NOT EXISTS payroll_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_employee_id UUID NOT NULL REFERENCES payroll_run_employees(id) ON DELETE CASCADE,
  salary_component_id UUID NOT NULL REFERENCES salary_components(id),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(payroll_run_employee_id, salary_component_id)
);

-- Payroll Deductions — Deduction line items per employee per run
CREATE TABLE IF NOT EXISTS payroll_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_employee_id UUID NOT NULL REFERENCES payroll_run_employees(id) ON DELETE CASCADE,
  salary_component_id UUID NOT NULL REFERENCES salary_components(id),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(payroll_run_employee_id, salary_component_id)
);

-- Payslips — Generated payslip records
CREATE TABLE IF NOT EXISTS payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  payroll_run_employee_id UUID NOT NULL REFERENCES payroll_run_employees(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  payslip_number TEXT NOT NULL,
  payroll_month INTEGER NOT NULL,
  payroll_year INTEGER NOT NULL,
  gross_earnings NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_pay NUMERIC(14,2) NOT NULL DEFAULT 0,
  generated_on TIMESTAMPTZ DEFAULT now(),
  published_flag BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(payroll_run_employee_id)
);

CREATE INDEX idx_payslips_employee ON payslips(employee_id, payroll_year, payroll_month);
CREATE INDEX idx_payslips_org ON payslips(organization_id, payroll_year, payroll_month);

-- Payroll Adjustments — Ad-hoc adjustments
CREATE TABLE IF NOT EXISTS payroll_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  payroll_run_employee_id UUID REFERENCES payroll_run_employees(id),
  adjustment_type TEXT NOT NULL DEFAULT 'addition',       -- 'addition' | 'deduction'
  salary_component_id UUID REFERENCES salary_components(id),
  amount NUMERIC(12,2) NOT NULL,
  reason TEXT NOT NULL,
  adjustment_month INTEGER NOT NULL,
  adjustment_year INTEGER NOT NULL,
  is_processed BOOLEAN DEFAULT false,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at_payroll_adjustments BEFORE UPDATE ON payroll_adjustments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE salary_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_read_salary_components" ON salary_components FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "admin_manage_salary_components" ON salary_components FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin', 'payroll_admin')));

ALTER TABLE salary_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_read_salary_structures" ON salary_structures FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "admin_manage_salary_structures" ON salary_structures FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin', 'payroll_admin')));

ALTER TABLE salary_structure_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_structure_components" ON salary_structure_components FOR SELECT
  USING (salary_structure_id IN (SELECT id FROM salary_structures WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));
CREATE POLICY "admin_manage_structure_components" ON salary_structure_components FOR ALL
  USING (salary_structure_id IN (SELECT id FROM salary_structures WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin', 'payroll_admin'))));

ALTER TABLE employee_compensation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_own_or_admin_compensation" ON employee_compensation FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "admin_manage_compensation" ON employee_compensation FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin', 'payroll_admin')));

ALTER TABLE employee_compensation_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_comp_components" ON employee_compensation_components FOR SELECT
  USING (employee_compensation_id IN (SELECT id FROM employee_compensation WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));
CREATE POLICY "admin_manage_comp_components" ON employee_compensation_components FOR ALL
  USING (employee_compensation_id IN (SELECT id FROM employee_compensation WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin', 'payroll_admin'))));

ALTER TABLE payroll_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_read_payroll_cycles" ON payroll_cycles FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "admin_manage_payroll_cycles" ON payroll_cycles FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'payroll_admin')));

ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_read_payroll_runs" ON payroll_runs FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "admin_manage_payroll_runs" ON payroll_runs FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'payroll_admin')));

ALTER TABLE payroll_run_employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_own_or_admin_payroll_results" ON payroll_run_employees FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "admin_manage_payroll_results" ON payroll_run_employees FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'payroll_admin')));

ALTER TABLE payroll_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_payroll_earnings" ON payroll_earnings FOR SELECT
  USING (payroll_run_employee_id IN (SELECT id FROM payroll_run_employees WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));
CREATE POLICY "admin_manage_payroll_earnings" ON payroll_earnings FOR ALL
  USING (payroll_run_employee_id IN (SELECT id FROM payroll_run_employees WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'payroll_admin'))));

ALTER TABLE payroll_deductions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_payroll_deductions" ON payroll_deductions FOR SELECT
  USING (payroll_run_employee_id IN (SELECT id FROM payroll_run_employees WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));
CREATE POLICY "admin_manage_payroll_deductions" ON payroll_deductions FOR ALL
  USING (payroll_run_employee_id IN (SELECT id FROM payroll_run_employees WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'payroll_admin'))));

ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_own_or_admin_payslips" ON payslips FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "admin_manage_payslips" ON payslips FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'payroll_admin')));

ALTER TABLE payroll_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_payroll_adjustments" ON payroll_adjustments FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "admin_manage_payroll_adjustments" ON payroll_adjustments FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'payroll_admin')));

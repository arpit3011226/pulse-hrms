-- =============================================
-- PULSE HRMS - Comprehensive Demo Data Seed
-- Run this in Supabase SQL Editor
-- =============================================
-- This script uses existing org/profiles/employees and adds
-- rich data across all modules for testing.

-- First, let's capture existing IDs into variables
DO $$
DECLARE
  v_org_id UUID;
  v_profile_id UUID;
  v_emp1_id UUID; -- Arpit (admin)
  v_emp2_id UUID; -- Mishka S
  v_emp3_id UUID; -- Vikas Sharma
  v_dept_eng_id UUID;
  v_dept_hr_id UUID;
  v_dept_finance_id UUID;
  v_dept_marketing_id UUID;
  v_desig_se_id UUID;
  v_desig_sse_id UUID;
  v_desig_mgr_id UUID;
  v_desig_lead_id UUID;
  v_desig_hr_id UUID;
  v_desig_analyst_id UUID;
  -- New employees
  v_emp4_id UUID := gen_random_uuid();
  v_emp5_id UUID := gen_random_uuid();
  v_emp6_id UUID := gen_random_uuid();
  v_emp7_id UUID := gen_random_uuid();
  v_emp8_id UUID := gen_random_uuid();
  v_emp9_id UUID := gen_random_uuid();
  v_emp10_id UUID := gen_random_uuid();
  -- Leave types
  v_lt_casual_id UUID;
  v_lt_sick_id UUID;
  v_lt_earned_id UUID;
  v_lt_comp_id UUID;
  -- Shift
  v_shift_id UUID;
  -- Salary components
  v_sc_basic_id UUID;
  v_sc_hra_id UUID;
  v_sc_da_id UUID;
  v_sc_special_id UUID;
  v_sc_pf_emp_id UUID;
  v_sc_pf_er_id UUID;
  v_sc_pt_id UUID;
  v_sc_tds_id UUID;
  -- Salary structure
  v_ss_id UUID;
  -- Payroll
  v_pc_feb_id UUID;
  v_pc_mar_id UUID;
  v_pr_feb_id UUID;
  v_pr_mar_id UUID;
  -- Performance
  v_perf_cycle_id UUID;
  -- Recruitment
  v_req_id UUID;
  v_stage1_id UUID;
  v_stage2_id UUID;
  v_stage3_id UUID;
  -- Survey
  v_survey_id UUID;
  -- Leave policy
  v_lp_id UUID;
BEGIN
  -- ============================================
  -- Get existing organization
  -- ============================================
  SELECT id INTO v_org_id FROM organizations LIMIT 1;
  SELECT id INTO v_profile_id FROM profiles WHERE email = 'arpit@augustinnovate.com';

  -- Get existing employees
  SELECT id INTO v_emp1_id FROM employees WHERE email = 'arpit@augustinnovate.com' AND organization_id = v_org_id;
  -- If admin has no employee record, create one
  IF v_emp1_id IS NULL THEN
    INSERT INTO employees (id, organization_id, profile_id, first_name, last_name, email, employee_code, status)
    VALUES (gen_random_uuid(), v_org_id, v_profile_id,
      COALESCE((SELECT first_name FROM profiles WHERE id = v_profile_id), 'Arpit'),
      COALESCE((SELECT last_name FROM profiles WHERE id = v_profile_id), 'Saxena'),
      'arpit@augustinnovate.com', 'EMP001', 'active')
    ON CONFLICT (organization_id, email) DO NOTHING;
    SELECT id INTO v_emp1_id FROM employees WHERE email = 'arpit@augustinnovate.com' AND organization_id = v_org_id;
  END IF;

  SELECT id INTO v_emp2_id FROM employees WHERE first_name = 'Mishka' AND organization_id = v_org_id LIMIT 1;
  SELECT id INTO v_emp3_id FROM employees WHERE first_name = 'Vikas' AND organization_id = v_org_id LIMIT 1;

  -- If other employees don't exist yet, set them to NULL (they'll be created below)
  -- But we need v_emp1_id to be set for reporting_manager references

  -- ============================================
  -- DEPARTMENTS (add more)
  -- ============================================
  SELECT id INTO v_dept_eng_id FROM departments WHERE name = 'Engineering' AND organization_id = v_org_id;
  IF v_dept_eng_id IS NULL THEN
    INSERT INTO departments (id, organization_id, name, code, description, is_active)
    VALUES (gen_random_uuid(), v_org_id, 'Engineering', 'ENG', 'Software Engineering', true)
    RETURNING id INTO v_dept_eng_id;
  END IF;

  INSERT INTO departments (id, organization_id, name, code, description, is_active)
  VALUES
    (gen_random_uuid(), v_org_id, 'Human Resources', 'HR', 'People & Culture', true),
    (gen_random_uuid(), v_org_id, 'Finance', 'FIN', 'Finance & Accounts', true),
    (gen_random_uuid(), v_org_id, 'Marketing', 'MKT', 'Marketing & Communications', true)
  ON CONFLICT (organization_id, name) DO NOTHING;

  SELECT id INTO v_dept_hr_id FROM departments WHERE name = 'Human Resources' AND organization_id = v_org_id;
  SELECT id INTO v_dept_finance_id FROM departments WHERE name = 'Finance' AND organization_id = v_org_id;
  SELECT id INTO v_dept_marketing_id FROM departments WHERE name = 'Marketing' AND organization_id = v_org_id;

  -- ============================================
  -- DESIGNATIONS
  -- ============================================
  INSERT INTO designations (id, organization_id, title, level, description, is_active)
  VALUES
    (gen_random_uuid(), v_org_id, 'Software Engineer', 1, 'Junior developer', true),
    (gen_random_uuid(), v_org_id, 'Senior Software Engineer', 2, 'Senior developer', true),
    (gen_random_uuid(), v_org_id, 'Engineering Manager', 4, 'Engineering team lead', true),
    (gen_random_uuid(), v_org_id, 'Tech Lead', 3, 'Technical leadership', true),
    (gen_random_uuid(), v_org_id, 'HR Executive', 2, 'HR operations', true),
    (gen_random_uuid(), v_org_id, 'Financial Analyst', 2, 'Finance analysis', true),
    (gen_random_uuid(), v_org_id, 'Marketing Manager', 3, 'Marketing head', true),
    (gen_random_uuid(), v_org_id, 'Product Designer', 2, 'UI/UX Design', true)
  ON CONFLICT (organization_id, title) DO NOTHING;

  SELECT id INTO v_desig_se_id FROM designations WHERE title = 'Software Engineer' AND organization_id = v_org_id;
  SELECT id INTO v_desig_sse_id FROM designations WHERE title = 'Senior Software Engineer' AND organization_id = v_org_id;
  SELECT id INTO v_desig_mgr_id FROM designations WHERE title = 'Engineering Manager' AND organization_id = v_org_id;
  SELECT id INTO v_desig_lead_id FROM designations WHERE title = 'Tech Lead' AND organization_id = v_org_id;
  SELECT id INTO v_desig_hr_id FROM designations WHERE title = 'HR Executive' AND organization_id = v_org_id;
  SELECT id INTO v_desig_analyst_id FROM designations WHERE title = 'Financial Analyst' AND organization_id = v_org_id;

  -- ============================================
  -- UPDATE EXISTING EMPLOYEES with richer data
  -- ============================================
  UPDATE employees SET
    department_id = v_dept_eng_id,
    designation_id = v_desig_mgr_id,
    date_of_birth = '1992-08-15',
    date_of_joining = '2023-04-01',
    gender = 'male',
    employment_type = 'full_time',
    employee_code = COALESCE(employee_code, 'EMP001'),
    phone = '+91-9876543210'
  WHERE id = v_emp1_id;

  UPDATE employees SET
    department_id = v_dept_eng_id,
    designation_id = v_desig_sse_id,
    date_of_birth = '1995-03-22',
    date_of_joining = '2024-01-15',
    gender = 'female',
    reporting_manager_id = v_emp1_id,
    employment_type = 'full_time',
    employee_code = COALESCE(employee_code, 'EMP002'),
    phone = '+91-9876543211'
  WHERE id = v_emp2_id;

  UPDATE employees SET
    department_id = v_dept_eng_id,
    designation_id = v_desig_se_id,
    date_of_birth = '1997-12-05',
    date_of_joining = '2024-06-01',
    gender = 'male',
    reporting_manager_id = v_emp1_id,
    employment_type = 'full_time',
    employee_code = COALESCE(employee_code, 'EMP003'),
    phone = '+91-9876543212'
  WHERE id = v_emp3_id;

  -- ============================================
  -- NEW EMPLOYEES (7 more for 10 total)
  -- ============================================
  INSERT INTO employees (id, organization_id, first_name, last_name, email, employee_code, department_id, designation_id, reporting_manager_id, date_of_birth, date_of_joining, gender, employment_type, status, phone)
  VALUES
    (v_emp4_id, v_org_id, 'Priya', 'Patel', 'priya@augustinnovate.com', 'EMP004', v_dept_hr_id, v_desig_hr_id, v_emp1_id, '1994-07-10', '2023-09-01', 'female', 'full_time', 'active', '+91-9876543213'),
    (v_emp5_id, v_org_id, 'Rahul', 'Kumar', 'rahul@augustinnovate.com', 'EMP005', v_dept_eng_id, v_desig_se_id, v_emp1_id, '1998-01-28', '2025-01-10', 'male', 'full_time', 'active', '+91-9876543214'),
    (v_emp6_id, v_org_id, 'Ananya', 'Singh', 'ananya@augustinnovate.com', 'EMP006', v_dept_finance_id, v_desig_analyst_id, v_emp1_id, '1996-05-14', '2024-03-15', 'female', 'full_time', 'active', '+91-9876543215'),
    (v_emp7_id, v_org_id, 'Karan', 'Mehta', 'karan@augustinnovate.com', 'EMP007', v_dept_eng_id, v_desig_lead_id, v_emp1_id, '1993-11-20', '2023-06-01', 'male', 'full_time', 'active', '+91-9876543216'),
    (v_emp8_id, v_org_id, 'Neha', 'Gupta', 'neha@augustinnovate.com', 'EMP008', v_dept_marketing_id, (SELECT id FROM designations WHERE title = 'Marketing Manager' AND organization_id = v_org_id), v_emp1_id, '1995-09-08', '2024-02-01', 'female', 'full_time', 'active', '+91-9876543217'),
    (v_emp9_id, v_org_id, 'Amit', 'Sharma', 'amit@augustinnovate.com', 'EMP009', v_dept_eng_id, v_desig_se_id, v_emp7_id, '1999-04-30', '2025-02-15', 'male', 'full_time', 'active', '+91-9876543218'),
    (v_emp10_id, v_org_id, 'Sneha', 'Reddy', 'sneha@augustinnovate.com', 'EMP010', v_dept_eng_id, (SELECT id FROM designations WHERE title = 'Product Designer' AND organization_id = v_org_id), v_emp7_id, '1997-06-25', '2024-08-01', 'female', 'full_time', 'active', '+91-9876543219')
  ON CONFLICT (organization_id, email) DO NOTHING;

  -- Re-fetch IDs for employees that may have been created above via ON CONFLICT
  SELECT id INTO v_emp4_id FROM employees WHERE email = 'priya@augustinnovate.com' AND organization_id = v_org_id;
  SELECT id INTO v_emp5_id FROM employees WHERE email = 'rahul@augustinnovate.com' AND organization_id = v_org_id;
  SELECT id INTO v_emp6_id FROM employees WHERE email = 'ananya@augustinnovate.com' AND organization_id = v_org_id;
  SELECT id INTO v_emp7_id FROM employees WHERE email = 'karan@augustinnovate.com' AND organization_id = v_org_id;
  SELECT id INTO v_emp8_id FROM employees WHERE email = 'neha@augustinnovate.com' AND organization_id = v_org_id;
  SELECT id INTO v_emp9_id FROM employees WHERE email = 'amit@augustinnovate.com' AND organization_id = v_org_id;
  SELECT id INTO v_emp10_id FROM employees WHERE email = 'sneha@augustinnovate.com' AND organization_id = v_org_id;

  -- ============================================
  -- HOLIDAYS (2026 Indian holidays)
  -- ============================================
  INSERT INTO holidays (organization_id, name, date, type, is_active)
  VALUES
    (v_org_id, 'Republic Day', '2026-01-26', 'public', true),
    (v_org_id, 'Holi', '2026-03-04', 'public', true),
    (v_org_id, 'Good Friday', '2026-04-03', 'public', true),
    (v_org_id, 'Eid ul-Fitr', '2026-04-20', 'public', true),
    (v_org_id, 'May Day', '2026-05-01', 'public', true),
    (v_org_id, 'Independence Day', '2026-08-15', 'public', true),
    (v_org_id, 'Janmashtami', '2026-08-25', 'public', true),
    (v_org_id, 'Gandhi Jayanti', '2026-10-02', 'public', true),
    (v_org_id, 'Dussehra', '2026-10-20', 'public', true),
    (v_org_id, 'Diwali', '2026-11-08', 'public', true),
    (v_org_id, 'Guru Nanak Jayanti', '2026-11-27', 'public', true),
    (v_org_id, 'Christmas', '2026-12-25', 'public', true)
  ON CONFLICT (organization_id, date, name) DO NOTHING;

  -- ============================================
  -- LEAVE TYPES
  -- ============================================
  INSERT INTO leave_types (id, organization_id, name, code, default_days, is_carry_forward, max_carry_forward_days, is_paid, is_active)
  VALUES
    (gen_random_uuid(), v_org_id, 'Casual Leave', 'CL', 12, false, 0, true, true),
    (gen_random_uuid(), v_org_id, 'Sick Leave', 'SL', 8, false, 0, true, true),
    (gen_random_uuid(), v_org_id, 'Earned Leave', 'EL', 15, true, 5, true, true),
    (gen_random_uuid(), v_org_id, 'Compensatory Off', 'CO', 0, false, 0, true, true)
  ON CONFLICT (organization_id, name) DO NOTHING;

  SELECT id INTO v_lt_casual_id FROM leave_types WHERE code = 'CL' AND organization_id = v_org_id;
  SELECT id INTO v_lt_sick_id FROM leave_types WHERE code = 'SL' AND organization_id = v_org_id;
  SELECT id INTO v_lt_earned_id FROM leave_types WHERE code = 'EL' AND organization_id = v_org_id;
  SELECT id INTO v_lt_comp_id FROM leave_types WHERE code = 'CO' AND organization_id = v_org_id;

  -- ============================================
  -- LEAVE BALANCES (2026)
  -- ============================================
  -- For all employees, create leave balances
  INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days, pending_days, carried_forward_days)
  SELECT e.id, lt.id, 2026,
    CASE lt.code WHEN 'CL' THEN 12 WHEN 'SL' THEN 8 WHEN 'EL' THEN 15 ELSE 0 END,
    CASE WHEN e.id = v_emp2_id AND lt.code = 'CL' THEN 3
         WHEN e.id = v_emp3_id AND lt.code = 'SL' THEN 2
         WHEN e.id = v_emp7_id AND lt.code = 'EL' THEN 4
         ELSE 0 END,
    CASE WHEN e.id = v_emp5_id AND lt.code = 'CL' THEN 1 ELSE 0 END,
    CASE WHEN lt.code = 'EL' THEN 3 ELSE 0 END
  FROM employees e
  CROSS JOIN leave_types lt
  WHERE e.organization_id = v_org_id AND e.status = 'active'
    AND lt.organization_id = v_org_id AND lt.code IN ('CL', 'SL', 'EL')
  ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;

  -- ============================================
  -- LEAVE REQUESTS (mix of approved, pending, rejected)
  -- ============================================
  -- Mishka: 3 days CL used (past, approved)
  INSERT INTO leave_requests (organization_id, employee_id, leave_type_id, start_date, end_date, total_days, reason, status, approved_by, approved_at)
  VALUES
    (v_org_id, v_emp2_id, v_lt_casual_id, '2026-02-10', '2026-02-12', 3, 'Family function', 'approved', v_emp1_id, '2026-02-08'),
    (v_org_id, v_emp3_id, v_lt_sick_id, '2026-03-03', '2026-03-04', 2, 'Fever and cold', 'approved', v_emp1_id, '2026-03-03'),
    (v_org_id, v_emp5_id, v_lt_casual_id, '2026-03-24', '2026-03-24', 1, 'Personal work', 'pending', NULL, NULL),
    (v_org_id, v_emp7_id, v_lt_earned_id, '2026-02-17', '2026-02-20', 4, 'Vacation trip', 'approved', v_emp1_id, '2026-02-10'),
    (v_org_id, v_emp4_id, v_lt_casual_id, '2026-03-21', '2026-03-21', 1, 'Doctor appointment', 'approved', v_emp1_id, '2026-03-20'),
    (v_org_id, v_emp6_id, v_lt_casual_id, '2026-03-25', '2026-03-26', 2, 'Wedding in family', 'pending', NULL, NULL),
    (v_org_id, v_emp9_id, v_lt_sick_id, '2026-03-10', '2026-03-10', 1, 'Migraine', 'approved', v_emp7_id, '2026-03-10'),
    (v_org_id, v_emp10_id, v_lt_casual_id, '2026-01-20', '2026-01-21', 2, 'House shifting', 'approved', v_emp7_id, '2026-01-18')
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- SHIFTS & ATTENDANCE
  -- ============================================
  INSERT INTO shifts (id, organization_id, name, start_time, end_time, grace_period_minutes, is_default, is_active)
  VALUES (gen_random_uuid(), v_org_id, 'General Shift', '09:00', '18:00', 15, true, true)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_shift_id FROM shifts WHERE name = 'General Shift' AND organization_id = v_org_id LIMIT 1;

  -- Attendance records for the current week and past 2 weeks
  INSERT INTO attendance_records (organization_id, employee_id, date, clock_in, clock_out, shift_id, status, work_hours)
  SELECT v_org_id, e.id, d::date,
    (d::date || ' 09:' || LPAD((random()*15)::int::text, 2, '0') || ':00')::timestamptz,
    (d::date || ' 18:' || LPAD((random()*30)::int::text, 2, '0') || ':00')::timestamptz,
    v_shift_id,
    'present',
    ROUND((8 + random())::numeric, 2)
  FROM employees e
  CROSS JOIN generate_series('2026-03-02'::date, '2026-03-19'::date, '1 day') d
  WHERE e.organization_id = v_org_id
    AND e.status = 'active'
    AND EXTRACT(DOW FROM d) NOT IN (0, 6) -- exclude weekends
    AND NOT EXISTS (SELECT 1 FROM attendance_records ar WHERE ar.employee_id = e.id AND ar.date = d::date)
    AND random() > 0.05 -- 95% attendance rate
  ON CONFLICT (employee_id, date) DO NOTHING;

  -- ============================================
  -- SALARY COMPONENTS
  -- ============================================
  INSERT INTO salary_components (id, organization_id, component_name, component_code, component_type, category, is_taxable, is_statutory, calculation_type, default_value, display_order, is_active)
  VALUES
    (gen_random_uuid(), v_org_id, 'Basic Salary', 'BASIC', 'earning', 'fixed', true, false, 'percentage_of_gross', 40, 1, true),
    (gen_random_uuid(), v_org_id, 'House Rent Allowance', 'HRA', 'earning', 'fixed', true, false, 'percentage_of_basic', 50, 2, true),
    (gen_random_uuid(), v_org_id, 'Dearness Allowance', 'DA', 'earning', 'fixed', true, false, 'percentage_of_basic', 10, 3, true),
    (gen_random_uuid(), v_org_id, 'Special Allowance', 'SA', 'earning', 'fixed', true, false, 'flat', 0, 4, true),
    (gen_random_uuid(), v_org_id, 'PF Employee', 'PF_EMP', 'deduction', 'statutory', false, true, 'percentage_of_basic', 12, 10, true),
    (gen_random_uuid(), v_org_id, 'PF Employer', 'PF_ER', 'employer_contribution', 'statutory', false, true, 'percentage_of_basic', 12, 11, true),
    (gen_random_uuid(), v_org_id, 'Professional Tax', 'PT', 'deduction', 'statutory', false, true, 'flat', 200, 12, true),
    (gen_random_uuid(), v_org_id, 'TDS', 'TDS', 'deduction', 'statutory', false, true, 'flat', 0, 13, true)
  ON CONFLICT (organization_id, component_code) DO NOTHING;

  SELECT id INTO v_sc_basic_id FROM salary_components WHERE component_code = 'BASIC' AND organization_id = v_org_id;
  SELECT id INTO v_sc_hra_id FROM salary_components WHERE component_code = 'HRA' AND organization_id = v_org_id;
  SELECT id INTO v_sc_da_id FROM salary_components WHERE component_code = 'DA' AND organization_id = v_org_id;
  SELECT id INTO v_sc_special_id FROM salary_components WHERE component_code = 'SA' AND organization_id = v_org_id;
  SELECT id INTO v_sc_pf_emp_id FROM salary_components WHERE component_code = 'PF_EMP' AND organization_id = v_org_id;
  SELECT id INTO v_sc_pf_er_id FROM salary_components WHERE component_code = 'PF_ER' AND organization_id = v_org_id;
  SELECT id INTO v_sc_pt_id FROM salary_components WHERE component_code = 'PT' AND organization_id = v_org_id;
  SELECT id INTO v_sc_tds_id FROM salary_components WHERE component_code = 'TDS' AND organization_id = v_org_id;

  -- ============================================
  -- SALARY STRUCTURE
  -- ============================================
  INSERT INTO salary_structures (id, organization_id, structure_name, structure_code, description, is_default, is_active)
  VALUES (gen_random_uuid(), v_org_id, 'Standard CTC', 'STD_CTC', 'Standard salary structure for all employees', true, true)
  ON CONFLICT (organization_id, structure_name) DO NOTHING;

  SELECT id INTO v_ss_id FROM salary_structures WHERE structure_code = 'STD_CTC' AND organization_id = v_org_id;

  INSERT INTO salary_structure_components (salary_structure_id, salary_component_id, calculation_type, default_value, display_order, is_active)
  VALUES
    (v_ss_id, v_sc_basic_id, 'percentage_of_gross', 40, 1, true),
    (v_ss_id, v_sc_hra_id, 'percentage_of_basic', 50, 2, true),
    (v_ss_id, v_sc_da_id, 'percentage_of_basic', 10, 3, true),
    (v_ss_id, v_sc_special_id, 'flat', 0, 4, true),
    (v_ss_id, v_sc_pf_emp_id, 'percentage_of_basic', 12, 10, true),
    (v_ss_id, v_sc_pt_id, 'flat', 200, 12, true)
  ON CONFLICT (salary_structure_id, salary_component_id) DO NOTHING;

  -- ============================================
  -- EMPLOYEE COMPENSATIONS (CTC assignments)
  -- ============================================
  -- Different CTCs per employee
  INSERT INTO employee_compensation (id, organization_id, employee_id, salary_structure_id, annual_ctc, monthly_gross, effective_from, is_current, created_by)
  VALUES
    (gen_random_uuid(), v_org_id, v_emp1_id, v_ss_id, 2400000, 200000, '2023-04-01', true, v_emp1_id),
    (gen_random_uuid(), v_org_id, v_emp2_id, v_ss_id, 1500000, 125000, '2024-01-15', true, v_emp1_id),
    (gen_random_uuid(), v_org_id, v_emp3_id, v_ss_id, 900000, 75000, '2024-06-01', true, v_emp1_id),
    (gen_random_uuid(), v_org_id, v_emp4_id, v_ss_id, 1000000, 83333, '2023-09-01', true, v_emp1_id),
    (gen_random_uuid(), v_org_id, v_emp5_id, v_ss_id, 800000, 66667, '2025-01-10', true, v_emp1_id),
    (gen_random_uuid(), v_org_id, v_emp6_id, v_ss_id, 1200000, 100000, '2024-03-15', true, v_emp1_id),
    (gen_random_uuid(), v_org_id, v_emp7_id, v_ss_id, 1800000, 150000, '2023-06-01', true, v_emp1_id),
    (gen_random_uuid(), v_org_id, v_emp8_id, v_ss_id, 1400000, 116667, '2024-02-01', true, v_emp1_id),
    (gen_random_uuid(), v_org_id, v_emp9_id, v_ss_id, 700000, 58333, '2025-02-15', true, v_emp1_id),
    (gen_random_uuid(), v_org_id, v_emp10_id, v_ss_id, 1100000, 91667, '2024-08-01', true, v_emp1_id)
  ON CONFLICT DO NOTHING;

  -- Compensation components for each employee
  INSERT INTO employee_compensation_components (employee_compensation_id, salary_component_id, monthly_amount, annual_amount, calculation_type, calculation_value)
  SELECT ec.id, v_sc_basic_id, ROUND(ec.monthly_gross * 0.40, 2), ROUND(ec.annual_ctc * 0.40, 2), 'percentage_of_gross', 40
  FROM employee_compensation ec WHERE ec.organization_id = v_org_id AND ec.is_current = true
  ON CONFLICT (employee_compensation_id, salary_component_id) DO NOTHING;

  INSERT INTO employee_compensation_components (employee_compensation_id, salary_component_id, monthly_amount, annual_amount, calculation_type, calculation_value)
  SELECT ec.id, v_sc_hra_id, ROUND(ec.monthly_gross * 0.40 * 0.50, 2), ROUND(ec.annual_ctc * 0.40 * 0.50, 2), 'percentage_of_basic', 50
  FROM employee_compensation ec WHERE ec.organization_id = v_org_id AND ec.is_current = true
  ON CONFLICT (employee_compensation_id, salary_component_id) DO NOTHING;

  INSERT INTO employee_compensation_components (employee_compensation_id, salary_component_id, monthly_amount, annual_amount, calculation_type, calculation_value)
  SELECT ec.id, v_sc_da_id, ROUND(ec.monthly_gross * 0.40 * 0.10, 2), ROUND(ec.annual_ctc * 0.40 * 0.10, 2), 'percentage_of_basic', 10
  FROM employee_compensation ec WHERE ec.organization_id = v_org_id AND ec.is_current = true
  ON CONFLICT (employee_compensation_id, salary_component_id) DO NOTHING;

  -- Special allowance = gross - basic - hra - da
  INSERT INTO employee_compensation_components (employee_compensation_id, salary_component_id, monthly_amount, annual_amount, calculation_type, calculation_value)
  SELECT ec.id, v_sc_special_id,
    ROUND(ec.monthly_gross - (ec.monthly_gross*0.40) - (ec.monthly_gross*0.40*0.50) - (ec.monthly_gross*0.40*0.10), 2),
    ROUND(ec.annual_ctc - (ec.annual_ctc*0.40) - (ec.annual_ctc*0.40*0.50) - (ec.annual_ctc*0.40*0.10), 2),
    'flat', 0
  FROM employee_compensation ec WHERE ec.organization_id = v_org_id AND ec.is_current = true
  ON CONFLICT (employee_compensation_id, salary_component_id) DO NOTHING;

  -- ============================================
  -- PAYROLL CYCLES & RUNS (Feb + Mar 2026)
  -- ============================================
  INSERT INTO payroll_cycles (id, organization_id, cycle_name, payroll_month, payroll_year, start_date, end_date, processing_status, created_by)
  VALUES
    (gen_random_uuid(), v_org_id, 'February 2026', 2, 2026, '2026-02-01', '2026-02-28', 'paid', v_emp1_id),
    (gen_random_uuid(), v_org_id, 'March 2026', 3, 2026, '2026-03-01', '2026-03-31', 'computed', v_emp1_id)
  ON CONFLICT (organization_id, payroll_month, payroll_year) DO NOTHING;

  SELECT id INTO v_pc_feb_id FROM payroll_cycles WHERE payroll_month = 2 AND payroll_year = 2026 AND organization_id = v_org_id;
  SELECT id INTO v_pc_mar_id FROM payroll_cycles WHERE payroll_month = 3 AND payroll_year = 2026 AND organization_id = v_org_id;

  -- Payroll runs
  INSERT INTO payroll_runs (id, organization_id, payroll_cycle_id, run_number, run_type, run_status, total_employees, total_gross, total_deductions, total_net_pay, processed_by, processed_at)
  VALUES
    (gen_random_uuid(), v_org_id, v_pc_feb_id, 1, 'regular', 'completed', 10, 1066667, 140000, 926667, v_emp1_id, '2026-02-28'),
    (gen_random_uuid(), v_org_id, v_pc_mar_id, 1, 'regular', 'completed', 10, 1066667, 140000, 926667, v_emp1_id, '2026-03-19')
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_pr_feb_id FROM payroll_runs WHERE payroll_cycle_id = v_pc_feb_id AND organization_id = v_org_id LIMIT 1;
  SELECT id INTO v_pr_mar_id FROM payroll_runs WHERE payroll_cycle_id = v_pc_mar_id AND organization_id = v_org_id LIMIT 1;

  -- Payroll run employees for Feb
  INSERT INTO payroll_run_employees (organization_id, payroll_run_id, employee_id, employee_compensation_id, gross_earnings, total_deductions, net_pay, total_employer_contributions, working_days, present_days, lop_days, payroll_status)
  SELECT v_org_id, v_pr_feb_id, ec.employee_id, ec.id,
    ec.monthly_gross,
    ROUND(ec.monthly_gross * 0.40 * 0.12 + 200, 2), -- PF + PT
    ROUND(ec.monthly_gross - (ec.monthly_gross * 0.40 * 0.12 + 200), 2),
    ROUND(ec.monthly_gross * 0.40 * 0.12, 2), -- Employer PF
    20, 20, 0, 'paid'
  FROM employee_compensation ec
  WHERE ec.organization_id = v_org_id AND ec.is_current = true
  ON CONFLICT (payroll_run_id, employee_id) DO NOTHING;

  -- Payroll run employees for Mar
  INSERT INTO payroll_run_employees (organization_id, payroll_run_id, employee_id, employee_compensation_id, gross_earnings, total_deductions, net_pay, total_employer_contributions, working_days, present_days, lop_days, payroll_status)
  SELECT v_org_id, v_pr_mar_id, ec.employee_id, ec.id,
    ec.monthly_gross,
    ROUND(ec.monthly_gross * 0.40 * 0.12 + 200, 2),
    ROUND(ec.monthly_gross - (ec.monthly_gross * 0.40 * 0.12 + 200), 2),
    ROUND(ec.monthly_gross * 0.40 * 0.12, 2),
    22, 21, 0, 'computed'
  FROM employee_compensation ec
  WHERE ec.organization_id = v_org_id AND ec.is_current = true
  ON CONFLICT (payroll_run_id, employee_id) DO NOTHING;

  -- Payslips for Feb (paid)
  INSERT INTO payslips (organization_id, payroll_run_employee_id, employee_id, payslip_number, payroll_month, payroll_year, gross_earnings, total_deductions, net_pay, generated_on, published_flag, published_at)
  SELECT v_org_id, pre.id, pre.employee_id,
    'PS-202602-' || LPAD(ROW_NUMBER() OVER (ORDER BY pre.employee_id)::text, 4, '0'),
    2, 2026, pre.gross_earnings, pre.total_deductions, pre.net_pay, '2026-02-28', true, '2026-02-28'
  FROM payroll_run_employees pre WHERE pre.payroll_run_id = v_pr_feb_id
  ON CONFLICT (payroll_run_employee_id) DO NOTHING;

  -- ============================================
  -- PERFORMANCE CYCLE & GOALS
  -- ============================================
  INSERT INTO performance_cycles (id, organization_id, cycle_name, cycle_code, cycle_type, start_date, end_date, goal_setting_deadline, self_review_deadline, manager_review_deadline, status, created_by)
  VALUES (gen_random_uuid(), v_org_id, 'FY 2025-26 Annual Review', 'FY2526-ANNUAL', 'annual', '2025-04-01', '2026-03-31', '2025-05-15', '2026-03-20', '2026-04-10', 'active', v_emp1_id)
  ON CONFLICT (organization_id, cycle_code) DO NOTHING;

  SELECT id INTO v_perf_cycle_id FROM performance_cycles WHERE cycle_code = 'FY2526-ANNUAL' AND organization_id = v_org_id;

  -- Goals for a few employees
  INSERT INTO employee_goals (organization_id, employee_id, performance_cycle_id, goal_title, goal_description, category, weightage, target_value, current_value, unit, status, start_date, due_date)
  VALUES
    (v_org_id, v_emp2_id, v_perf_cycle_id, 'Deliver authentication module', 'Build OAuth2 + JWT auth for the platform', 'individual', 30, 100, 75, 'percentage', 'on_track', '2025-04-01', '2026-03-31'),
    (v_org_id, v_emp2_id, v_perf_cycle_id, 'Reduce API latency by 20%', 'Optimize database queries and add caching', 'individual', 25, 20, 12, 'percentage', 'in_progress', '2025-04-01', '2026-03-31'),
    (v_org_id, v_emp2_id, v_perf_cycle_id, 'Mentor 2 junior developers', 'Conduct weekly 1:1s and code reviews', 'team', 20, 2, 1, 'number', 'in_progress', '2025-04-01', '2026-03-31'),
    (v_org_id, v_emp3_id, v_perf_cycle_id, 'Complete React advanced training', 'Pass certification with 80%+ score', 'individual', 30, 80, 65, 'percentage', 'in_progress', '2025-04-01', '2026-03-31'),
    (v_org_id, v_emp3_id, v_perf_cycle_id, 'Ship 5 feature PRs', 'Deliver 5 production-ready features', 'individual', 40, 5, 3, 'number', 'on_track', '2025-04-01', '2026-03-31'),
    (v_org_id, v_emp7_id, v_perf_cycle_id, 'Team velocity improvement', 'Increase sprint velocity by 15%', 'team', 35, 15, 10, 'percentage', 'on_track', '2025-04-01', '2026-03-31'),
    (v_org_id, v_emp7_id, v_perf_cycle_id, 'Zero critical bugs in production', 'Maintain quality standards', 'individual', 30, 0, 1, 'number', 'at_risk', '2025-04-01', '2026-03-31')
  ON CONFLICT DO NOTHING;

  -- Review competencies
  INSERT INTO review_competencies (organization_id, competency_name, competency_code, description, category, is_active, display_order)
  VALUES
    (v_org_id, 'Problem Solving', 'PROB_SOLVE', 'Ability to analyze and solve complex problems', 'core', true, 1),
    (v_org_id, 'Communication', 'COMM', 'Clear and effective communication skills', 'core', true, 2),
    (v_org_id, 'Teamwork', 'TEAM', 'Collaboration and team spirit', 'core', true, 3),
    (v_org_id, 'Technical Skills', 'TECH', 'Domain-specific technical expertise', 'functional', true, 4),
    (v_org_id, 'Leadership', 'LEAD', 'Ability to lead and inspire others', 'leadership', true, 5),
    (v_org_id, 'Innovation', 'INNOV', 'Creative thinking and new ideas', 'core', true, 6)
  ON CONFLICT (organization_id, competency_code) DO NOTHING;

  -- ============================================
  -- RECRUITMENT
  -- ============================================
  INSERT INTO interview_stages (id, organization_id, stage_name, stage_order, is_active)
  VALUES
    (gen_random_uuid(), v_org_id, 'Phone Screen', 1, true),
    (gen_random_uuid(), v_org_id, 'Technical Round', 2, true),
    (gen_random_uuid(), v_org_id, 'HR Round', 3, true),
    (gen_random_uuid(), v_org_id, 'Final Round', 4, true)
  ON CONFLICT (organization_id, stage_name) DO NOTHING;

  SELECT id INTO v_stage1_id FROM interview_stages WHERE stage_name = 'Phone Screen' AND organization_id = v_org_id;
  SELECT id INTO v_stage2_id FROM interview_stages WHERE stage_name = 'Technical Round' AND organization_id = v_org_id;
  SELECT id INTO v_stage3_id FROM interview_stages WHERE stage_name = 'HR Round' AND organization_id = v_org_id;

  INSERT INTO job_requisitions (id, organization_id, requisition_code, title, department_id, hiring_manager_id, employment_type, headcount, description, requirements, status, created_by)
  VALUES
    (gen_random_uuid(), v_org_id, 'REQ-2026-001', 'Full Stack Developer', v_dept_eng_id, v_emp1_id, 'full_time', 2, 'Looking for experienced full-stack developers to join our product team.', 'React, Node.js, PostgreSQL, 3+ years experience', 'open', v_emp1_id),
    (gen_random_uuid(), v_org_id, 'REQ-2026-002', 'UI/UX Designer', v_dept_eng_id, v_emp7_id, 'full_time', 1, 'Creative designer for our product team.', 'Figma, Design Systems, 2+ years', 'open', v_emp1_id),
    (gen_random_uuid(), v_org_id, 'REQ-2026-003', 'HR Business Partner', v_dept_hr_id, v_emp1_id, 'full_time', 1, 'Experienced HRBP for growing team.', 'MBA HR, 4+ years in HRBP role', 'open', v_emp1_id)
  ON CONFLICT (organization_id, requisition_code) DO NOTHING;

  SELECT id INTO v_req_id FROM job_requisitions WHERE requisition_code = 'REQ-2026-001' AND organization_id = v_org_id;

  INSERT INTO candidates (organization_id, first_name, last_name, email, phone, current_company, current_designation, experience_years, source)
  VALUES
    (v_org_id, 'Ravi', 'Teja', 'ravi.teja@gmail.com', '+91-9988776655', 'Infosys', 'Senior Developer', 4.5, 'linkedin'),
    (v_org_id, 'Pooja', 'Nair', 'pooja.nair@gmail.com', '+91-9988776656', 'TCS', 'Full Stack Developer', 3, 'job_portal'),
    (v_org_id, 'Arun', 'Verma', 'arun.verma@gmail.com', '+91-9988776657', 'Wipro', 'Software Engineer', 5, 'referral'),
    (v_org_id, 'Meera', 'Joshi', 'meera.joshi@gmail.com', '+91-9988776658', 'Cognizant', 'React Developer', 3.5, 'linkedin')
  ON CONFLICT (organization_id, email) DO NOTHING;

  -- Applications for candidates
  INSERT INTO candidate_applications (organization_id, candidate_id, job_requisition_id, current_stage_id, status, applied_date)
  SELECT v_org_id, c.id, v_req_id,
    CASE WHEN c.first_name = 'Ravi' THEN v_stage2_id
         WHEN c.first_name = 'Pooja' THEN v_stage3_id
         WHEN c.first_name = 'Arun' THEN v_stage1_id
         ELSE v_stage1_id END,
    CASE WHEN c.first_name = 'Ravi' THEN 'in_progress'
         WHEN c.first_name = 'Pooja' THEN 'in_progress'
         WHEN c.first_name = 'Arun' THEN 'screening'
         ELSE 'new' END,
    CURRENT_DATE - (random() * 14)::int
  FROM candidates c WHERE c.organization_id = v_org_id
  ON CONFLICT (candidate_id, job_requisition_id) DO NOTHING;

  -- ============================================
  -- TRAINING / LEARNING
  -- ============================================
  INSERT INTO course_categories (organization_id, category_name, description, is_active)
  VALUES
    (v_org_id, 'Technical', 'Programming and tech skills', true),
    (v_org_id, 'Soft Skills', 'Communication and leadership', true),
    (v_org_id, 'Compliance', 'Mandatory compliance training', true)
  ON CONFLICT (organization_id, category_name) DO NOTHING;

  INSERT INTO training_courses (organization_id, course_code, course_name, description, category_id, mode, duration_hours, instructor_name, max_participants, status, is_mandatory, created_by)
  SELECT v_org_id, cc.code, cc.cname, cc.cdesc, cat.id, cc.cmode, cc.hours, cc.instructor, cc.max_p, 'published', cc.mandatory, v_emp1_id
  FROM (VALUES
    ('CRS-001', 'React Advanced Patterns', 'Deep dive into React hooks, performance, and architecture', 'Technical', 'online', 16, 'Karan Mehta', 30, false),
    ('CRS-002', 'Effective Communication', 'Build better communication skills for workplace', 'Soft Skills', 'classroom', 8, 'External Trainer', 20, false),
    ('CRS-003', 'Data Privacy & Security', 'GDPR, data handling, and security best practices', 'Compliance', 'online', 4, 'Priya Patel', 50, true)
  ) AS cc(code, cname, cdesc, cat_name, cmode, hours, instructor, max_p, mandatory)
  JOIN course_categories cat ON cat.category_name = cc.cat_name AND cat.organization_id = v_org_id
  ON CONFLICT (organization_id, course_code) DO NOTHING;

  -- ============================================
  -- ANNOUNCEMENTS (demo)
  -- ============================================
  INSERT INTO announcements (organization_id, title, content, priority, audience_type, audience_roles, audience_department_ids, is_pinned, is_active, created_by, published_at)
  VALUES
    (v_org_id, 'Office Closed on Holi', 'The office will remain closed on March 4th (Wednesday) for Holi. Wishing everyone a colorful celebration!', 'normal', 'all', '{}', '{}', false, true, v_profile_id, '2026-03-01'),
    (v_org_id, 'Q4 Town Hall - March 25', 'Please join us for the quarterly town hall meeting on March 25th at 3 PM IST. We will discuss company performance and upcoming plans.', 'high', 'all', '{}', '{}', true, true, v_profile_id, '2026-03-15'),
    (v_org_id, 'New Health Insurance Policy', 'We have upgraded our health insurance coverage. Employees can now claim up to 5L per annum. Check the HR portal for details.', 'urgent', 'all', '{}', '{}', true, true, v_profile_id, '2026-03-10'),
    (v_org_id, 'Engineering Sprint Planning', 'Sprint planning for Sprint 24 is scheduled for Monday 10 AM. All engineers please prepare your backlog items.', 'normal', 'departments', '{}', ARRAY[v_dept_eng_id], false, true, v_profile_id, '2026-03-17'),
    (v_org_id, 'Payroll Processing Update', 'March payroll has been computed. Final approval pending. Expected disbursement by March 28.', 'normal', 'roles', ARRAY['payroll_admin', 'leadership']::text[], '{}', false, true, v_profile_id, '2026-03-19')
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- BANK ACCOUNTS (for payroll testing)
  -- ============================================
  INSERT INTO employee_bank_accounts (organization_id, employee_id, bank_name, branch_name, account_number, ifsc_code, account_type, is_salary_account, verification_status)
  SELECT v_org_id, e.id,
    CASE (random()*2)::int WHEN 0 THEN 'ICICI Bank' WHEN 1 THEN 'HDFC Bank' ELSE 'SBI' END,
    'Mumbai Main',
    LPAD((random()*999999999999)::bigint::text, 12, '0'),
    CASE (random()*2)::int WHEN 0 THEN 'ICIC0001234' WHEN 1 THEN 'HDFC0002345' ELSE 'SBIN0003456' END,
    'savings', true, 'verified'
  FROM employees e
  WHERE e.organization_id = v_org_id AND e.status = 'active'
    AND NOT EXISTS (SELECT 1 FROM employee_bank_accounts ba WHERE ba.employee_id = e.id)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Demo data seeded successfully! Org: %, Employees: 10', v_org_id;
END $$;

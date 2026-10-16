-- QA-20: the statutory calculations were dead code, and two deductions were missing.
--
-- computeEmployeePayroll only calculates PF, ESI, professional tax and the
-- rest when a component carries a `statutory_type`:
--
--     if (comp.is_statutory && comp.statutory_type) { ...calculate... }
--
-- Every statutory component had `statutory_type` NULL. The condition never
-- held, so nothing was ever calculated — PF, PT and TDS all fell through to
-- whatever flat `monthly_amount` had been typed onto the component. The 12%,
-- the 15,000 cap and the ESI threshold were all unreachable.
--
-- Filling the field in makes the existing calculation work. Nothing in the
-- application changes shape; the code was always ready for this.
--
-- Two components are also added, both required and both absent:
--
--   * Labour Welfare Fund. Karnataka takes it once a year, in December, and
--     August's people are all in Karnataka. 150 per employee.
--   * ESI, employee and employer. Statutory for anybody earning 21,000 or
--     less a month. Nobody in the demo data is under that, but a real joiner
--     could be, and without the component the deduction simply would not
--     happen.
--
-- Karnataka professional tax is now a threshold rather than a flat charge:
-- nil below 25,000 a month, 200 at or above. That lives in the application,
-- next to the rest of the arithmetic.

CREATE OR REPLACE FUNCTION seed_statutory_components(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Tell the calculator what each existing component actually is.
  UPDATE salary_components SET statutory_type = 'pf_employee'
   WHERE organization_id = p_org_id AND component_code = 'PF_EMP' AND statutory_type IS NULL;
  UPDATE salary_components SET statutory_type = 'pf_employer'
   WHERE organization_id = p_org_id AND component_code = 'PF_ER' AND statutory_type IS NULL;
  UPDATE salary_components SET statutory_type = 'pt'
   WHERE organization_id = p_org_id AND component_code = 'PT' AND statutory_type IS NULL;
  UPDATE salary_components SET statutory_type = 'tds'
   WHERE organization_id = p_org_id AND component_code = 'TDS' AND statutory_type IS NULL;

  -- Labour Welfare Fund — Karnataka, December only. The amount is applied by
  -- the calculator, which knows which month is being run; the flat default
  -- here is only what the screen shows when nobody has run anything yet.
  INSERT INTO salary_components
    (organization_id, component_name, component_code, component_type, category,
     is_taxable, is_statutory, statutory_type, calculation_type, default_value,
     description, display_order, is_active)
  SELECT p_org_id, 'Labour Welfare Fund', 'LWF', 'deduction', 'statutory',
         false, true, 'lwf', 'flat', 150,
         'Karnataka labour welfare fund. Taken once a year, in December.', 14, true
  WHERE NOT EXISTS (
    SELECT 1 FROM salary_components
    WHERE organization_id = p_org_id AND component_code = 'LWF'
  );

  -- ESI, both sides. Charged only while monthly gross is 21,000 or less; the
  -- calculator drops the line above that, so it costs nothing to have here.
  INSERT INTO salary_components
    (organization_id, component_name, component_code, component_type, category,
     is_taxable, is_statutory, statutory_type, calculation_type, default_value,
     description, display_order, is_active)
  SELECT p_org_id, 'ESI Employee', 'ESI_EMP', 'deduction', 'statutory',
         false, true, 'esi_employee', 'percentage_of_gross', 0.75,
         'Employee state insurance. Applies while monthly gross is 21,000 or less.', 15, true
  WHERE NOT EXISTS (
    SELECT 1 FROM salary_components
    WHERE organization_id = p_org_id AND component_code = 'ESI_EMP'
  );

  INSERT INTO salary_components
    (organization_id, component_name, component_code, component_type, category,
     is_taxable, is_statutory, statutory_type, calculation_type, default_value,
     description, display_order, is_active)
  SELECT p_org_id, 'ESI Employer', 'ESI_ER', 'employer_contribution', 'statutory',
         false, true, 'esi_employer', 'percentage_of_gross', 3.25,
         'Employer share of employee state insurance.', 16, true
  WHERE NOT EXISTS (
    SELECT 1 FROM salary_components
    WHERE organization_id = p_org_id AND component_code = 'ESI_ER'
  );
END $$;

REVOKE ALL ON FUNCTION public.seed_statutory_components(UUID) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION seed_statutory_components(UUID) IS
  'Marks statutory components with their type so the calculator works, and adds LWF and ESI. Never overwrites a type already set.';

-- New organisations get them without anyone having to remember.
CREATE OR REPLACE FUNCTION seed_statutory_components_for_new_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM seed_statutory_components(NEW.id);
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.seed_statutory_components_for_new_org() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_seed_statutory_components ON organizations;
CREATE TRIGGER trg_seed_statutory_components
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION seed_statutory_components_for_new_org();

DO $$
DECLARE
  v_org UUID;
BEGIN
  FOR v_org IN SELECT id FROM organizations LOOP
    PERFORM seed_statutory_components(v_org);
  END LOOP;
END $$;

-- The labour welfare fund deduction was the employer's share as well as the
-- employee's, all taken off the employee.
--
-- Karnataka's annual contribution is 50 from the employee and 100 from the
-- employer, 150 between them. Pulse had 150 as the employee's deduction —
-- the combined figure, applied to one side. Every employee lost an extra 100
-- a year, and the employer's own share was never recorded at all, so it was
-- missing from cost to company and from anything built on it.
--
-- Checked against the Karnataka Labour Welfare Board's published rates, which
-- the 2025 amendment (in force 7 January 2026) left unchanged; the amendment
-- altered the coverage threshold, not the amounts. The Board revises these
-- from time to time, so the figure is worth confirming each December.
--
-- The employee component drops to 50 and the employer's 100 is added as its
-- own contribution line, beside PF and ESI which are already modelled that
-- way.

CREATE OR REPLACE FUNCTION seed_lwf_components(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- The employee's own share, corrected.
  UPDATE salary_components
  SET default_value = 50,
      description = 'Karnataka labour welfare fund, the employee''s share. Taken once a year, in December.'
  WHERE organization_id = p_org_id
    AND component_code = 'LWF'
    AND default_value IS DISTINCT FROM 50;

  -- The employer's share, which was not recorded anywhere.
  INSERT INTO salary_components
    (organization_id, component_name, component_code, component_type, category,
     is_taxable, is_statutory, statutory_type, calculation_type, default_value,
     description, display_order, is_active)
  SELECT p_org_id, 'Labour Welfare Fund (Employer)', 'LWF_ER', 'employer_contribution', 'statutory',
         false, true, 'lwf_employer', 'flat', 100,
         'Karnataka labour welfare fund, the employer''s share. Paid once a year, in December. Not deducted from the employee.',
         17, true
  WHERE NOT EXISTS (
    SELECT 1 FROM salary_components
    WHERE organization_id = p_org_id AND component_code = 'LWF_ER'
  );
END $$;

REVOKE ALL ON FUNCTION public.seed_lwf_components(UUID) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION seed_lwf_components(UUID) IS
  'Corrects the LWF employee share to 50 and adds the employer share of 100 as its own contribution line.';

CREATE OR REPLACE FUNCTION seed_lwf_components_for_new_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM seed_lwf_components(NEW.id);
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.seed_lwf_components_for_new_org() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_seed_lwf_components ON organizations;
CREATE TRIGGER trg_seed_lwf_components
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION seed_lwf_components_for_new_org();

DO $$
DECLARE
  v_org UUID;
BEGIN
  FOR v_org IN SELECT id FROM organizations LOOP
    PERFORM seed_lwf_components(v_org);
  END LOOP;
END $$;

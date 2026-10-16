-- Provident fund does not apply to a contractor or an intern, and a
-- contractor is paid under deduction of tax at 10% under tax code 1027.
--
-- Two rules from the business, both of which change what comes out of
-- somebody's payment every month.
--
-- 1. Provident fund. Neither a contractor nor an intern is on the rolls as an
--    employee, so there is no EPF membership to contribute to. Before this,
--    QA-23 applied provident fund to everybody with current compensation,
--    which was right for staff and wrong for these two.
--
-- 2. Contractor TDS. A contractor raises an invoice rather than drawing a
--    salary, so tax is deducted at source instead — 10% of the payment, under
--    tax code 1027. It is taken on the whole payment: there is no basic and
--    no exempt portion to carve out.
--
-- The rate and the exempt engagement types live in `src/lib/constants.ts`
-- with the rest of the statutory figures, so they are changed in one place.
--
-- `tax_code` is added to salary_components because the code has to reach the
-- payslip and the quarterly return. Storing it on the component rather than
-- on each deduction keeps it in one place and keeps it correct for every run.

ALTER TABLE salary_components ADD COLUMN IF NOT EXISTS tax_code TEXT;

COMMENT ON COLUMN salary_components.tax_code IS
  'Income tax section code reported against this deduction, for example 1027 for contractor TDS. Null where no code applies.';

CREATE OR REPLACE FUNCTION seed_contractor_tds_component(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO salary_components
    (organization_id, component_name, component_code, component_type, category,
     is_taxable, is_statutory, statutory_type, calculation_type, default_value,
     tax_code, description, display_order, is_active)
  SELECT p_org_id, 'Contractor TDS', 'TDS_CONTRACTOR', 'deduction', 'statutory',
         false, true, 'tds_contractor', 'percentage_of_gross', 10,
         '1027',
         'Tax deducted at source on a contractor''s payment. 10% of the payment, under tax code 1027. Applied only to an employment type of contract.',
         17, true
  WHERE NOT EXISTS (
    SELECT 1 FROM salary_components
    WHERE organization_id = p_org_id AND component_code = 'TDS_CONTRACTOR'
  );

  -- Existing row, if the component was added by hand before this migration.
  UPDATE salary_components
  SET tax_code = '1027', statutory_type = 'tds_contractor'
  WHERE organization_id = p_org_id
    AND component_code = 'TDS_CONTRACTOR'
    AND (tax_code IS DISTINCT FROM '1027' OR statutory_type IS DISTINCT FROM 'tds_contractor');
END $$;

REVOKE ALL ON FUNCTION public.seed_contractor_tds_component(UUID) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION seed_contractor_tds_component(UUID) IS
  'Adds the Contractor TDS component, 10% under tax code 1027. The calculator applies it only to a contractor.';

-- New organisations get it without anyone having to remember.
CREATE OR REPLACE FUNCTION seed_contractor_tds_for_new_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM seed_contractor_tds_component(NEW.id);
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.seed_contractor_tds_for_new_org() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_seed_contractor_tds ON organizations;
CREATE TRIGGER trg_seed_contractor_tds
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION seed_contractor_tds_for_new_org();

DO $$
DECLARE
  v_org UUID;
BEGIN
  FOR v_org IN SELECT id FROM organizations LOOP
    PERFORM seed_contractor_tds_component(v_org);
  END LOOP;
END $$;

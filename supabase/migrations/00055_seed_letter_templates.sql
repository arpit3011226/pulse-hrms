-- The letters an HR team is asked for every week, ready to use.
--
-- The templates screen worked, but every organisation started with nothing in
-- it. The first time somebody asked for a salary certificate, HR had to write
-- one from a blank box — which is how you end up with five different versions
-- of the same letter, each worded slightly differently.
--
-- These are the ones people actually ask for in an Indian services company.
-- Plain English, short, and safe to hand over without editing. HR can change
-- any of them, switch one off, or add their own from Self Service → Templates.
--
-- The body is only the letter itself. The letterhead, the date, the title, the
-- signature and the footer are drawn by the PDF, so repeating them here would
-- print them twice.
--
-- Two deliberate gaps. An offer letter is produced by the recruitment module
-- against the actual offer, and a termination letter should be written with
-- whatever legal advice applies to the case, not filled in from a template.

CREATE OR REPLACE FUNCTION seed_letter_templates(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only ever fills an empty set, so it is safe to run again and never
  -- overwrites what HR has changed.
  IF EXISTS (SELECT 1 FROM letter_templates WHERE organization_id = p_org_id) THEN
    RETURN;
  END IF;

  INSERT INTO letter_templates
    (organization_id, name, category, description, body_html, approval_type, is_active)
  VALUES
    -- ── Asked for most often, and issued without anyone approving ──────────

    (p_org_id, 'Experience Letter', 'experience_letter',
     'Confirms how long someone worked here and in what role.',
     '<p>To Whomsoever It May Concern</p>' ||
     '<p>This is to certify that {{employee_name}} (Employee Code: {{employee_code}}) ' ||
     'worked with {{company_name}} from {{date_of_joining}} to {{date_of_leaving}}.</p>' ||
     '<p>At the time of leaving, {{employee_name}} was working as {{designation}} in the ' ||
     '{{department}} department.</p>' ||
     '<p>During this period we found them sincere, hard working and professional in their ' ||
     'conduct. We wish them well in what they do next.</p>' ||
     '<p>This letter is issued on request.</p>',
     'auto', true),

    (p_org_id, 'Salary Certificate', 'salary_certificate',
     'States current pay. Usually asked for by a bank or a landlord.',
     '<p>To Whomsoever It May Concern</p>' ||
     '<p>This is to certify that {{employee_name}} (Employee Code: {{employee_code}}) is ' ||
     'working with {{company_name}} as {{designation}} in the {{department}} department ' ||
     'since {{date_of_joining}}.</p>' ||
     '<p>Their present annual cost to company is {{salary}}.</p>' ||
     '<p>This certificate is issued on request for whatever purpose it is needed, and it ' ||
     'does not create any liability on the company.</p>',
     'auto', true),

    (p_org_id, 'Address Proof Letter', 'address_proof',
     'Confirms the address we hold on record. Used for KYC and police verification.',
     '<p>To Whomsoever It May Concern</p>' ||
     '<p>This is to certify that {{employee_name}} (Employee Code: {{employee_code}}) is ' ||
     'working with {{company_name}} as {{designation}} since {{date_of_joining}}.</p>' ||
     '<p>As per our records, their present address is:</p>' ||
     '<p>{{current_address}}</p>' ||
     '<p>This letter is issued on request for address verification.</p>',
     'auto', true),

    (p_org_id, 'Bonafide Certificate', 'bonafide_certificate',
     'Simple proof that someone is on our rolls.',
     '<p>To Whomsoever It May Concern</p>' ||
     '<p>This is to certify that {{employee_name}} (Employee Code: {{employee_code}}) is a ' ||
     'bonafide employee of {{company_name}}.</p>' ||
     '<p>They joined us on {{date_of_joining}} and are presently working as {{designation}} ' ||
     'in the {{department}} department.</p>' ||
     '<p>This certificate is issued on request.</p>',
     'auto', true),

    -- ── Need someone to approve them ───────────────────────────────────────

    (p_org_id, 'Relieving Letter', 'relieving_letter',
     'Issued after the last working day, once the handover is complete.',
     '<p>Dear {{employee_name}},</p>' ||
     '<p>This is with reference to your resignation from the post of {{designation}} in the ' ||
     '{{department}} department.</p>' ||
     '<p>We confirm that you have been relieved from the services of {{company_name}} at the ' ||
     'close of working hours on {{date_of_leaving}}. Your employment with us started on ' ||
     '{{date_of_joining}}.</p>' ||
     '<p>We confirm that you have handed over the charge of your work and settled all dues ' ||
     'with the company.</p>' ||
     '<p>We thank you for your service and wish you the best for the future.</p>',
     'approval_required', true),

    (p_org_id, 'No Objection Certificate', 'noc',
     'Says the company has no objection — for a visa, higher studies or a second job.',
     '<p>To Whomsoever It May Concern</p>' ||
     '<p>This is to certify that {{employee_name}} (Employee Code: {{employee_code}}) has been ' ||
     'working with {{company_name}} as {{designation}} since {{date_of_joining}}.</p>' ||
     '<p>The company has no objection to their application, and we confirm that their leave ' ||
     'for this purpose has been approved.</p>' ||
     '<p>Their position with the company remains unchanged.</p>' ||
     '<p>This certificate is issued on request.</p>',
     'approval_required', true),

    (p_org_id, 'Reference Letter', 'reference_letter',
     'A short word about someone''s work, for a prospective employer.',
     '<p>To Whomsoever It May Concern</p>' ||
     '<p>I am pleased to write this letter for {{employee_name}}, who worked with ' ||
     '{{company_name}} as {{designation}} in the {{department}} department from ' ||
     '{{date_of_joining}} to {{date_of_leaving}}.</p>' ||
     '<p>During this time they handled their work with care and worked well with the people ' ||
     'around them. They were dependable, took feedback well, and saw their commitments ' ||
     'through.</p>' ||
     '<p>I am happy to recommend them, and would be glad to answer any question about their ' ||
     'work here.</p>',
     'approval_required', true),

    -- ── HR issues these; an employee cannot request one ────────────────────

    (p_org_id, 'Appointment Letter', 'appointment_letter',
     'Confirms the appointment and its main terms on joining.',
     '<p>Dear {{employee_name}},</p>' ||
     '<p>We are happy to appoint you as {{designation}} in the {{department}} department at ' ||
     '{{company_name}}, with effect from {{date_of_joining}}.</p>' ||
     '<p>Your annual cost to company is {{salary}}. The breakup of your pay, and the ' ||
     'deductions that apply, are as set out in your salary structure.</p>' ||
     '<p>Your employee code is {{employee_code}}. You will be governed by the policies of the ' ||
     'company as they stand from time to time, including those on working hours, leave, ' ||
     'confidentiality and notice period.</p>' ||
     '<p>Please sign and return a copy of this letter as your acceptance.</p>' ||
     '<p>We look forward to working with you.</p>',
     'hr_only', true),

    (p_org_id, 'Confirmation Letter', 'confirmation_letter',
     'Confirms someone in their role at the end of probation.',
     '<p>Dear {{employee_name}},</p>' ||
     '<p>We are pleased to inform you that you have successfully completed your probation ' ||
     'period with {{company_name}}.</p>' ||
     '<p>Your services are confirmed as {{designation}} in the {{department}} department with ' ||
     'effect from {{current_date}}. All other terms of your appointment stay the same.</p>' ||
     '<p>We thank you for your contribution so far and look forward to your continued good ' ||
     'work.</p>',
     'hr_only', true),

    (p_org_id, 'Salary Revision Letter', 'salary_revision_letter',
     'Records a change in pay, and from when it applies.',
     '<p>Dear {{employee_name}},</p>' ||
     '<p>Thank you for your work with {{company_name}}. We are glad to tell you that your ' ||
     'compensation has been revised.</p>' ||
     '<p>With effect from {{current_date}}, your annual cost to company will be {{salary}}. ' ||
     'You continue as {{designation}} in the {{department}} department.</p>' ||
     '<p>All other terms of your employment stay the same.</p>' ||
     '<p>We appreciate what you bring to the team and look forward to more of it.</p>',
     'hr_only', true),

    (p_org_id, 'Warning Letter', 'warning_letter',
     'A written warning. Fill in what happened before it is issued.',
     '<p>Dear {{employee_name}},</p>' ||
     '<p>This letter is with reference to your conduct as {{designation}} in the ' ||
     '{{department}} department.</p>' ||
     '<p>[Describe here what happened, when it happened, and what was expected instead. ' ||
     'Mention any earlier conversation on the same matter.]</p>' ||
     '<p>This behaviour is not in line with what {{company_name}} expects, and it is being ' ||
     'treated as a formal warning.</p>' ||
     '<p>We expect an immediate improvement. If this is repeated, the company may take ' ||
     'further action as per its policy.</p>' ||
     '<p>Please acknowledge receipt of this letter.</p>',
     'hr_only', true);
END $$;

REVOKE ALL ON FUNCTION public.seed_letter_templates(UUID) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION seed_letter_templates(UUID) IS
  'Fills an empty template set with the letters people ask for most. Does nothing if any template already exists.';

-- New organisations get them without anyone having to remember.
CREATE OR REPLACE FUNCTION seed_letter_templates_for_new_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM seed_letter_templates(NEW.id);
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.seed_letter_templates_for_new_org() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_seed_letter_templates ON organizations;
CREATE TRIGGER trg_seed_letter_templates
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION seed_letter_templates_for_new_org();

-- And every organisation that already exists without any.
DO $$
DECLARE
  v_org UUID;
BEGIN
  FOR v_org IN SELECT id FROM organizations LOOP
    PERFORM seed_letter_templates(v_org);
  END LOOP;
END $$;

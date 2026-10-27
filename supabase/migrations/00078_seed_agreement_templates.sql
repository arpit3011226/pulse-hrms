-- ============================================================================
-- Six starting agreements for an Indian employer.
--
-- These are sensible drafts, not legal advice. Each is marked
-- needs_legal_review = true and carries a visible note, so nobody mistakes a
-- seeded template for something a lawyer has approved. HR edits them freely.
--
-- Two choices worth explaining:
--
-- 1. There is no standalone non-compete. Section 27 of the Contract Act 1872
--    makes restraint of trade void, and Indian courts strike down
--    post-employment non-competes with fair consistency. What does hold is
--    confidentiality and non-solicitation, and restraint DURING employment.
--    So that is what the template says. August agreed on 27 October 2026.
--
-- 2. POSH applies to every worker at the workplace, including contractors
--    and interns. The assignment rule is deliberately company-wide, and must
--    not inherit the contractor/intern exclusion built for PF and ESI.
-- ============================================================================

INSERT INTO agreement_templates
  (organization_id, code, title, category, description, consent_statement, sort_order, body_html)
SELECT o.id, t.code, t.title, t.category, t.description, t.consent_statement, t.sort_order, t.body_html
FROM organizations o
CROSS JOIN (VALUES

('nda', 'Non-Disclosure Agreement', 'nda',
 'Protects company and client information the person sees while working here.',
 'I have read this agreement and I agree to be bound by it.', 10,
$tpl$<h2>Non-Disclosure Agreement</h2>
<p>This agreement is made on {{current_date}} between <strong>{{company_name}}</strong>, {{company_address}} ("the Company") and <strong>{{employee_name}}</strong>, employee number {{employee_code}}, working as {{designation}} in {{department}} ("the Employee").</p>

<h3>1. What counts as confidential</h3>
<p>Confidential information means anything you learn through your work here that is not already public. It includes source code, designs, customer and client lists, pricing, commercial terms, business plans, unpublished financial information, employee personal data, and anything a client has asked us to keep private.</p>

<h3>2. What you agree to</h3>
<p>You will keep confidential information to yourself. You will use it only to do your job, and you will not copy, share, publish or pass it to anybody outside the Company unless your work requires it and you are permitted to do so.</p>
<p>You will take reasonable care of it — not leaving it on personal devices or personal accounts, not discussing it in public, and not storing it anywhere the Company has not approved.</p>

<h3>3. What this does not cover</h3>
<p>This does not apply to information that is already public through no fault of yours, that you already knew before joining and can show you knew, or that you are required to disclose by law or by a court. If you are required to disclose something, tell the Company first where you lawfully can.</p>

<h3>4. Returning things</h3>
<p>When you leave, or sooner if asked, you will return or delete all confidential information in your possession, in whatever form.</p>

<h3>5. How long this lasts</h3>
<p>Your duty of confidence continues after you stop working here, for as long as the information stays confidential.</p>

<h3>6. Governing law</h3>
<p>This agreement is governed by the laws of India, and the courts at the Company's registered office have jurisdiction.</p>

<p><em>Signed electronically by {{employee_name}} on {{current_date}}. Under section 10A of the Information Technology Act 2000, an agreement made by electronic means is valid and enforceable.</em></p>
<p><small><strong>Draft for review.</strong> This wording has not yet been approved by legal counsel.</small></p>$tpl$),

('confidentiality_nonsolicit', 'Confidentiality and Non-Solicitation', 'confidentiality',
 'Covers confidentiality during employment and not poaching staff or clients afterwards. Replaces a post-employment non-compete, which is void in India.',
 'I have read this agreement and I agree to be bound by it.', 20,
$tpl$<h2>Confidentiality and Non-Solicitation</h2>
<p>Between <strong>{{company_name}}</strong> and <strong>{{employee_name}}</strong> ({{employee_code}}), {{designation}}, {{department}}. Effective from {{date_of_joining}}.</p>

<h3>1. Undivided attention while you work here</h3>
<p>While you are employed by the Company you will not work for, advise or hold a material interest in any business that competes with us, without written permission. This restriction applies only while you are employed.</p>

<h3>2. After you leave</h3>
<p>The Company does not restrict where you work next. Section 27 of the Indian Contract Act 1872 makes agreements in restraint of trade void, and we do not ask you to sign something unenforceable. What continues to apply after you leave is set out below.</p>

<h3>3. Not approaching our people</h3>
<p>For twelve months after you leave, you will not approach any Company employee to persuade them to resign and join you or your new employer. This does not stop you answering a question honestly, and it does not stop anybody applying to a public job advertisement of their own accord.</p>

<h3>4. Not approaching our clients</h3>
<p>For twelve months after you leave, you will not solicit business from any client you personally worked with in your last twelve months here, where that business competes with what the Company does for them.</p>

<h3>5. Confidentiality continues</h3>
<p>Your duty of confidence does not end when your employment does. It continues for as long as the information remains confidential.</p>

<h3>6. Work you create</h3>
<p>Anything you create in the course of your employment — code, designs, documents, inventions — belongs to the Company.</p>

<h3>7. Reasonableness</h3>
<p>If a court finds any restriction here wider than is reasonable, it should be read narrowly enough to be enforceable rather than struck out entirely.</p>

<p><em>Signed electronically by {{employee_name}} on {{current_date}}.</em></p>
<p><small><strong>Draft for review.</strong> This wording has not yet been approved by legal counsel.</small></p>$tpl$),

('posh', 'Prevention of Sexual Harassment — Policy Acknowledgement', 'posh',
 'Required by the POSH Act 2013. Applies to every worker at the workplace, including contractors and interns.',
 'I have read and understood this policy. I know how to raise a complaint and I agree to abide by it.', 30,
$tpl$<h2>Prevention of Sexual Harassment at the Workplace</h2>
<p>Acknowledged by <strong>{{employee_name}}</strong> ({{employee_code}}), {{designation}}, on {{current_date}}.</p>

<h3>1. Our position</h3>
<p>{{company_name}} does not tolerate sexual harassment of anybody at the workplace. This policy exists under the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act 2013.</p>

<h3>2. Who this covers</h3>
<p>Everybody at the workplace. Permanent employees, people on contract, interns, trainees, consultants and visitors. It applies in the office, at any place you go on Company work, at Company events, and to work communication wherever it happens.</p>

<h3>3. What sexual harassment means</h3>
<p>Unwelcome behaviour of a sexual nature, whether direct or implied. This includes physical contact or advances, demanding or requesting sexual favours, remarks of a sexual nature, showing pornography, and any other unwelcome physical, verbal or non-verbal conduct of a sexual nature.</p>
<p>It also includes an implied promise of favourable treatment, a threat of unfavourable treatment, or behaviour that creates an intimidating or offensive working environment.</p>

<h3>4. How to raise a complaint</h3>
<p>The Company has an Internal Committee constituted under section 4 of the Act. A written complaint may be made to the Internal Committee within three months of the incident, and the Committee may extend that period where there is good reason.</p>
<p>If you are unable to complain in writing, the Committee will help you put it in writing.</p>

<h3>5. What happens next</h3>
<p>The Committee will enquire into the complaint and complete it within ninety days. Your identity, the respondent's identity, and the details of the complaint and the enquiry will be kept confidential as section 16 of the Act requires.</p>

<h3>6. No retaliation</h3>
<p>Nobody will be victimised for making a complaint in good faith or for taking part in an enquiry. Retaliation is itself a disciplinary matter.</p>

<h3>7. False complaints</h3>
<p>A complaint found to be malicious may be acted on under section 14. An unproven complaint is not the same as a malicious one, and will not be treated as such.</p>

<p><em>Acknowledged electronically by {{employee_name}} on {{current_date}}.</em></p>
<p><small><strong>Draft for review.</strong> Acknowledging this policy is one part of POSH compliance. The Act also requires a constituted Internal Committee, awareness programmes and an annual return.</small></p>$tpl$),

('it_acceptable_use', 'IT Assets and Acceptable Use', 'it_policy',
 'How Company laptops, accounts and data are to be used and looked after.',
 'I have read this policy, I agree to follow it, and I accept responsibility for the assets issued to me.', 40,
$tpl$<h2>IT Assets and Acceptable Use</h2>
<p>Agreed by <strong>{{employee_name}}</strong> ({{employee_code}}), {{designation}}, {{department}}, on {{current_date}}.</p>

<h3>1. What you are given</h3>
<p>The Company may issue you a laptop, accessories, access cards and accounts on Company systems. These remain Company property and are issued for your work.</p>

<h3>2. Looking after them</h3>
<p>Keep equipment safe and in working order. Do not leave it unattended in a public place. Report loss, theft or damage to IT on the same day you notice it.</p>

<h3>3. Using them</h3>
<p>Limited personal use is fine as long as it is lawful, does not interfere with your work, and does not put Company data at risk. You may not use Company systems to store or share unlawful material, to harass anybody, or to run a separate business.</p>

<h3>4. Accounts and passwords</h3>
<p>Your login is yours. Do not share it or let anybody else work under it. Use the Company password manager, turn on two-factor authentication where offered, and tell IT at once if you think an account has been compromised.</p>

<h3>5. Company data</h3>
<p>Keep Company and client data on Company-approved systems. Do not move it to personal email, personal cloud storage or personal devices. Do not put confidential data into third-party tools, including AI assistants, that the Company has not approved.</p>

<h3>6. Software</h3>
<p>Install only licensed software from approved sources. Do not disable antivirus, firewalls, disk encryption or device management.</p>

<h3>7. Monitoring</h3>
<p>The Company may monitor the use of its systems for security, legal and operational reasons, within the limits of the law. You should not expect privacy in Company systems for work matters.</p>

<h3>8. When you leave</h3>
<p>Return every asset issued to you on or before your last working day. Anything not returned may be recovered from your final settlement, where the law allows.</p>

<p><em>Agreed electronically by {{employee_name}} on {{current_date}}.</em></p>
<p><small><strong>Draft for review.</strong> This wording has not yet been approved by legal counsel.</small></p>$tpl$),

('code_of_conduct', 'Code of Conduct and Business Ethics', 'code_of_conduct',
 'How we expect people to behave, and what to do when something is wrong.',
 'I have read this code, I agree to follow it, and I will report anything that breaches it.', 50,
$tpl$<h2>Code of Conduct and Business Ethics</h2>
<p>Agreed by <strong>{{employee_name}}</strong> ({{employee_code}}), {{designation}}, on {{current_date}}.</p>

<h3>1. How we treat each other</h3>
<p>Treat colleagues, clients and suppliers with respect. The Company does not tolerate discrimination or harassment on the grounds of sex, caste, religion, disability, age, sexual orientation, marital status or anything else about a person rather than their work.</p>

<h3>2. Honesty</h3>
<p>Do not offer or accept a bribe, a kickback or an improper favour, whether to or from anybody in government or in business. Gifts and hospitality beyond modest courtesy must be declared.</p>

<h3>3. Conflicts of interest</h3>
<p>Tell your manager if a personal relationship, an outside interest or another job could affect, or appear to affect, your judgement at work. Declaring it is almost never a problem. Hiding it usually is.</p>

<h3>4. Company money and property</h3>
<p>Spend Company money as if it were your own, claim only what you have actually spent, and keep the receipts.</p>

<h3>5. Records</h3>
<p>Keep records accurate. Do not falsify a timesheet, an expense claim, a performance record or a client report.</p>

<h3>6. Speaking up</h3>
<p>If you see something that breaches this code, tell your manager or HR. A report made in good faith will be taken seriously and you will not be penalised for making it, even if it turns out to be mistaken.</p>

<h3>7. Consequences</h3>
<p>Breaching this code may lead to disciplinary action, up to and including dismissal, and to legal action where the law has been broken.</p>

<p><em>Agreed electronically by {{employee_name}} on {{current_date}}.</em></p>
<p><small><strong>Draft for review.</strong> This wording has not yet been approved by legal counsel.</small></p>$tpl$),

('data_protection', 'Data Protection Undertaking', 'data_protection',
 'Obligations when handling personal data, under the DPDP Act 2023.',
 'I have read this undertaking and I agree to handle personal data as it requires.', 60,
$tpl$<h2>Data Protection Undertaking</h2>
<p>Given by <strong>{{employee_name}}</strong> ({{employee_code}}), {{designation}}, {{department}}, on {{current_date}}.</p>

<h3>1. Why this matters</h3>
<p>In your work you may handle personal data about colleagues, candidates, clients and their customers. The Digital Personal Data Protection Act 2023 and its Rules govern how that data may be used. {{company_name}} is responsible for it, and so are you.</p>

<h3>2. Use it only for the job in hand</h3>
<p>Access personal data only when you need it for your work. Curiosity is not a reason. Do not look up a colleague's salary, a candidate's documents or a client's records unless your role requires it.</p>

<h3>3. Keep it where it belongs</h3>
<p>Store personal data only in Company-approved systems. Do not copy it to personal email, personal storage or personal devices. Do not paste it into third-party tools, including AI assistants, that the Company has not approved.</p>

<h3>4. Share it carefully</h3>
<p>Share personal data outside the Company only where there is a lawful basis and it has been approved. If you are unsure, ask before you send.</p>

<h3>5. Do not keep it longer than needed</h3>
<p>Personal data must be erased once the purpose it was collected for has been served. If you hold copies for a piece of work, delete them when the work is done.</p>

<h3>6. Tell us quickly</h3>
<p>If you think personal data has been lost, exposed or sent to the wrong person, report it immediately. The Company has reporting duties with tight deadlines, and the clock starts when it is discovered, not when it is convenient.</p>

<h3>7. After you leave</h3>
<p>These obligations continue after your employment ends.</p>

<p><em>Agreed electronically by {{employee_name}} on {{current_date}}.</em></p>
<p><small><strong>Draft for review.</strong> The DPDP Rules 2025 were notified on 13 November 2025, with the main obligations applying from 13 May 2027. This wording has not yet been approved by legal counsel.</small></p>$tpl$)

) AS t(code, title, category, description, consent_statement, sort_order, body_html)
ON CONFLICT (organization_id, code) DO NOTHING;

-- Everybody signs all six. POSH in particular covers every worker at the
-- workplace, contractors and interns included, so this rule is deliberately
-- company-wide and must not pick up the contractor exclusion built for PF.
INSERT INTO agreement_assignment_rules (organization_id, template_id, is_mandatory)
SELECT t.organization_id, t.id, true
FROM agreement_templates t
WHERE NOT EXISTS (
  SELECT 1 FROM agreement_assignment_rules r WHERE r.template_id = t.id
);

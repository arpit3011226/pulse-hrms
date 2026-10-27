import { describe, expect, it } from 'vitest'
import { resolveAgreementPlaceholders, type AgreementContext } from './agreements.api'

/**
 * These documents are signed and then relied on. A placeholder that does not
 * fill in is not a cosmetic bug — it ends up inside somebody's NDA.
 */

const ctx: AgreementContext = {
  employee_name: 'Priya Nair',
  employee_code: 'EMP-0042',
  designation: 'Senior Engineer',
  department: 'Engineering',
  date_of_joining: '2026-11-03',
  company_name: 'Augustinnovate Pvt. Ltd.',
  company_address: '12 MG Road, Bengaluru 560001',
}

describe('resolveAgreementPlaceholders', () => {
  it('fills in every placeholder it knows', () => {
    const { html, unresolved } = resolveAgreementPlaceholders(
      '<p>{{employee_name}} ({{employee_code}}), {{designation}} in {{department}}, ' +
        'joining {{date_of_joining}} at {{company_name}}, {{company_address}}.</p>',
      ctx
    )
    expect(html).toContain('Priya Nair')
    expect(html).toContain('EMP-0042')
    expect(html).toContain('Senior Engineer')
    expect(html).toContain('Engineering')
    expect(html).toContain('03 November 2026')
    expect(html).toContain('Augustinnovate Pvt. Ltd.')
    expect(unresolved).toEqual([])
  })

  it('leaves no template syntax behind when it cannot fill something', () => {
    const { html, unresolved } = resolveAgreementPlaceholders(
      '<p>Report to {{manager_name}} from day one.</p>',
      ctx
    )
    // Worse than a gap: a signed agreement that literally reads
    // "Report to {{manager_name}}".
    expect(html).not.toContain('{{')
    expect(html).not.toContain('manager_name')
    expect(unresolved).toEqual(['{{manager_name}}'])
  })

  it('reports each unknown placeholder once, however often it appears', () => {
    const { unresolved } = resolveAgreementPlaceholders(
      '{{foo}} and {{foo}} and {{bar}}',
      ctx
    )
    expect(unresolved).toEqual(['{{foo}}', '{{bar}}'])
  })

  it('tidies the spacing left behind by a missing value', () => {
    const empty: AgreementContext = { ...ctx, designation: null, department: null }
    const { html } = resolveAgreementPlaceholders(
      '<p>{{employee_name}} , working as {{designation}} in {{department}} .</p>',
      empty
    )
    expect(html).not.toMatch(/ {2,}/)
    expect(html).toContain('Priya Nair,')
  })

  it('does not mangle a document with no placeholders at all', () => {
    const body = '<h2>Code of Conduct</h2><p>Treat people well.</p>'
    const { html, unresolved } = resolveAgreementPlaceholders(body, ctx)
    expect(html).toBe(body)
    expect(unresolved).toEqual([])
  })

  it('fills a placeholder used several times', () => {
    const { html } = resolveAgreementPlaceholders(
      '{{employee_name}} agrees. Signed by {{employee_name}}.',
      ctx
    )
    expect(html).toBe('Priya Nair agrees. Signed by Priya Nair.')
  })
})

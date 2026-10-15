import { supabase } from '@/lib/supabase'
import type { Employee, Organization } from '@/types/database.types'

interface PlaceholderContext {
  /**
   * Only the fields the placeholders actually read. A letter request does not
   * load a whole employee record, and asking for one here just forces a cast at
   * every call site.
   */
  employee: Partial<Employee> & {
    first_name: string
    last_name: string
    department?: { name: string } | null
    designation?: { title: string } | null
    // PAN and the home address moved to their own tables in 00045.
    statutory?: { pan_number: string | null } | null
    personal?: { current_address: Record<string, string> | null } | null
  }
  organization: Organization
  compensation?: { annual_ctc: number } | null
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatAddress(address: Record<string, string> | null | undefined): string {
  if (!address) return ''
  const parts = [address.line1, address.line2, address.city, address.state, address.pincode].filter(Boolean)
  return parts.join(', ')
}

export function resolvePlaceholders(template: string, ctx: PlaceholderContext): string {
  const map: Record<string, string> = {
    '{{employee_name}}': `${ctx.employee.first_name} ${ctx.employee.last_name}`,
    '{{employee_code}}': ctx.employee.employee_code || '',
    '{{designation}}': ctx.employee.designation?.title || '',
    '{{department}}': ctx.employee.department?.name || '',
    '{{date_of_joining}}': formatDate(ctx.employee.date_of_joining),
    '{{date_of_leaving}}': formatDate(ctx.employee.date_of_leaving),
    '{{company_name}}': ctx.organization.name,
    '{{company_address}}': formatAddress(ctx.organization.address),
    '{{current_date}}': formatDate(new Date().toISOString()),
    '{{salary}}': ctx.compensation ? formatCurrency(ctx.compensation.annual_ctc) : '',
    '{{pan_number}}': ctx.employee.statutory?.pan_number || '',
    '{{current_address}}': formatAddress(ctx.employee.personal?.current_address),
  }

  let result = template
  for (const [key, value] of Object.entries(map)) {
    result = result.replaceAll(key, value)
  }
  return result
}

/**
 * The pay figure a letter needs, or null when there is none on record.
 *
 * {{salary}} resolved to an empty string on every letter because no call site
 * passed compensation — so a Salary Certificate read "...cost to company is ."
 * Fetched here rather than at four separate call sites, each of which would
 * have had to remember.
 */
export async function getLetterCompensation(
  employeeId: string | null | undefined
): Promise<{ annual_ctc: number } | null> {
  if (!employeeId) return null
  const { data, error } = await supabase
    .from('employee_compensation')
    .select('annual_ctc')
    .eq('employee_id', employeeId)
    .eq('is_current', true)
    .maybeSingle()
  // A missing figure is not worth failing a letter over: the placeholder just
  // stays empty, exactly as it did before.
  if (error || !data) return null
  return { annual_ctc: Number(data.annual_ctc) }
}

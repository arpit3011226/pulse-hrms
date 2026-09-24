import type { Employee, Organization } from '@/types/database.types'

interface PlaceholderContext {
  employee: Employee & {
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

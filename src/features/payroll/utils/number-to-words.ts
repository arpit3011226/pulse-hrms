const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function convertChunk(n: number): string {
  if (n === 0) return ''
  if (n < 20) return ones[n]
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
  return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convertChunk(n % 100) : '')
}

/**
 * Converts a number to Indian currency words.
 * Uses Indian numbering: Lakh (1,00,000) and Crore (1,00,00,000).
 * Example: 50000 → "Rupees Fifty Thousand Only"
 */
export function numberToWords(amount: number): string {
  if (amount === 0) return 'Rupees Zero Only'

  const num = Math.abs(Math.round(amount))
  if (num === 0) return 'Rupees Zero Only'

  const crore = Math.floor(num / 10000000)
  const lakh = Math.floor((num % 10000000) / 100000)
  const thousand = Math.floor((num % 100000) / 1000)
  const remainder = num % 1000

  const parts: string[] = []
  if (crore) parts.push(convertChunk(crore) + ' Crore')
  if (lakh) parts.push(convertChunk(lakh) + ' Lakh')
  if (thousand) parts.push(convertChunk(thousand) + ' Thousand')
  if (remainder) parts.push(convertChunk(remainder))

  return 'Rupees ' + parts.join(' ') + ' Only'
}

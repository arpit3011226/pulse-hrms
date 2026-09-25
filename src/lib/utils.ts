import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, format: 'short' | 'long' | 'relative' = 'short'): string {
  const d = new Date(date)
  if (format === 'short') {
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  if (format === 'long') {
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  }
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function getInitials(firstName: string, lastName?: string): string {
  return `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ''}`.toUpperCase()
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * A database value written the way a person would read it.
 *
 * Columns hold values like `full_time`, `on_hold` or `wfh`, and those were
 * reaching the screen unchanged — a chart legend reading "full_time 100%".
 * Anything already written for people (a leave type called "Casual Leave") is
 * left alone, because it has no underscores and is already capitalised.
 *
 * Abbreviations keep their usual spelling instead of becoming "Wfh" or "Ctc".
 */
const KNOWN_SPELLINGS: Record<string, string> = {
  ctc: 'CTC',
  esi: 'ESI',
  hr: 'HR',
  hra: 'HRA',
  id: 'ID',
  lop: 'LOP',
  lwp: 'LWP',
  pan: 'PAN',
  pf: 'PF',
  tds: 'TDS',
  uan: 'UAN',
  wfh: 'Work from home',
}

export function humanizeLabel(value: string | null | undefined, fallback = 'Not set'): string {
  if (value === null || value === undefined) return fallback
  const raw = value.trim()
  if (raw === '') return fallback

  const key = raw.toLowerCase()
  if (KNOWN_SPELLINGS[key]) return KNOWN_SPELLINGS[key]

  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word, index) => {
      const lower = word.toLowerCase()
      if (KNOWN_SPELLINGS[lower]) return KNOWN_SPELLINGS[lower]
      // A word the writer already capitalised their own way stays as it is.
      if (/[A-Z]/.test(word.slice(1))) return word
      if (index === 0) return lower.charAt(0).toUpperCase() + lower.slice(1)
      return lower
    })
    .join(' ')
}

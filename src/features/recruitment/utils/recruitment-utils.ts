export function getRequisitionStatusColor(status: string) {
  const map: Record<string, string> = {
    draft: 'gray',
    open: 'green',
    on_hold: 'yellow',
    closed: 'blue',
    filled: 'purple',
    cancelled: 'red',
  }
  return map[status] ?? 'gray'
}

export function getApplicationStatusColor(status: string) {
  const map: Record<string, string> = {
    new: 'blue',
    screening: 'yellow',
    in_progress: 'indigo',
    offer: 'purple',
    hired: 'green',
    rejected: 'red',
    withdrawn: 'gray',
    on_hold: 'yellow',
  }
  return map[status] ?? 'gray'
}

export function getOfferStatusColor(status: string) {
  const map: Record<string, string> = {
    draft: 'gray',
    sent: 'blue',
    accepted: 'green',
    rejected: 'red',
    expired: 'yellow',
    withdrawn: 'gray',
  }
  return map[status] ?? 'gray'
}

export function getInterviewStatusColor(status: string) {
  const map: Record<string, string> = {
    scheduled: 'blue',
    completed: 'green',
    cancelled: 'red',
    rescheduled: 'yellow',
    no_show: 'red',
  }
  return map[status] ?? 'gray'
}

export function getRecommendationColor(rec: string) {
  const map: Record<string, string> = {
    strong_hire: 'green',
    hire: 'emerald',
    maybe: 'yellow',
    no_hire: 'orange',
    strong_no_hire: 'red',
  }
  return map[rec] ?? 'gray'
}

export function formatSalaryRange(min?: number | null, max?: number | null, currency = 'INR') {
  const fmt = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v)
  if (min && max) return `${fmt(min)} - ${fmt(max)}`
  if (min) return `${fmt(min)}+`
  if (max) return `Up to ${fmt(max)}`
  return '-'
}

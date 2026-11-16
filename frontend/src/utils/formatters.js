/** Format currency in INR */
export function formatINR(amount) {
  if (amount == null || isNaN(amount)) return '--'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Format a number with commas (Indian style) */
export function formatNumber(n) {
  if (n == null || isNaN(n)) return '--'
  return new Intl.NumberFormat('en-IN').format(n)
}

/** Format percentage */
export function formatPercent(value, decimals = 1) {
  if (value == null || isNaN(value)) return '--'
  return `${(value * 100).toFixed(decimals)}%`
}

/** Relative time (e.g. "2 hours ago") */
export function timeAgo(dateStr) {
  if (!dateStr) return '--'
  const date = new Date(dateStr)
  const now = new Date()
  const seconds = Math.floor((now - date) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Format ISO date to readable string */
export function formatDate(dateStr) {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Truncate text */
export function truncate(str, maxLen = 60) {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str
}

/** Humanize snake_case or camelCase strings */
export function humanize(str) {
  if (!str) return ''
  return str
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}

/** Generate initials from name */
export function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

/** Validate email */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** Validate UPI ID */
export function isValidUPI(upiId) {
  return /^[\w.-]+@[\w]+$/.test(upiId)
}

/** Get risk level color class */
export function getRiskColor(level) {
  const map = {
    Low: 'text-emerald-600',
    Medium: 'text-amber-600',
    High: 'text-rose-600',
    Critical: 'text-rose-800',
  }
  return map[level] || 'text-zinc-500'
}

/** Get risk level background class */
export function getRiskBg(level) {
  const map = {
    Low: 'bg-emerald-50 border-emerald-200',
    Medium: 'bg-amber-50 border-amber-200',
    High: 'bg-rose-50 border-rose-200',
    Critical: 'bg-rose-100 border-rose-300',
  }
  return map[level] || 'bg-zinc-50 border-zinc-200'
}

/** Clamp a number */
export function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val))
}

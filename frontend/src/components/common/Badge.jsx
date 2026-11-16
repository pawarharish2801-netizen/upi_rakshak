import { ShieldCheck, WarningCircle, Warning, XCircle } from '@phosphor-icons/react'

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) {
  const variants = {
    neutral: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    brand: 'bg-[var(--color-brand-deep)]/10 text-[var(--color-brand-deep)] border-[var(--color-brand-deep)]/20',
    accent: 'bg-[var(--color-brand-accent)]/10 text-[var(--color-brand-accent)] border-[var(--color-brand-accent)]/20',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    critical: 'bg-rose-100 text-rose-900 border-rose-300 font-semibold',
  }

  const sizes = {
    sm: 'text-[10px] px-1.5 py-0.5 rounded',
    md: 'text-xs px-2.5 py-1 rounded-md',
    lg: 'text-sm px-3 py-1.5 rounded-lg',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 border font-medium ${variants[variant] || variants.neutral} ${sizes[size] || sizes.md} ${className}`}
    >
      {children}
    </span>
  )
}

export function RiskBadge({ level, score }) {
  const map = {
    Low: { variant: 'success', icon: ShieldCheck, label: 'Low Risk' },
    Medium: { variant: 'warning', icon: WarningCircle, label: 'Medium Risk' },
    High: { variant: 'danger', icon: Warning, label: 'High Risk' },
    Critical: { variant: 'critical', icon: XCircle, label: 'Critical Risk' },
  }

  const meta = map[level] || map.Low
  const Icon = meta.icon

  return (
    <Badge variant={meta.variant} size="md">
      <Icon size={14} weight="bold" />
      <span>{meta.label}</span>
      {score != null && (
        <span className="font-data opacity-80 border-l border-current/20 pl-1.5 ml-0.5">
          {score}/100
        </span>
      )}
    </Badge>
  )
}

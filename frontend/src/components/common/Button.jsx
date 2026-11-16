import { forwardRef } from 'react'
import { CircleNotch } from '@phosphor-icons/react'

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon: Icon,
    iconPosition = 'left',
    className = '',
    type = 'button',
    onClick,
    ...props
  },
  ref
) {
  const baseStyles =
    'relative inline-flex items-center justify-center font-medium transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none active:-translate-y-[1px] active:scale-[0.98]'

  const variants = {
    primary:
      'bg-[var(--color-brand-deep)] text-white hover:bg-[var(--color-brand-navy)] shadow-sm hover:shadow',
    accent:
      'bg-[var(--color-brand-accent)] text-white hover:brightness-110 shadow-sm hover:shadow',
    secondary:
      'bg-white text-[var(--color-content-primary)] border border-zinc-200/80 hover:bg-zinc-50 shadow-sm',
    ghost:
      'text-[var(--color-content-secondary)] hover:text-[var(--color-content-primary)] hover:bg-zinc-100',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
    outlineDanger:
      'border border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-50',
  }

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 rounded-md gap-1.5',
    md: 'text-sm px-4 py-2 rounded-lg gap-2',
    lg: 'text-base px-5 py-2.5 rounded-lg gap-2.5',
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading ? (
        <CircleNotch size={size === 'sm' ? 14 : 18} className="animate-spin text-current" />
      ) : (
        Icon && iconPosition === 'left' && <Icon size={size === 'sm' ? 14 : 18} weight="bold" />
      )}
      <span>{children}</span>
      {!loading && Icon && iconPosition === 'right' && (
        <Icon size={size === 'sm' ? 14 : 18} weight="bold" />
      )}
    </button>
  )
})

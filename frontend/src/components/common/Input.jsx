import { forwardRef } from 'react'

export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    icon: Icon,
    isMono = false,
    className = '',
    containerClassName = '',
    id,
    type = 'text',
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wider text-[var(--color-content-secondary)]"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="pointer-events-none absolute left-3 text-zinc-400">
            <Icon size={18} weight="duotone" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-[var(--color-content-primary)] placeholder-zinc-400 transition-colors duration-150 focus:border-[var(--color-brand-deep)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-deep)] disabled:bg-zinc-100 disabled:text-zinc-400 ${
            Icon ? 'pl-9' : ''
          } ${isMono ? 'font-data' : ''} ${
            error
              ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-rose-500'
              : 'border-zinc-300 hover:border-zinc-400'
          } ${className}`}
          {...props}
        />
      </div>

      {error ? (
        <p className="text-xs font-medium text-rose-600 animate-fade-in">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[var(--color-content-tertiary)]">{helperText}</p>
      ) : null}
    </div>
  )
})

export const Select = forwardRef(function Select(
  {
    label,
    error,
    helperText,
    options = [],
    className = '',
    containerClassName = '',
    id,
    children,
    ...props
  },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold uppercase tracking-wider text-[var(--color-content-secondary)]"
        >
          {label}
        </label>
      )}

      <select
        ref={ref}
        id={selectId}
        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-[var(--color-content-primary)] transition-colors duration-150 focus:border-[var(--color-brand-deep)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-deep)] disabled:bg-zinc-100 disabled:text-zinc-400 ${
          error
            ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-rose-500'
            : 'border-zinc-300 hover:border-zinc-400'
        } ${className}`}
        {...props}
      >
        {children ||
          options.map((opt) => {
            const val = typeof opt === 'string' ? opt : opt.value
            const lbl = typeof opt === 'string' ? opt : opt.label
            return (
              <option key={val} value={val}>
                {lbl}
              </option>
            )
          })}
      </select>

      {error ? (
        <p className="text-xs font-medium text-rose-600 animate-fade-in">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[var(--color-content-tertiary)]">{helperText}</p>
      ) : null}
    </div>
  )
})

import { forwardRef } from 'react'

/**
 * Compound Card Component (cc-skill-frontend-patterns & antigravity-design-expert)
 * Supports both compound composition and classic props.
 */
export const Card = forwardRef(function Card(
  {
    children,
    className = '',
    variant = 'weightless', // 'weightless' | 'glass' | 'flat' | 'dark'
    title,
    subtitle,
    action,
    headerClassName = '',
    bodyClassName = '',
    footer,
    footerClassName = '',
    ...props
  },
  ref
) {
  const variantStyles = {
    weightless: 'card-weightless rounded-2xl bg-white',
    glass: 'rounded-2xl backdrop-blur-xl bg-white/80 border border-white/60 shadow-[0_20px_40px_-15px_rgba(15,43,91,0.07)]',
    flat: 'rounded-2xl border border-zinc-200/80 bg-white shadow-none',
    dark: 'glass-panel-dark rounded-2xl text-white',
  }

  // If classic props are used
  const hasClassicHeader = title || subtitle || action

  return (
    <div
      ref={ref}
      className={`${variantStyles[variant] || variantStyles.weightless} ${className}`}
      {...props}
    >
      {hasClassicHeader && (
        <CardHeader className={headerClassName}>
          <div>
            {title && <CardTitle>{title}</CardTitle>}
            {subtitle && <CardDescription>{subtitle}</CardDescription>}
          </div>
          {action && <CardAction>{action}</CardAction>}
        </CardHeader>
      )}

      {hasClassicHeader || footer ? (
        <CardContent className={bodyClassName}>{children}</CardContent>
      ) : (
        children
      )}

      {footer && <CardFooter className={footerClassName}>{footer}</CardFooter>}
    </div>
  )
})

export function CardHeader({ children, className = '' }) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100/90 px-6 py-4.5 gap-2 ${className}`}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3
      className={`text-sm sm:text-base font-bold tracking-tight text-[var(--color-content-primary)] ${className}`}
    >
      {children}
    </h3>
  )
}

export function CardDescription({ children, className = '' }) {
  return (
    <p className={`mt-0.5 text-xs text-[var(--color-content-secondary)] leading-relaxed ${className}`}>
      {children}
    </p>
  )
}

export function CardAction({ children, className = '' }) {
  return <div className={`flex items-center gap-2 ${className}`}>{children}</div>
}

export function CardContent({ children, className = '' }) {
  return <div className={`p-6 ${className}`}>{children}</div>
}

export function CardFooter({ children, className = '' }) {
  return (
    <div
      className={`border-t border-zinc-100/80 px-6 py-3.5 bg-zinc-50/50 rounded-b-2xl flex items-center justify-between text-xs ${className}`}
    >
      {children}
    </div>
  )
}

// Attach compound subcomponents
Card.Header = CardHeader
Card.Title = CardTitle
Card.Description = CardDescription
Card.Action = CardAction
Card.Content = CardContent
Card.Footer = CardFooter

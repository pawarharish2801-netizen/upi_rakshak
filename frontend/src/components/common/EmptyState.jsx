import { ShieldWarning } from '@phosphor-icons/react'
import { Button } from './Button'

export function EmptyState({
  title = 'No records found',
  description = 'There are no items to display at this moment.',
  icon: Icon = ShieldWarning,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white/50 px-6 py-12 text-center ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 mb-4">
        <Icon size={24} weight="duotone" />
      </div>
      <h3 className="text-sm font-semibold text-[var(--color-content-primary)]">{title}</h3>
      <p className="mt-1 text-xs text-[var(--color-content-secondary)] max-w-[40ch]">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button variant="secondary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  )
}

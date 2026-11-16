import { useNavigate } from 'react-router-dom'
import { MagnifyingGlass, House, ShieldCheck } from '@phosphor-icons/react'
import PageShell from '../components/layout/PageShell'
import { Button } from '../components/common/Button'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <PageShell title="Page Not Found" subtitle="The requested security module or URL does not exist.">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600 mb-4 shadow-sm border border-zinc-200">
          <MagnifyingGlass size={32} weight="bold" />
        </div>
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-brand-deep)]">
          HTTP 404 • Resource Missing
        </span>
        <h2 className="text-2xl font-extrabold text-[var(--color-content-primary)] mt-2">
          Destination Route Unreachable
        </h2>
        <p className="mt-2 text-sm text-[var(--color-content-secondary)] max-w-[48ch]">
          The navigation endpoint you requested was moved, renamed, or does not exist on this UPI Rakshak gateway instance.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button variant="accent" size="md" icon={House} onClick={() => navigate('/')}>
            Back to Home
          </Button>
          <Button variant="secondary" size="md" icon={ShieldCheck} onClick={() => navigate('/assess')}>
            Start Payment Assessment
          </Button>
        </div>
      </div>
    </PageShell>
  )
}

